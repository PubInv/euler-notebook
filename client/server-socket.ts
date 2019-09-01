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

// TODO: A more symmetric approach would be for notebooks to emit events,
//       the server socket listens for the events and passes them as messages to the server.

// Requirements

import { addErrorMessageToHeader } from './global.js';
import { ClientMessage, NotebookName, ServerMessage, NotebookOpened, NotebookClosed, NotebookChanged } from './math-tablet-api.js';
import { NotebookView } from './notebook-view.js';

// Types

type ConnectPromise = PromiseResolver<ServerSocket>;
type OpenPromise = PromiseResolver<NotebookView>;

// REVIEW: This is also defined in server/common.ts.
interface PromiseResolver<T> {
  resolve: (s: T)=>void;
  reject: (err: Error)=>void
}

// Class

export class ServerSocket {

  // Class Methods

  public static async connect(url: string): Promise<ServerSocket> {
    return new Promise((resolve, reject)=>{
      new ServerSocket(url, { resolve, reject });
    });
  }

  // Instance Properties

  // Instance Methods

  public async openNotebook(notebookName: NotebookName): Promise<NotebookView> {
    this.sendMessage({ type: 'openNotebook', notebookName });
    return new Promise((resolve, reject)=>this.openPromises.set(notebookName, { resolve, reject }))
  }

  public sendMessage(obj: ClientMessage): void {
    const json = JSON.stringify(obj);
    try {
      this.ws.send(json);
    } catch(err) {
      // REVIEW: What to do?
      console.error(`Server Socket: Error sending websocket message: ${this.ws.readyState} ${(<any>err).code} ${err.message}`)
    }
  }

  // -- PRIVATE --

  // Private Class Properties


  // Private Constructor

  private constructor(url: string, connectPromise: ConnectPromise) {
    this.connectPromise = connectPromise;
    this.openPromises = new Map();
    const ws = this.ws = new WebSocket(url);
    ws.addEventListener('close', (event: CloseEvent)=>this.onWsClose(event));
    ws.addEventListener('error', (event: Event)=>this.onWsError(event));
    ws.addEventListener('message', (event: MessageEvent)=>this.onWsMessage(event));
    ws.addEventListener('open', ()=>{ this.onWsOpen(); });
  }

  // Private Instance Properties

  private openPromises: Map<NotebookName, OpenPromise>;
  private connectPromise: ConnectPromise;
  private ws: WebSocket;

  // Private Event Handlers

  // See https://github.com/Luka967/websocket-close-codes.
  private onWsClose(event: CloseEvent): void {
    // For terminating server: code = 1006, reason = "";
    console.log(`Notebook Conn: socket closed: ${event.code} ${event.reason}`);
    console.dir(event);
    addErrorMessageToHeader(`Socket closed by server. Refresh this page in your browser to reconnect.`);
    // LATER: Attempt to reconnect after a few seconds with exponential backoff.
  }

  private onWsError(event: Event): void {
    console.error(`Notebook Conn: socket error.`);
    console.dir(event);
    // REVIEW: Error info?
    this.connectPromise.reject(new Error(`Cannot connect to server.`));

    // REVIEW: Is the socket stull usable? Is the socket closed? Will we also get a close event?
    addErrorMessageToHeader(`Socket error. Refresh this page in your browser to reconnect.`);
  }

  private onWsMessage(event: MessageEvent): void {
    try {
      const msg: ServerMessage = JSON.parse(event.data);
      console.log(`Notebook Conn: socket message: ${msg.type}`);
      // console.dir(msg);
      switch(msg.type) {
      case 'notebookChanged': this.smNotebookChanged(msg); break;
      case 'notebookClosed':  this.smNotebookClosed(msg); break;
      case 'notebookOpened':  this.smNotebookOpened(msg); break;
      default:
        console.error(`Unexpected server message type '${(<any>msg).type}' in WebSocket message`);
        break;
      }
    } catch(err) {
      console.error("Unexpected client error handling `WebSocket message event.");
      console.dir(err);
    }
  }

  private onWsOpen(): void {
    try {
      console.log("Notebook Conn: socket opened.");
      this.connectPromise.resolve(this);
    } catch(err) {
      console.error("Unexpected client error handling WebSocket open event.");
    }
  }

  // Private Server Message Handlers

  private smNotebookOpened(msg: NotebookOpened): void {
    const openRequest = this.openPromises.get(msg.notebookName);
    if (!openRequest) { throw new Error(`Notebook opened message for unknown notebook: ${msg.notebookName}`); }
    const notebook = NotebookView.open(this, msg.notebookName, msg.obj);
    openRequest.resolve(notebook);
    this.openPromises.delete(msg.notebookName);
  }

  // TODO: notebook open failure

  private smNotebookClosed(msg: NotebookClosed): void {
    const notebook = NotebookView.get(msg.notebookName);
    if (!notebook) { throw new Error(`Unknown notebook closed: ${msg.notebookName}`); }
    notebook.smClose();
  }

  private smNotebookChanged(msg: NotebookChanged): void {
    const notebook = NotebookView.get(msg.notebookName);
    if (!notebook) { throw new Error(`Notebook change from hnknown notebook: ${msg.notebookName}`); }
    notebook.smChange(msg.changes);
  }

  // Private Instance Methods

}
