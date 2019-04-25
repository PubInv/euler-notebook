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

import { ClientMessage, UserName, NotebookName, ServerMessage } from '../client/math-tablet-api';

import { parseMathJsExpression, ParseResults } from './mathjs-cas';

import { TDoc, Change as TDocChange } from './tdoc';

// Types

// Exported Class

export class OpenTDoc {

  // Class Methods

  static async connect(userName: UserName, notebookName: NotebookName, ws: WebSocket): Promise<OpenTDoc> {
    const key = `${userName}/${notebookName}`;
    let rval = this.openTDocs.get(key);
    if (!rval) {
      // REVIEW: What if messages come in while we are reading the notebook?
      // TODO: Gracefully handle error if readNotebook throws error. (e.g. invalid version)
      const tDoc = await TDoc.open(key, {/* default options */});
      rval = new this(userName, notebookName, tDoc);
      this.openTDocs.set(key, rval);
    }
    rval.addSocket(ws);
    return rval;
  }

  // Instance Properties

  userName: UserName;
  notebookName: NotebookName;
  tDoc: TDoc;

  // Instance Methods

  // --- PRIVATE ---

  // Private Class Properties

  private static openTDocs: Map<string, OpenTDoc> = new Map<string, OpenTDoc>();

  // Private Constructor
  constructor(userName: UserName, notebookName: NotebookName, tDoc: TDoc) {
    this.notebookName = notebookName;
    this.tDoc = tDoc;
    this.userName = userName;
    this.webSockets = new Set<WebSocket>();

    // IMPORTANT: We prepend the 'change' listener because we need to send
    // style and thought insert messsage to the client in the order the
    // styles and thoughts are created.
    // Because CAS modules can synchronously create new thoughts and styles
    // in response to 'change' events, if we are not first on the list of listeners,
    // we may get the events out of creation order.
    tDoc.prependListener('change', d=>this.onTDocChange(d));
    tDoc.on('close', ()=>this.onTDocClose());
  }

  // Private Instance Properties
  webSockets: Set<WebSocket>;

  // Private Event Handlers

  private onTDocChange(change: TDocChange): void {
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
  }

  private onTDocClose(): void {
    // TODO!
  }

  private onWsClose(ws: WebSocket, code: number, reason: string): void {
    // Normal close appears to be code 1001, reason empty string.
    console.log(`Web socket closed: ${code} - ${reason}`);
    this.webSockets.delete(ws);
    // TODO: If the number of webSockets drops to zero then set a timer a close ourself.
  }

  private onWsError(_ws: WebSocket, err: Error): void {
    console.error(`Web socket error: ${(<any>err).code} ${err.message}`);
    // REVIEW: is the error recoverable? is the websocket closed? will we get a closed event?
  }

  private onWsMessage(_ws: WebSocket, message: string) {
    try {
      const msg: ClientMessage = JSON.parse(message);
      console.log(`Received socket message: ${msg.action}`);
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
          console.error(`insertMathJsText parse error: ${err.message}`);
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
        console.error(`Unexpected WebSocket message action ${(<any>msg).action}. Ignoring.`);
        break;
      }
    } catch(err) {
      console.error(`Unexpected error handling web-socket message event: ${err.message}`);
    }
  }

  // Private Instance Methods

  private addSocket(ws: WebSocket): void {
    this.webSockets.add(ws);
    ws.on('close', (code: number, reason: string) => this.onWsClose(ws, code, reason))
    ws.on('error', (err: Error) => this.onWsError(ws, err))
    ws.on('message', (message: string) => this.onWsMessage(ws, message));
  }

  private sendMessage(msg: ServerMessage, ws?: WebSocket): void {
    const json = JSON.stringify(msg);
    const sockets = ws ? [ ws ] : this.webSockets;
    console.log(`Sending socket message ${msg.action}.`);
    for (const ws of sockets) {
      try {
        // REVIEW: Should we check ws.readyState
        ws.send(json);
      } catch(err) {
        console.error(`Error sending websocket message: ${ws.readyState} ${(<any>err).code} ${err.message}`)
      }
    }
  }

}
