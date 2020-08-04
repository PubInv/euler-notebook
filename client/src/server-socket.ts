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

import { addErrorMessageToHeader } from './global';
import { FolderPath, NotebookPath } from './shared/folder';
import { ClientMessage, ServerMessage, NotebookOpened, NotebookClosed, NotebookChanged, FolderOpened, FolderClosed, FolderChanged } from './shared/math-tablet-api';
import { ClientFolder } from './client-folder';
import { ClientNotebook } from './client-notebook';

// Types

type ConnectPromise = PromiseResolver<ServerSocket>;
type OpenFolderPromise = PromiseResolver<ClientFolder>;
type OpenNotebookPromise = PromiseResolver<ClientNotebook>;

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

  public async openFolder(folderPath: FolderPath): Promise<ClientFolder> {
    this.sendMessage({ type: 'openFolder', folderPath });
    return new Promise((resolve, reject)=>this.openFolderPromises.set(folderPath, { resolve, reject }))
  }

  public async openNotebook(notebookPath: NotebookPath): Promise<ClientNotebook> {
    this.sendMessage({ type: 'openNotebook', notebookPath: notebookPath });
    return new Promise((resolve, reject)=>this.openNotebookPromises.set(notebookPath, { resolve, reject }))
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
    this.openFolderPromises = new Map();
    this.openNotebookPromises = new Map();
    const ws = this.ws = new WebSocket(url);
    ws.addEventListener('close', (event: CloseEvent)=>this.onWsClose(event));
    ws.addEventListener('error', (event: Event)=>this.onWsError(event));
    ws.addEventListener('message', (event: MessageEvent)=>this.onWsMessage(event));
    ws.addEventListener('open', ()=>{ this.onWsOpen(); });
  }

  // Private Instance Properties

  private openFolderPromises: Map<FolderPath, OpenFolderPromise>;
  private openNotebookPromises: Map<NotebookPath, OpenNotebookPromise>;
  private connectPromise: ConnectPromise;
  private ws: WebSocket;

  // Private Instance Methods

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
      // console.log(`Message from server: ${msg.type}`);
      // console.dir(msg);
      switch(msg.type) {
        case 'folderChanged': this.smFolderChanged(msg); break;
        case 'folderClosed':  this.smFolderClosed(msg); break;
        case 'folderOpened':  this.smFolderOpened(msg); break;
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

  private smFolderOpened(msg: FolderOpened): void {
    // TODO: notebook open failure
    const openRequest = this.openFolderPromises.get(msg.obj.path);
    if (!openRequest) { throw new Error(`Folder opened message for unknown folder: ${msg.obj.path}`); }
    const openFolder = ClientFolder.open(this, msg.obj);
    openRequest.resolve(openFolder);
    this.openFolderPromises.delete(msg.obj.path);
  }

  private smFolderClosed(msg: FolderClosed): void {
    const folderView = ClientFolder.get(msg.folderPath);
    if (!folderView) { throw new Error(`Unknown folder closed: ${msg.folderPath}`); }
    folderView.smClose();
  }

  private smFolderChanged(msg: FolderChanged): void {
    const folderView = ClientFolder.get(msg.folderPath);
    if (!folderView) { throw new Error(`Folder change from unknown folder: ${msg.folderPath}`); }
    folderView.smChange(msg);
  }

  private smNotebookOpened(msg: NotebookOpened): void {
    // TODO: notebook open failure
    const openRequest = this.openNotebookPromises.get(msg.notebookPath);
    if (!openRequest) { throw new Error(`Notebook opened message for unknown notebook: ${msg.notebookPath}`); }
    const openNotebook = ClientNotebook.open(this, msg.notebookPath, msg.obj);
    openRequest.resolve(openNotebook);
    this.openNotebookPromises.delete(msg.notebookPath);
  }

  private smNotebookClosed(msg: NotebookClosed): void {
    const notebookView = ClientNotebook.get(msg.notebookPath);
    if (!notebookView) { throw new Error(`Unknown notebook closed: ${msg.notebookPath}`); }
    notebookView.smClose();
  }

  private smNotebookChanged(msg: NotebookChanged): void {
    const notebookView = ClientNotebook.get(msg.notebookPath);
    if (!notebookView) { throw new Error(`Notebook change from unknown notebook: ${msg.notebookPath}`); }
    notebookView.smChange(msg);
  }

}
