/*
Math Tablet
Copyright (C) 2019 Public Invention
https://pubinv.github.io/PubInv/

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import * as WebSocket from 'ws';

// TODO: Handle websocket lifecycle: closing, unexpected disconnects, errors, etc.

import { ClientMessage, ServerMessage } from '../client/math-tablet-api';

import { parseMathJsExpression, ParseResults } from './mathjs-cas';

import { TDoc, TDocName, Change as TDocChange } from './tdoc';

// Types

// Constants

const CLOSE_TIMEOUT_IN_MS = 5000;

// Event Handlers

export class OpenTDoc {

  // Class Methods

  public static initialize(): void {
    console.log(`OpenTDoc: initialized`);
    TDoc.on('open', td=>this.onTDocOpen(td));
  }
  
  public static async connect(name: TDocName, ws: WebSocket): Promise<OpenTDoc> {
    console.log(`OpenTDoc: connect: ${name}`);

    // Opening the TDoc is asynchronous, and messages can come in during that time. 
    // We queue up any messages that come in during that time and dispatch them after
    // the TDoc is opened.
    const msgQueue: WebSocket.Data[] = [];
    const listener = (m: WebSocket.Data)=>msgQueue.push(m);
    ws.addListener('message', listener);
    // REVIEW: What about listening for 'error' and 'close' events, etc.

    let rval = this.sOpenTDocs.get(name);
    if (!rval) {
      await TDoc.open(name, {/* Default Options */});
      // We will get a synchronous TDoc 'open' event, which will create the OpenTDoc instance.
      rval = this.sOpenTDocs.get(name);
      if (!rval) { throw new Error(`OpenTDoc: cannot find OpenTDoc after TDoc is opened: ${name}`) }
    }
    rval.addSocket(ws);

    // Dispatch any messages that came in.
    ws.removeListener('message', listener);
    for (const msg of msgQueue) { rval.onWsMessage(ws, msg); }

    return rval;
  }
  
  // Instance Properties

  public tDoc: TDoc;

  // Instance Methods

  // --- PRIVATE ---

  // Private Class Properties

  private static sOpenTDocs: Map<string, OpenTDoc> = new Map<string, OpenTDoc>();

  // Private Class Methods

  private static onTDocOpen(tDoc: TDoc): void {
    console.log(`OpenTDoc: tDoc opened: ${tDoc._name}`);
    new this(tDoc);
  }
    
  // Private Constructor

  private constructor(tDoc: TDoc) {
    console.log(`OpenTDoc: constructor ${tDoc._name}`)
    this.tDoc = tDoc;
    this.sockets = new Set<WebSocket>();

    // IMPORTANT: We prepend the 'change' listener because we need to send
    // style and thought insert messsage to the client in the order the
    // styles and thoughts are created.
    // Because CAS modules can synchronously create new thoughts and styles
    // in response to 'change' events, if we are not first on the list of listeners,
    // we may get the events out of creation order.
    tDoc.prependListener('change', ch=>this.onTDocChange(ch));
    tDoc.on('close', ()=>this.onTDocClose());

    OpenTDoc.sOpenTDocs.set(tDoc._name, this);
  }

  // Private Instance Properties
  private closeTimeout?: NodeJS.Timeout;
  private sockets: Set<WebSocket>;

  // Private Event Handlers

  private onTDocChange(change: TDocChange): void {
    try {
      console.log(`OpenTDoc: tDoc changed: ${this.tDoc._name} ${change.type}`);
      // REVIEW: We could just have a single 'changeTDoc' action.
      switch (change.type) {
      case 'styleDeleted':
        this.sendMessage({ action: 'deleteStyle', styleId: change.styleId });
        break;
      case 'styleInserted':
        this.sendMessage({ action: 'insertStyle', style: change.style.toJSON() });
        break;
      case 'thoughtDeleted':
        this.sendMessage({ action: 'deleteThought', thoughtId: change.thoughtId });
        break;
      case 'thoughtInserted':
        this.sendMessage({ action: 'insertThought', thought: change.thought.toJSON() });
        break;
      }
    } catch(err) {
      console.error(`OpenTDoc: unexpected error handling tDoc change: ${err.message}`);
    }
  }
    
  private onTDocClose(): void {
    try {
      console.log(`OpenTDoc: tDoc closed: ${this.tDoc._name} ${this.sockets.size}`);
      for (const socket of this.sockets) {
        // REVIEW: should we pass a code and reason to close?
        // REVIEW: 
        socket.close();
      }
      OpenTDoc.sOpenTDocs.delete(this.tDoc._name);
    } catch(err) {
      console.error(`OpenTDoc: Unexpected error handling tdoc close: ${err.message}`);
    }
  }
    
  private onWsClose(ws: WebSocket, code: number, reason: string): void {
    try {
      // Normal close appears to be code 1001, reason empty string.
      console.log(`OpenTDoc: web socket closed: ${this.tDoc._name} ${code} - ${reason}`);
      this.sockets.delete(ws);

      // If the number of sockets drops to zero then set a timer to close the document in a few seconds.
      if (this.sockets.size == 0) {
        console.log(`OpenTDoc: last web socket closed, setting timeout: ${this.tDoc._name}`)
        this.closeTimeout = setTimeout(()=>{ this.close(); }, CLOSE_TIMEOUT_IN_MS);
      }
    } catch(err) {
      console.error(`OpenTDoc: Unexpected error handling web-socket close: ${err.message}`);
    }
  }

  private onWsError(_ws: WebSocket, err: Error): void {
    try {
      console.error(`OpenTDoc: web socket error: ${this.tDoc._name} ${(<any>err).code} ${err.message}`);
      // REVIEW: is the error recoverable? is the websocket closed? will we get a closed event?
    } catch(err) {
      console.error(`OpenTDoc: Unexpected error handling web-socket error: ${err.message}`);
    }
  }

  private onWsMessage(_ws: WebSocket, message: WebSocket.Data) {
    try {
      const msg: ClientMessage = JSON.parse(message.toString());
      console.log(`OpenTDoc: received socket message: ${this.tDoc._name} ${msg.action}`);
      switch(msg.action) {
      case 'deleteThought': {
        this.tDoc.deleteThought(msg.thoughtId);
        break;
      }
      case 'insertHandwrittenMath': {
        const thought = this.tDoc.insertThought();
        this.tDoc.insertLatexStyle(thought, msg.latexMath, 'INPUT', 'USER');
        this.tDoc.insertJiixStyle(thought, msg.jiix, 'HANDWRITING', 'USER');
        break;
      }
      case 'insertHandwrittenText': {
        const thought = this.tDoc.insertThought();
        this.tDoc.insertTextStyle(thought, msg.text, 'INPUT', 'USER');
        this.tDoc.insertStrokeStyle(thought, msg.strokeGroups, 'HANDWRITING', 'USER');
        break;
      }
      case 'insertMathJsText': {
        let parseResults: ParseResults|undefined = undefined;
        try {
          parseResults = parseMathJsExpression(msg.mathJsText);
        } catch(err) {
          console.error(`OpenTDoc: insertMathJsText parse error: ${err.message}`);
          break;
        }
        const thought = this.tDoc.insertThought();
        const style = this.tDoc.insertMathJsStyle(thought, parseResults.mathJsText, 'INPUT', 'USER');
        this.tDoc.insertLatexStyle(style, parseResults.latexMath, 'PRETTY', 'USER');
        break;
      }
      case 'refreshNotebook': {
        for (const thought of this.tDoc.getThoughts()) {
          this.sendMessage({ action: 'insertThought', thought: thought.toJSON() });
        }
        for (const style of this.tDoc.getStyles()) {
          this.sendMessage({ action: 'insertStyle', style: style.toJSON() });
        }
        break;
      }
      default:
        console.error(`OpenTDoc: unexpected WebSocket message action ${(<any>msg).action}. Ignoring.`);
        break;
      }
    } catch(err) {
      console.error(`OpenTDoc: unexpected error handling web-socket message: ${err.message}`);
    }
  }

  // Private Instance Methods

  private addSocket(ws: WebSocket): void {
    console.log(`OpenTDoc: adding web socket`);
    if (this.closeTimeout) {
      console.log(`OpenTDoc: aborting close timeout: ${this.tDoc._name}`);
      clearTimeout(this.closeTimeout);
      delete this.closeTimeout;
    }
    this.sockets.add(ws);
    ws.on('close', (code: number, reason: string) => this.onWsClose(ws, code, reason))
    ws.on('error', (err: Error) => this.onWsError(ws, err))
    ws.on('message', (message: string) => this.onWsMessage(ws, message));
  }

  // This is called by a setTimeout call a few seconds after the last socket has closed.
  private close(): void {
    console.log(`OpenTDoc: CLOSE TIMEOUT EXPIRED: ${this.tDoc._name}`)
    if (this.sockets.size>0) {
      console.error(`ERROR: OpenTDoc close timeout expired with sockets remaining.`);
      return;
    }
    // REVIEW: Only close if we opened?
    this.tDoc.close();
    // NOTE: tDoc.close will emit the 'close' event, which will invoke this.onTDocClose,
    //       which will remove us from the sOpenTDocs map.
  }

  private sendMessage(msg: ServerMessage, ws?: WebSocket): void {
    const json = JSON.stringify(msg);
    const sockets = ws ? [ ws ] : this.sockets;
    console.log(`OpenTDoc: sending socket message ${msg.action}.`);
    for (const ws of sockets) {
      try {
        // REVIEW: Should we check ws.readyState
        ws.send(json);
      } catch(err) {
        console.error(`ERROR: OpenTDoc sending websocket message: ${ws.readyState} ${(<any>err).code} ${err.message}`)
      }
    }
  }

}
