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
const MODULE = __filename.split('/').slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);
import { Request } from 'express';
import * as WebSocket from 'ws';

// TODO: Handle websocket lifecycle: closing, unexpected disconnects, errors, etc.

import { ClientMessage, NotebookChange, NotebookName, NotebookPath, ServerMessage,
         ThoughtId, StyleSource, ToolInfo, StylePropertiesWithSubprops, ThoughtObject, StyleObject, NotebookChanged, ThoughtInserted, StyleInserted, StylableId, InsertThought } from '../client/math-tablet-api';

import { PromiseResolver } from './common';
// REVIEW: This file should not be dependent on any specific observers.
import { TDoc } from './tdoc';

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

  // public tDoc: TDoc;
  public id: ClientId;

  // Instance Property Functions

  public allNotebooks(): IterableIterator<TDoc> {
    return this.tDocs.values();
  }

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

  // --- PRIVATE ---

  // Private Class Properties

  private static clientSockets = new Map<ClientId, ClientSocket>();

  // Private Class Methods

  private static async onConnection(ws: WebSocket, req: Request): Promise<void> {
    try {
      debug(`Client Socket: new connection: ${req.url}`);
      // TODO: Client generate ID and send it with connection.
      const id: ClientId = Date.now().toString();
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
    this.tDocs = new Map();
    this.tDocListeners = new Map();
    ws.on('close', (code: number, reason: string) => this.onWsClose(ws, code, reason))
    ws.on('error', (err: Error) => this.onWsError(ws, err))
    ws.on('message', (message: string) => this.onWsMessage(ws, message));
  }

  // Private Instance Properties
  private closePromise?: Promise<void>;
  private closeResolver?: PromiseResolver<void>;
  private socket: WebSocket;
  private tDocs: Map<NotebookPath,TDoc>;
  private tDocListeners: Map<NotebookPath, TDocListeners>;

  // Private Event Handlers

  private onTDocChange(tDoc: TDoc, change: NotebookChange): void {
    try {
      debug(`Client Socket: tDoc changed: ${tDoc._path} ${change.type}`);
      this.sendMessage({ action: 'notebookChanged', notebookName: tDoc._path, change });
    } catch(err) {
      console.error(`Client Socket: unexpected error handling tDoc change: ${err.message}`);
    }
  }

  private onTDocClose(tDoc: TDoc): void {
    try {
      debug(`Client Socket: tDoc closed: ${tDoc._path}`);
      this.closeNotebook(tDoc._path, true);
    } catch(err) {
      console.error(`Client Socket: Unexpected error handling tdoc close: ${err.message}`);
    }
  }

  private onWsClose(_ws: WebSocket, code: number, reason: string): void {
    try {
      // Normal close appears to be code 1001, reason empty string.
      if (this.closeResolver) {
        debug(`Client Socket: web socket closed by server: ${code} '${reason}' ${this.tDocs.size}`);
        this.closeResolver.resolve();
      } else {
        debug(`Client Socket: web socket closed by client: ${code} '${reason}' ${this.tDocs.size}`);
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

  private onWsMessage(_ws: WebSocket, message: WebSocket.Data) {
    try {
      const msg: ClientMessage = JSON.parse(message.toString());
      debug(`Client Socket: received socket message: ${msg.action} ${msg.notebookName}`);
      switch(msg.action) {
      case 'openNotebook': this.cmOpenNotebook(msg.notebookName); break;
      case 'closeNotebook': this.cmCloseNotebook(msg.notebookName); break;
      default: {
        const tDoc = this.tDocs.get(msg.notebookName);
        if (!tDoc) { throw new Error(`Client Socket unknown notebook: ${msg.action} ${msg.notebookName}`); }
        switch(msg.action) {
        case 'deleteThought':  this.cmDeleteThought(tDoc, msg.thoughtId); break;
        case 'insertThought':  this.cmInsertThought(tDoc, msg); break;
        case 'useTool': this.cmUseTool(tDoc, msg.thoughtId, msg.source, msg.info); break;
	      default: {
          console.error(`Client Socket: unexpected WebSocket message action ${(<any>msg).action}. Ignoring.`);
          break;
        }}
        break;
      }}
    } catch(err) {
      console.error(`Client Socket: unexpected error handling web-socket message: ${err.message}`);
    }
  }

  // Private Client Message Handlers

  private cmCloseNotebook(notebookName: NotebookName): void {
    this.closeNotebook(notebookName, true);
  }

  private cmDeleteThought(tDoc: TDoc, thoughtId: ThoughtId): void {
    tDoc.deleteThought(thoughtId);
  }

  private cmInsertThought(tDoc: TDoc, msg: InsertThought): void {
    const thought = tDoc.insertThought(msg.thoughtProps, msg.afterId);
    for (const styleProps of msg.stylePropss) {
      insertStyleRecursive(tDoc, thought, styleProps);
    }
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

  private cmUseTool(tDoc: TDoc, thoughtId: ThoughtId, source: StyleSource, info: ToolInfo): void {
    debug("cmUseTool Begin");
    tDoc.useTool(thoughtId, source, info);
    debug("cmUseTool End");
  }

  // Private Instance Methods

  private closeAllNotebooks(notify: boolean): void {
    for (const notebookName of this.tDocs.keys()) { this.closeNotebook(notebookName, notify); }
  }

  private closeNotebook(notebookName: NotebookName, notify: boolean): void {
    const tDoc = this.tDocs.get(notebookName);
    if (!tDoc) {
      console.warn(`Client Socket ${this.id}: closing notebook that is already closed: ${notebookName}`);
      return;
    }
    this.tDocs.delete(notebookName);
    const listeners = this.tDocListeners.get(notebookName);
    if (listeners) {
      this.tDocListeners.delete(notebookName);
      tDoc.removeListener('close', listeners.close);
      tDoc.removeListener('change', listeners.change);
    } else {
      console.error(`ERROR: Client Socket: listeners don't exist for tDoc: ${this.id} ${notebookName}`)
    }
    if (notify) {
      this.sendMessage({ action: 'notebookClosed', notebookName: tDoc._path });
    }
  }

  // REVIEW: notebookName could be extracted from tDoc.
  private insertStylesRecursively(notebookName: NotebookName, tDoc: TDoc, id: StylableId): void {
    for (const style of tDoc.childStylesOf(id)) {
      const change: StyleInserted = { type: 'styleInserted', style };
      const msg: NotebookChanged = { action: 'notebookChanged', notebookName, change }
      this.sendMessage(msg);
      this.insertStylesRecursively(notebookName, tDoc, style.id);
    }
  }

  private async openNotebook(notebookName: NotebookName): Promise<void> {
    const tDoc = await TDoc.open(notebookName, {/* default options*/});
    const listeners: TDocListeners = {
      change: (ch: NotebookChange)=>this.onTDocChange(tDoc,ch),
      close: ()=>this.onTDocClose(tDoc),
    }

    this.tDocs.set(tDoc._path, tDoc);
    this.tDocListeners.set(tDoc._path, listeners);

    // IMPORTANT: We prepend the 'change' listener because we need to send
    // style and thought insert messsage to the client in the order the
    // styles and thoughts are created.
    // Because CAS modules can synchronously create new thoughts and styles
    // in response to 'change' events, if we are not first on the list of listeners,
    // we may get the events out of creation order.
    tDoc.prependListener('change', listeners.change);
    tDoc.on('close', listeners.close);

    this.sendMessage({ action: 'notebookOpened', notebookName });

    // Send all notebook thoughts and styles.
    for (const thought of tDoc.allThoughts()) {
      const change: ThoughtInserted = { type: 'thoughtInserted', thought };
      const msg: NotebookChanged = { action: 'notebookChanged', notebookName, change }
      this.sendMessage(msg);
      this.insertStylesRecursively(notebookName, tDoc, thought.id);
    }
  }

  private sendMessage(msg: ServerMessage): void {
    const json = JSON.stringify(msg);
    debug(`Client Socket: sending socket message ${msg.action}.`);
    try {
      // REVIEW: Should we check ws.readyState
      // REVIEW: Should we use the callback to see if the message went through?
      this.socket.send(json);
    } catch(err) {
      console.error(`ERROR: OpenTDoc sending websocket message: ${this.socket.readyState} ${(<any>err).code} ${err.message}`)
    }
  }
}

// Helper Functions

function insertStyleRecursive(tDoc: TDoc, parent: ThoughtObject|StyleObject, propsWithSubprops: StylePropertiesWithSubprops): void {
  const { subprops, ...props } = propsWithSubprops;
  const style = tDoc.insertStyle(parent, props);
  if (subprops) {
    for (const props of subprops) {
      insertStyleRecursive(tDoc, style, props);
    }
  }
}
