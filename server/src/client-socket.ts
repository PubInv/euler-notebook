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

// TODO: use error-handler/reportError

import { Server } from 'http';

import * as debug1 from 'debug';
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);
import { Request } from 'express';
import * as WebSocket from 'ws';

// TODO: Handle websocket lifecycle: closing, unexpected disconnects, errors, etc.
import { assert, PromiseResolver } from './shared/common';
import { NotebookPath, FolderPath, FolderObject } from './shared/folder';
import {
  ClientMessage, ServerMessage, ServerErrorMessage, ClientFolderChangeMessage, ClientFolderOpenMessage,
  ClientNotebookChangeMessage, ClientNotebookOpenMessage, ClientNotebookUseToolMessage,
  ServerNotebookChangedMessage, NotebookChangeRequest, RequestId, ServerFolderChangedMessage,
  ClientFolderCloseMessage, ServerFolderClosedMessage, ServerFolderOpenedMessage, ServerNotebookClosedMessage, ClientNotebookCloseMessage, ServerNotebookOpenedMessage, ServerFolderMovedMessage, ServerNotebookMovedMessage
} from './shared/math-tablet-api';

// REVIEW: This file should not be dependent on any specific observers.
import { reportError } from './error-handler';
import { ServerFolder, Watcher as ServerFolderWatcher } from './server-folder';
import { ServerNotebook, Watcher as ServerNotebookWatcher } from './server-notebook';
import { NotebookChange, NotebookObject } from './shared/notebook';

// Types

export type ClientId = string;

// Constants

// const CLOSE_TIMEOUT_IN_MS = 5000;

// Exported Class

export class ClientSocket {

  // Class Properties

  public static allSockets(): IterableIterator<ClientSocket> {
    return this.instanceMap.values();
  }

  // Class Methods

  public static close(id: ClientId, code?: number, reason?: string): Promise<void> {
    const instance = this.instanceMap.get(id);
    if (!instance) { throw new Error(`Unknown client socket ${id} requested in close.`); }
    return instance.close(code, reason);
  }

  public static initialize(server: Server): void {
    debug("Initialize");
    const wss = new WebSocket.Server({ server });
    wss.on('connection', (ws: WebSocket, req: Request)=>{ this.onConnection(ws, req); });
  }

  // Instance Properties

  public id: ClientId;

  // Instance Property Functions

  // Instance Methods

  public close(code?: number, reason?: string): Promise<void> {
    // See https://github.com/Luka967/websocket-close-codes.
    // REVIEW: Can a close fail? That is, can we make a socket.close() call
    //         and never receive a 'close' event? (e.g. get 'error' event instead.)
    if (!this.closePromise) {
      if (this.socket.readyState != WebSocket.CLOSED) {
        const notify = (this.socket.readyState == WebSocket.OPEN);
        this.closeAllNotebooks(notify);
        this.closeAllFolders(notify);
        this.closePromise = new Promise((resolve, reject)=>{ this.closeResolver = { resolve, reject }; });
        if (this.socket.readyState != WebSocket.CLOSING) {
          debug(`Socket closing: ${this.id}`);
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

  public closeNotebook(path: NotebookPath, notify: boolean): void {
    assert(!notify);  // REVIEW: Why have the parameter if it can only be false?
    const watcher = this.notebookWatchers.get(path)!;
    assert(watcher);
    this.notebookWatchers.delete(path);
    watcher.close();
  }

  public notifyNotebookChanged(
    path: NotebookPath,
    changes: NotebookChange[],
    undoChangeRequests: NotebookChangeRequest[]|undefined,
    requestId?: RequestId,
    complete?: boolean,
  ): void {
    // ServerNotebook is notifying us that there are changes to the notebook.
    assert(this.notebookWatchers.get(path))
    const msg: ServerNotebookChangedMessage = { type: 'notebook', operation: 'changed', path, changes, complete, requestId, undoChangeRequests };
    this.sendMessage(msg);
  }

  public removeFolderWatcher(path: FolderPath): void {
    // Called by watcher when the folder is closed from the server side.
    const had = this.folderWatchers.delete(path);
    assert(had);
  }

  public removeNotebookWatcher(path: NotebookPath): void {
    // Called by watcher when the notebook is closed from the server side.
    const had = this.notebookWatchers.delete(path);
    assert(had);
  }

  public sendMessage(msg: ServerMessage): void {
    // Should only be used by our watchers.
    const json = JSON.stringify(msg);
    try {
      // REVIEW: Should we check ws.readyState
      // REVIEW: Should we use the callback to see if the message went through?
      this.socket.send(json);
    } catch(err) {
      reportError(err, "Error sending websocket message: ReadyState ${this.socket.readyState}");
    }
  }

  // --- PRIVATE ---

  // Private Class Properties

  private static instanceMap: Map<ClientId, ClientSocket> = new Map();

  // Private Class Methods

  private static async onConnection(ws: WebSocket, req: Request): Promise<void> {
    try {
      debug(`New connection: ${req.url}`);
      // TODO: Client generate ID and send it with connection.
      const id: ClientId = `C${Date.now()}`;
      const instance = new this(id, ws);
      this.instanceMap.set(id, instance);
    } catch(err) {
      reportError(err, "Web Socket: unexpected error handling web-socket connection event.");
    }
  }

  // Private Constructor

  private constructor(id: ClientId, ws: WebSocket) {
    debug(`Constructor`)
    this.id = id;
    this.socket = ws;
    this.folderWatchers = new Map();
    this.notebookWatchers = new Map();
    ws.on('close', (code: number, reason: string) => this.onWsClose(ws, code, reason))
    ws.on('error', (err: Error) => this.onWsError(ws, err))
    ws.on('message', (message: string) => this.onWsMessage(ws, message));
  }

  // Private Instance Properties

  private closePromise?: Promise<void>;
  private closeResolver?: PromiseResolver<void>;
  private folderWatchers: Map<FolderPath, FolderWatcher>
  private notebookWatchers: Map<NotebookPath, NotebookWatcher>;
  private socket: WebSocket;

  // Private Instance Methods

  private closeAllFolders(notify: boolean): void {
    for (const path of this.folderWatchers.keys()) { this.closeFolder(path, notify); }
  }

  private closeFolder(path: FolderPath, notify: boolean): void {
    assert(!notify);  // REVIEW: Why have the parameter if it can only be false?
    const watcher = this.folderWatchers.get(path)!;
    assert(watcher);
    this.folderWatchers.delete(path);
    watcher.close();
  }

  private closeAllNotebooks(notify: boolean): void {
    for (const path of this.notebookWatchers.keys()) { this.closeNotebook(path, notify); }
  }

  // Private Instance Event Handlers

  private async onFolderChangeMessage(msg: ClientFolderChangeMessage): Promise<void> {
    try {
      const watcher = this.folderWatchers.get(msg.path)!;
      assert(watcher);
      const replyMsg = await watcher.onFolderChangeMessage(msg);
      replyMsg.requestId = msg.requestId;
      this.sendMessage(replyMsg);
    } catch(err) {
      reportError(err, `Error on folder change message.`);
      const response: ServerErrorMessage = { requestId: msg.requestId, type: 'error', message: err.message };
      this.sendMessage(response);
      return;
    }
  }

  private onFolderCloseMessage(msg: ClientFolderCloseMessage): void {
    this.closeFolder(msg.path, false);
  }

  private async onFolderOpenMessage(msg: ClientFolderOpenMessage): Promise<void> {
    // REVIEW: Check that the open folder message is not a duplicate?
    assert(!this.folderWatchers.get(msg.path));
    try {
      const { watcher, obj } = await FolderWatcher.open(this, msg);
      this.folderWatchers.set(msg.path, watcher);
      const response: ServerFolderOpenedMessage = { requestId: msg.requestId, type: 'folder', operation: 'opened', path: msg.path, obj };
      this.sendMessage(response);
    } catch(err) {
      reportError(err, `Error on folder open message.`);
      const response: ServerErrorMessage = { requestId: msg.requestId, type: 'error', message: err.message };
      this.sendMessage(response);
      return;
    }
  }

  private async onMessage(msg: ClientMessage): Promise<void> {
    debug(`Received socket message: ${msg.type}/${msg.operation}`);
    switch(msg.type) {
      case 'folder':
        switch(msg.operation) {
          case 'change': await this.onFolderChangeMessage(msg); break;
          case 'close':  this.onFolderCloseMessage(msg); break;
          case 'open': await this.onFolderOpenMessage(msg); break;
          default: assert(false); break;
        }
        break;
      case 'notebook':
        switch(msg.operation) {
          case 'change': this.onNotebookChangeMessage(msg); break;
          case 'close':  this.onNotebookCloseMessage(msg); break;
          case 'open': await this.onNotebookOpenMessage(msg); break;
          case 'useTool': this.onNotebookUseToolMessage(msg); break;
          default: assert(false); break;
        }
        break;
      default: assert(false); break;
    }
  }

  private onNotebookChangeMessage(msg: ClientNotebookChangeMessage): void {
    const watcher = this.notebookWatchers.get(msg.path)!;
    assert(watcher);
    watcher.onNotebookChangeMessage(msg);
  }

  private onNotebookCloseMessage(msg: ClientNotebookCloseMessage): void {
    this.closeNotebook(msg.path, false);
  }

  private async onNotebookOpenMessage(msg: ClientNotebookOpenMessage): Promise<void> {
    // REVIEW: Check that the open folder message is not a duplicate?
    const path = msg.path;
    assert(!this.notebookWatchers.get(path));
    try {
      const { watcher, obj } = await NotebookWatcher.open(this, msg);
      this.notebookWatchers.set(path, watcher);
      const response: ServerNotebookOpenedMessage = { type: 'notebook', operation: 'opened', path, obj };
      this.sendMessage(response);
    } catch(err) {
      reportError(err, `Error on notebook open message.`);
      const response: ServerErrorMessage = { requestId: msg.requestId, type: 'error', message: err.message };
      this.sendMessage(response);
      return;
    }
  }

  private onNotebookUseToolMessage(msg: ClientNotebookUseToolMessage): void {
    const watcher = this.notebookWatchers.get(msg.path)!;
    assert(watcher);
    watcher.onNotebookUseToolMessage(msg);
  }

  private onWsClose(_ws: WebSocket, code: number, reason: string): void {
    try {
      // Normal close appears to be code 1001, reason empty string.
      if (this.closeResolver) {
        debug(`Socket closed by server: ${code} '${reason}' ${this.notebookWatchers.size}`);
        this.closeResolver.resolve();
      } else {
        debug(`Socket closed by client: ${code} '${reason}' ${this.notebookWatchers.size}`);
        this.closeAllFolders(false);
        this.closeAllNotebooks(false);
      }
      ClientSocket.instanceMap.delete(this.id);
    } catch(err) {
      reportError(err, "Client Socket: Unexpected error handling web-socket close.");
    }
  }

  private onWsError(_ws: WebSocket, err: Error): void {
    try {
      reportError(err, "Client Socket: web socket error: ${this.id}.");
      // REVIEW: is the error recoverable? is the websocket closed? will we get a closed event?
    } catch(err) {
      reportError(err, "Client Socket: Unexpected error handling web-socket error.");
    }
  }

  private onWsMessage(_ws: WebSocket, message: WebSocket.Data): void {
    try {
      const msg: ClientMessage = JSON.parse(message.toString());
      this.onMessage(msg).catch(err=>{
        // REVIEW: How to handle this error?
        reportError(err, "Client Socket: unexpected asynchronous error handling web-socket message.");
      });
    } catch(err) {
      // REVIEW: How to handle this error?
      reportError(err, "Client Socket: unexpected synchronous error handling web-socket message.");
    }
  }

}

// Helper Classes

class FolderWatcher implements ServerFolderWatcher {

  // Public Class Methods

  public static async open(
    socket: ClientSocket,
    msg: ClientFolderOpenMessage
  ): Promise<{ watcher: FolderWatcher, obj: FolderObject }> {
    const watcher = new this(socket);
    const folder = watcher.folder = await ServerFolder.open(msg.path, { mustExist: true, watcher });
    const obj = folder.toJSON();
    return { watcher, obj };
  }

  // Public Instance Methods

  public close(): void {
    this.folder.close(this);
  }

  // ServerFolder Watcher Interface

  public onChanged(msg: ServerFolderChangedMessage): void {
    // ServerFolder is notifying us that the batch of changes is complete.
    this.socket.sendMessage(msg);
  }

  public onClosed(): void {
    // ServerFolder is notifying us that the folder is being closed on the server end.
    const msg: ServerFolderClosedMessage = { type: 'folder', operation: 'closed', path: this.folder.path };
    this.socket.sendMessage(msg);
    this.socket.removeFolderWatcher(this.folder.path);
    // TODO: Remove from folderWatchers?
  }

  public onMoved(msg: ServerFolderMovedMessage): void {
    this.socket.sendMessage(msg);
  }

  // Event Handlers

  public async onFolderChangeMessage(msg: ClientFolderChangeMessage): Promise<ServerFolderChangedMessage> {
    return await this.folder.onFolderChangeMessage(this, msg);
  }

  // --- PRIVATE ---

  // Private Constructor

  private constructor(socket: ClientSocket) {
    // this.folder assigned asynchronously in 'open'.
    this.socket = socket;
  }

  // Private Instance Properties

  private folder!: ServerFolder;
  private socket: ClientSocket;

}

class NotebookWatcher implements ServerNotebookWatcher {

  // Public Class Methods

  public static async open(
    socket: ClientSocket,
    msg: ClientNotebookOpenMessage
  ): Promise<{ watcher: NotebookWatcher, obj: NotebookObject }> {
    const watcher = new this(socket);
    const notebook = watcher.notebook = await ServerNotebook.open(msg.path, { mustExist: true, watcher });
    const obj = notebook.toJSON();
    return { watcher, obj };
  }

  // Public Instance Methods

  public close(): void {
    this.notebook.close(this);
  }

  // ServerNotebook Watcher Interface

  public onChanged(msg: ServerNotebookChangedMessage): void {
    // ServerFolder is notifying us that the batch of changes is complete.
    this.socket.sendMessage(msg);
  }

  public onClosed(): void {
    // ServerNotebook is notifying us that the folder is being closed on the server end.
    const msg: ServerNotebookClosedMessage = { type: 'notebook', operation: 'closed', path: this.notebook.path };
    this.socket.sendMessage(msg);
    this.socket.removeNotebookWatcher(this.notebook.path);
    // TODO: Remove from folderWatchers?
  }

  public onMoved(msg: ServerNotebookMovedMessage): void {
    this.socket.sendMessage(msg);
  }

  // Event Handlers

  public onNotebookChangeMessage(msg: ClientNotebookChangeMessage): void {
    // .requestChanges('USER', msg.changeRequests, options);
    this.notebook.onNotebookChangeMessage(this, msg);
  }

  public onNotebookUseToolMessage(msg: ClientNotebookUseToolMessage): void {
    // .requestChanges('USER', msg.changeRequests, options);
    this.notebook.onNotebookUseToolMessage(this, msg);
  }

  // --- PRIVATE ---

  // Private Constructor

  private constructor(socket: ClientSocket) {
    // this.folder assigned asynchronously in 'open'.
    this.socket = socket;
  }

  // Private Instance Properties

  private notebook!: ServerNotebook;
  private socket: ClientSocket;

}

// Helper Functions
