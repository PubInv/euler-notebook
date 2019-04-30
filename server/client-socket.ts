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

import { Server } from 'http';

import { Request } from 'express';
import * as WebSocket from 'ws';

// TODO: Handle websocket lifecycle: closing, unexpected disconnects, errors, etc.

import { ClientMessage, NotebookName, NotebookChange, ServerMessage, ThoughtId, LatexMath, Jiix, StrokeGroups, MathJsText } from '../client/math-tablet-api';

import { parseMathJsExpression, ParseResults } from './mathjs-cas';

import { TDoc, TDocName } from './tdoc';

// Types

type ClientId = string;

interface TDocListeners {
  change: (ch: NotebookChange)=>void,
  close: ()=>void,
}

// Constants

// const CLOSE_TIMEOUT_IN_MS = 5000;

// Event Handlers

export class ClientSocket {

  // Class Properties

  public static allSockets(): IterableIterator<ClientSocket> {
    return this.clientSockets.values();
  }

  // Class Methods

  public static close(id: ClientId): void {
    const instance = this.clientSockets.get(id);
    if (!instance) { throw new Error(`Unknown client socket ${id} requested in close.`); }
    instance.close();
  }

  public static initialize(server: Server): void {
    console.log("Client Socket: initialize");
    const wss = new WebSocket.Server({ server });
    wss.on('connection', (ws: WebSocket, req: Request)=>{ this.onConnection(ws, req); });
  }

  // Instance Properties

  // public tDoc: TDoc;
  public id: ClientId;

  // Instance Property Functions

  public allTDocs(): IterableIterator<TDoc> {
    return this.tDocs.values();
  }

  // Instance Methods

  // See https://github.com/Luka967/websocket-close-codes.
  public close(): void {
    console.log(`Client Socket ${this.id}: socket close requested.`);
    this.socket.close(4000, 'dashboard');
  }

  // --- PRIVATE ---

  // Private Class Properties

  private static clientSockets = new Map<ClientId, ClientSocket>();

  // Private Class Methods

  private static async onConnection(ws: WebSocket, req: Request): Promise<void> {
    try {
      console.log(`Client Socket: new connection: ${req.url}`);
      // REVIEW: Better way to generate client id?
      const id: ClientId = Date.now().toString();
      const instance = new this(id, ws);
      this.clientSockets.set(id, instance);
      // const urlComponents = req.url.split('/');
      // if (urlComponents.length!=3) { throw new Error("Unexpected path in socket connection URL."); }
      // const name: TDocName = `${urlComponents[1]}/${urlComponents[2]}`;

      // Opening the TDoc is asynchronous, and messages can come in during that time.
      // We queue up any messages that come in during that time and dispatch them after
      // the TDoc is opened.
      // const msgQueue: WebSocket.Data[] = [];
      // const listener = (m: WebSocket.Data)=>msgQueue.push(m);
      // ws.addListener('message', listener);
      // // REVIEW: What about listening for 'error' and 'close' events, etc.

      // let rval = this.sClientSockets.get(name);
      // if (!rval) {
      //   await TDoc.open(name, {/* Default Options */});
      //   // We will get a synchronous TDoc 'open' event, which will create the OpenTDoc instance.
      //   rval = this.sClientSockets.get(name);
      //   if (!rval) { throw new Error(`Client Socket: cannot find OpenTDoc after TDoc is opened: ${name}`) }
      // }
      // rval.(ws);

      // // Dispatch any messages that came in.
      // ws.removeListener('message', listener);
      // for (const msg of msgQueue) { rval.onWsMessage(ws, msg); }

    } catch(err) {
       console.error(`Web Socket: unexpected error handling web-socket connection event: ${err.message}`);
    }
  }

  // Private Constructor

  private constructor(id: ClientId, ws: WebSocket) {
    console.log(`Client Socket: constructor`)
    this.id = id;
    this.socket = ws;
    this.tDocs = new Map();
    this.tDocListeners = new Map();
    ws.on('close', (code: number, reason: string) => this.onWsClose(ws, code, reason))
    ws.on('error', (err: Error) => this.onWsError(ws, err))
    ws.on('message', (message: string) => this.onWsMessage(ws, message));
  }

  // Private Instance Properties
  // private closeTimeout?: NodeJS.Timeout;
  private socket: WebSocket;
  private tDocs: Map<TDocName,TDoc>;
  private tDocListeners: Map<TDocName, TDocListeners>;

  // Private Event Handlers

  private onTDocChange(tDoc: TDoc, change: NotebookChange): void {
    try {
      console.log(`Client Socket: tDoc changed: ${tDoc._name} ${change.type}`);
      this.sendMessage({ action: 'notebookChanged', notebookName: tDoc._name, change });
    } catch(err) {
      console.error(`Client Socket: unexpected error handling tDoc change: ${err.message}`);
    }
  }

  private onTDocClose(tDoc: TDoc): void {
    try {
      console.log(`Client Socket: tDoc closed: ${tDoc._name}`);
      this.closeNotebook(tDoc);
    } catch(err) {
      console.error(`Client Socket: Unexpected error handling tdoc close: ${err.message}`);
    }
  }

  private onWsClose(_ws: WebSocket, code: number, reason: string): void {
    try {

      // Normal close appears to be code 1001, reason empty string.
      console.log(`Client Socket: web socket closed: ${code} ${reason} ${this.tDocs.size}`);

      for (const tDoc of this.allTDocs()) { this.closeNotebook(tDoc); }
      ClientSocket.clientSockets.delete(this.id);

    } catch(err) {
      console.error(`Client Socket: Unexpected error handling web-socket close: ${err.message}`);
    }
  }

  private onWsError(_ws: WebSocket, err: Error): void {
    try {
      console.error(`Client Socket: web socket error: ${this.id} ${(<any>err).code} ${err.message}`);
      // REVIEW: is the error recoverable? is the websocket closed? will we get a closed event?
    } catch(err) {
      console.error(`Client Socket: Unexpected error handling web-socket error: ${err.message}`);
    }
  }

  private onWsMessage(_ws: WebSocket, message: WebSocket.Data) {
    try {
      const msg: ClientMessage = JSON.parse(message.toString());
      console.log(`Client Socket: received socket message: ${msg.action} ${msg.notebookName}`);
      if (msg.action == 'openNotebook') {
        this.cmOpenNotebook(msg.notebookName);
      } else {
        const tDoc = this.tDocs.get(msg.notebookName);
        if (!tDoc) { throw new Error(`Client Socket unknown notebook: ${msg.action} ${msg.notebookName}`); }
        switch(msg.action) {
          case 'closeNotebook':         this.cmCloseNotebook(tDoc); break;
          case 'deleteThought':         this.cmDeleteThought(tDoc, msg.thoughtId); break;
          case 'insertHandwrittenMath': this.cmInsertHandwrittenMath(tDoc, msg.latexMath, msg.latexMath); break;
          case 'insertHandwrittenText': this.cmInsertHandwrittenText(tDoc, msg.text, msg.strokeGroups); break;
          case 'insertMathJsText':      this.cmInsertMathJsText(tDoc, msg.mathJsText); break;
          default:
            console.error(`Client Socket: unexpected WebSocket message action ${(<any>msg).action}. Ignoring.`);
            break;
          }
        }
    } catch(err) {
      console.error(`Client Socket: unexpected error handling web-socket message: ${err.message}`);
    }
  }

  // Private Client Message Handlers

  private cmCloseNotebook(tDoc: TDoc): void {
    this.closeNotebook(tDoc);
  }

  private cmDeleteThought(tDoc: TDoc, thoughtId: ThoughtId): void {
    tDoc.deleteThought(thoughtId);
  }

  private cmInsertHandwrittenMath(tDoc: TDoc, latexMath: LatexMath, jiix: Jiix): void {
    const thought = tDoc.insertThought();
    tDoc.insertLatexStyle(thought, latexMath, 'INPUT', 'USER');
    tDoc.insertJiixStyle(thought, jiix, 'HANDWRITING', 'USER');
  }

  private cmInsertHandwrittenText(tDoc: TDoc, text: string, strokeGroups: StrokeGroups): void {
    const thought = tDoc.insertThought();
    tDoc.insertTextStyle(thought, text, 'INPUT', 'USER');
    tDoc.insertStrokeStyle(thought, strokeGroups, 'HANDWRITING', 'USER');
  }

  private cmInsertMathJsText(tDoc: TDoc, mathJsText: MathJsText): void {
    let parseResults: ParseResults|undefined = undefined;
    try {
      parseResults = parseMathJsExpression(mathJsText);
    } catch(err) {
      // REVIEW: Is this error handled properly?
      console.error(`Client Socket: insertMathJsText parse error: ${err.message}`);
      return;
    }
    const thought = tDoc.insertThought();
    const style = tDoc.insertMathJsStyle(thought, parseResults.mathJsText, 'INPUT', 'USER');
    tDoc.insertLatexStyle(style, parseResults.latexMath, 'PRETTY', 'USER');
  }

  private cmOpenNotebook(notebookName: NotebookName): void {
    const tDoc = this.tDocs.get(notebookName);
    if (tDoc) {
      // TODO: handle error
      // TODO: Send notebookOpened message?
      console.error(`ERROR: Client Socket: client duplicate open notebook message: ${this.id} ${notebookName}`);
      return;
    }
    this.openNotebook(notebookName).catch(
      (err: Error)=>{
        console.error(`ERROR: Client Socket: error opening notebook: ${this.id} ${notebookName} ${err.message}`);
        // TODO: Send client an error message
      }
    );
  }

  // Private Instance Methods

  // private addSocket(ws: WebSocket): void {
  //   console.log(`Client Socket: adding web socket`);
  //   if (this.closeTimeout) {
  //     console.log(`Client Socket: aborting close timeout: ${this.tDoc._name}`);
  //     clearTimeout(this.closeTimeout);
  //     delete this.closeTimeout;
  //   }
  //   this.sockets.add(ws);
  // }

  // // This is called by a setTimeout call a few seconds after the last socket has closed.
  // private close(): void {
  //   console.log(`Client Socket: CLOSE TIMEOUT EXPIRED: ${this.tDoc._name}`)
  //   if (this.sockets.size>0) {
  //     console.error(`ERROR: OpenTDoc close timeout expired with sockets remaining.`);
  //     return;
  //   }
  //   // REVIEW: Only close if we opened?
  //   this.tDoc.close();
  //   // NOTE: tDoc.close will emit the 'close' event, which will invoke this.onTDocClose,
  //   //       which will remove us from the sOpenTDocs map.
  // }

  private closeNotebook(tDoc: TDoc) {
    const notebookName = tDoc._name;
    /* const exists = */this.tDocs.delete(notebookName);
    // TODO: assert exists
    const listeners = this.tDocListeners.get(notebookName);
    this.tDocListeners.delete(notebookName);
    if (!listeners) {
      console.error(`ERROR: Client Socket: listeners don't exist for tDoc: ${this.id} ${notebookName}`)
      return;
    }
    tDoc.removeListener('change', listeners.change);
    tDoc.removeListener('close', listeners.close);
    this.sendMessage({ action: 'notebookClosed', notebookName: tDoc._name });
  }

  private async openNotebook(notebookName: NotebookName): Promise<void> {

    const tDoc = await TDoc.open(notebookName, {/* default options*/});
    const listeners: TDocListeners = {
      change: (ch: NotebookChange)=>this.onTDocChange(tDoc,ch),
      close: ()=>this.onTDocClose(tDoc),
    }

    this.tDocs.set(tDoc._name, tDoc);
    this.tDocListeners.set(tDoc._name, listeners);

    // IMPORTANT: We prepend the 'change' listener because we need to send
    // style and thought insert messsage to the client in the order the
    // styles and thoughts are created.
    // Because CAS modules can synchronously create new thoughts and styles
    // in response to 'change' events, if we are not first on the list of listeners,
    // we may get the events out of creation order.
    tDoc.prependListener('change', listeners.change);
    tDoc.on('close', listeners.close);

    this.sendMessage({ action: 'notebookOpened', notebookName, notebook: tDoc.toJSON() })
  }

  private sendMessage(msg: ServerMessage): void {
    const json = JSON.stringify(msg);
    console.log(`Client Socket: sending socket message ${msg.action}.`);
    try {
      // REVIEW: Should we check ws.readyState
      this.socket.send(json);
    } catch(err) {
      console.error(`ERROR: OpenTDoc sending websocket message: ${this.socket.readyState} ${(<any>err).code} ${err.message}`)
    }
  }

}
