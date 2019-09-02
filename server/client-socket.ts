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

import * as debug1 from 'debug';
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);
import { Request } from 'express';
import * as WebSocket from 'ws';

// TODO: Handle websocket lifecycle: closing, unexpected disconnects, errors, etc.
import { NotebookChange } from '../client/notebook';
import { ClientMessage, NotebookName, NotebookChanged, ServerMessage, CloseNotebook, OpenNotebook, UseTool, NotebookOpened, ChangeNotebook } from '../client/math-tablet-api';

import { PromiseResolver, runAsync } from './common';
import { NotebookPath } from './files-and-folders';
// REVIEW: This file should not be dependent on any specific observers.
import { ServerNotebook } from './server-notebook';
import { ClientObserver } from './observers/client-observer';

// Types

export type ClientId = string;

// Constants

// const CLOSE_TIMEOUT_IN_MS = 5000;

// Event Handlers

export class ClientSocket {

  // Class Properties

  public static allSockets(): IterableIterator<ClientSocket> {
    return this.clientSockets.values();
  }

  // Class Methods

  public static close(id: ClientId, code?: number, reason?: string): Promise<void> {
    const instance = this.clientSockets.get(id);
    if (!instance) { throw new Error(`Unknown client socket ${id} requested in close.`); }
    return instance.close(code, reason);
  }

  public static initialize(server: Server): void {
    debug("Client Socket: initialize");
    const wss = new WebSocket.Server({ server });
    wss.on('connection', (ws: WebSocket, req: Request)=>{ this.onConnection(ws, req); });
  }

  // Instance Properties

  public id: ClientId;

  // Instance Property Functions

  // Instance Methods

  // See https://github.com/Luka967/websocket-close-codes.
  public close(code?: number, reason?: string): Promise<void> {
    // REVIEW: Can a close fail? That is, can we make a socket.close() call
    //         and never receive a 'close' event? (e.g. get 'error' event instead.)
    if (!this.closePromise) {
      if (this.socket.readyState != WebSocket.CLOSED) {
        const notify = (this.socket.readyState == WebSocket.OPEN);
        this.closeAllNotebooks(notify);
        this.closePromise = new Promise((resolve, reject)=>{ this.closeResolver = { resolve, reject }; });
        if (this.socket.readyState != WebSocket.CLOSING) {
          debug(`Client Socket ${this.id}: closing.`);
          this.socket.close(code, reason);
        } else {
          console.warn(`WARNING: Client Socket ${this.id}: closing socket that is closing.`)
        }
      } else {
        console.warn(`WARNING: Client Socket ${this.id}: closing socket that is already closed.`)
        this.closePromise = Promise.resolve();
      }
    } else {
      // REVIEW: This may not be an error.
      console.warn(`WARNING: Client Socket ${this.id}: repeat close call.`);
      return this.closePromise;
    }
    return this.closePromise;
  }

  // REVIEW: Async using socket sending callback?
  public notebookChanged(notebook: ServerNotebook, changes: NotebookChange[]): void {
    // REVIEW: verify that notebook is one of our opened ones?
    if (!notebook._path) { throw new Error("Unexpected."); }
    const msg: NotebookChanged = {
      type: 'notebookChanged',
      notebookName: notebook._path,
      changes,
    };
    this.sendMessage(msg);
  }

  // --- PRIVATE ---

  // Private Class Properties

  private static clientSockets = new Map<ClientId, ClientSocket>();

  // Private Class Methods

  private static async onConnection(ws: WebSocket, req: Request): Promise<void> {
    try {
      debug(`Client Socket: new connection: ${req.url}`);
      // TODO: Client generate ID and send it with connection.
      const id: ClientId = `C${Date.now()}`;
      const instance = new this(id, ws);
      this.clientSockets.set(id, instance);
    } catch(err) {
       console.error(`Web Socket: unexpected error handling web-socket connection event: ${err.message}`);
    }
  }

  // Private Constructor

  private constructor(id: ClientId, ws: WebSocket) {
    debug(`Client Socket: constructor`)
    this.id = id;
    this.socket = ws;
    this.clientObservers = new Map();
    ws.on('close', (code: number, reason: string) => this.onWsClose(ws, code, reason))
    ws.on('error', (err: Error) => this.onWsError(ws, err))
    ws.on('message', (message: string) => this.onWsMessage(ws, message));
  }

  // Private Instance Properties
  private closePromise?: Promise<void>;
  private closeResolver?: PromiseResolver<void>;
  private socket: WebSocket;
  private clientObservers: Map<NotebookPath, ClientObserver>;

  private onWsClose(_ws: WebSocket, code: number, reason: string): void {
    try {
      // Normal close appears to be code 1001, reason empty string.
      if (this.closeResolver) {
        debug(`Client Socket: web socket closed by server: ${code} '${reason}' ${this.clientObservers.size}`);
        this.closeResolver.resolve();
      } else {
        debug(`Client Socket: web socket closed by client: ${code} '${reason}' ${this.clientObservers.size}`);
        this.closeAllNotebooks(false);
      }
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

  private onWsMessage(_ws: WebSocket, message: WebSocket.Data): void {
    try {
      const msg: ClientMessage = JSON.parse(message.toString());
      console.log(`Message from client: ${msg.notebookName} ${msg.type}`);
      // console.dir(msg);
      debug(`Client Socket: received socket message: ${msg.type} ${msg.notebookName}`);
      switch(msg.type) {
        case 'changeNotebook':
          runAsync(this.cmChangeNotebook(msg), MODULE, 'cmCloseNotebook');
          break;
        case 'closeNotebook':
          runAsync(this.cmCloseNotebook(msg), MODULE, 'cmCloseNotebook');
          break;
        case 'openNotebook':
          runAsync(this.cmOpenNotebook(msg), MODULE, 'cmOpenNotebook');
          break;
        case 'useTool':
          runAsync(this.cmUseTool(msg), MODULE, 'cmUseTool');
          break;
        default: {
          console.error(`Client Socket: unexpected WebSocket message type ${(<any>msg).type}. Ignoring.`);
          break;
        }
      }
    } catch(err) {
      console.error(`Client Socket: unexpected error handling web-socket message: ${err.message}`);
    }
  }

  // Private Client Message Handlers

  private async cmChangeNotebook(msg: ChangeNotebook): Promise<void> {
    const clientObserver = this.clientObservers.get(msg.notebookName);
    if (!clientObserver) { throw new Error(`Unknown notebook ${msg.notebookName} for client message delete-style.`); }
    // REVIEW: source client id?
    await clientObserver.notebook.requestChanges('USER', msg.changeRequests);
  }

  private async cmCloseNotebook(msg: CloseNotebook): Promise<void> {
    await this.closeNotebook(msg.notebookName, true);
  }

  private async cmOpenNotebook(msg: OpenNotebook): Promise<void> {
    const clientObserver = this.clientObservers.get(msg.notebookName);
    if (clientObserver) {
      // TODO: handle error
      // TODO: Send notebookOpened message?
      console.error(`ERROR: Client Socket: client duplicate open notebook message: ${this.id} ${msg.notebookName}`);
      return;
    }
    await this.openNotebook(msg.notebookName);
  }

  private async cmUseTool(msg: UseTool): Promise<void> {
    const clientObserver = this.clientObservers.get(msg.notebookName);
    if (!clientObserver) { throw new Error(`Unknown notebook ${msg.notebookName} for client message use-tool.`); }
    await clientObserver.notebook.useTool(msg.styleId);
  }

  // Private Instance Methods

  private async closeAllNotebooks(notify: boolean): Promise<void> {
    // REVIEW: close in parallel?
    for (const notebookName of this.clientObservers.keys()) {
      await this.closeNotebook(notebookName, notify);
    }
  }

  private async closeNotebook(notebookName: NotebookName, notify: boolean): Promise<void> {
    const clientObserver = this.clientObservers.get(notebookName);
    if (!clientObserver) {
      console.warn(`Client Socket ${this.id}: closing notebook that is already closed: ${notebookName}`);
      return;
    }
    this.clientObservers.delete(notebookName);
    clientObserver.close();
    if (notify) {
      this.sendMessage({ type: 'notebookClosed', notebookName });
    }
  }

  private async openNotebook(notebookName: NotebookName): Promise<void> {
    const notebook = await ServerNotebook.open(notebookName);
    const clientObserver = ClientObserver.open(notebook, this);
    this.clientObservers.set(notebook._path!, clientObserver);
    const msg: NotebookOpened = {
      type: 'notebookOpened',
      notebookName,
      obj: notebook.toJSON(),
    }
    this.sendMessage(msg);
  }

  private sendMessage(msg: ServerMessage): void {
    const json = JSON.stringify(msg);
    debug(`Client Socket: sending socket message ${msg.type}.`);
    try {
      // REVIEW: Should we check ws.readyState
      // REVIEW: Should we use the callback to see if the message went through?
      this.socket.send(json);
    } catch(err) {
      console.error(`ERROR: Sending websocket message: ${this.socket.readyState} ${(<any>err).code} ${err.message}`)
    }
  }
}

// Helper Functions
