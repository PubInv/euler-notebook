/*
Euler Notebook
Copyright (C) 2019-21 Public Invention
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

import { Server } from "http";

import * as debug1 from "debug";
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

import { Request } from "express";
import * as WebSocket from "ws";

// TODO: Handle websocket lifecycle: closing, unexpected disconnects, errors, etc.
import { assert, ClientId, PromiseResolver, errorMessageForUser } from "./shared/common";
import { ClientRequest, } from "./shared/client-requests";
import { ServerResponse, ErrorResponse, } from "./shared/server-responses";

import { logError, logWarning } from "./error-handler";
import { ServerFolder } from "./server-folder";
import { ServerNotebook } from "./server-notebook";
import { clientMessageSynopsis, serverMessageSynopsis } from "./shared/debug-synopsis";
import { ServerUser } from "./server-user";


// Types

// Constants

// const CLOSE_TIMEOUT_IN_MS = 5000;

// Exported Class

export class ServerSocket {

  // Public Class Properties

  public static get allInstances(): IterableIterator<ServerSocket> {
    return this.instanceMap.values();
  }

  // Public Class Methods

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

  // Public Instance Properties

  public readonly clientId: ClientId;

  // Public Instance Property Functions

  public get user(): ServerUser|undefined { return this._user };

  // Public Instance Methods

  public close(code?: number, reason?: string): Promise<void> {
    // See https://github.com/Luka967/websocket-close-codes.
    // REVIEW: Can a close fail? That is, can we make a socket.close() call
    //         and never receive a 'close' event? (e.g. get 'error' event instead.)
    if (!this.closePromise) {
      if (this.socket.readyState != WebSocket.CLOSED) {
        // const notify = (this.socket.readyState == WebSocket.OPEN);
        ServerNotebook.onSocketClosed(this);
        ServerFolder.onSocketClosed(this);
        this.closePromise = new Promise((resolve, reject)=>{ this.closeResolver = { resolve, reject }; });
        if (this.socket.readyState != WebSocket.CLOSING) {
          debug(`Socket closing: ${this.clientId}`);
          this.socket.close(code, reason);
        } else {
          logWarning(MODULE, `Closing socket that is closing: ${this.clientId}.`)
        }
      } else {
        logWarning(MODULE , `Closing socket that is already closed: ${this.clientId}`)
        this.closePromise = Promise.resolve();
      }
    } else {
      // REVIEW: This may not be an error.
      logWarning(MODULE, `Repeat close call: ${this.clientId}`);
      return this.closePromise;
    }
    return this.closePromise;
  }

  public loginUser(user: ServerUser): void {
    assert(!this._user);
    this._user = user;
    ServerFolder.onSocketUserLogin(this);
    ServerNotebook.onSocketUserLogin(this);
  }

  public logoutUser(): void {
    console.log("SERVER SOCKET LOGOUT USER")
    assert(this._user);
    ServerFolder.onSocketUserLogout(this);
    ServerNotebook.onSocketUserLogout(this);
    this._user = undefined;
  }

  public sendMessage(msg: ServerResponse): void {
    debug(`Sent: ${this.clientId} ${serverMessageSynopsis(msg)}`);
    // console.dir(msg, { depth: null });
    const json = JSON.stringify(msg);
    try {
      // REVIEW: Should we check ws.readyState
      // REVIEW: Should we use the callback to see if the message went through?
      this.socket.send(json);
    } catch(err) {
      logError(err, "Error sending websocket message: ReadyState ${this.socket.readyState}");
    }
  }

  // --- PRIVATE ---

  // Private Class Properties

  private static instanceMap: Map<ClientId, ServerSocket> = new Map();

  // Private Class Methods

  private static async onConnection(ws: WebSocket, req: Request): Promise<void> {
    try {
      debug(`New connection: ${req.url}`);
      // TODO: Client generate ID and send it with connection.
      const clientId: ClientId = <ClientId>`C${Date.now()}`;
      const instance = new this(clientId, ws);
      this.instanceMap.set(clientId, instance);
    } catch(err) {
      logError(err, "Web Socket: unexpected error handling web-socket connection event.");
    }
  }

  // Private Constructor

  private constructor(id: ClientId, ws: WebSocket) {
    debug(`Constructor`)
    this.clientId = id;
    this.socket = ws;
    this._user = undefined;
    ws.on('close', (code: number, reason: string) => this.onSocketClose(ws, code, reason))
    ws.on('error', (err: Error) => this.onSocketError(ws, err))
    ws.on('message', (message: string) => this.onSocketMessage(ws, message));
  }

  // Private Instance Properties

  private closePromise?: Promise<void>;
  private closeResolver?: PromiseResolver<void>;
  private socket: WebSocket;
  private _user: ServerUser|undefined;

  // Private Instance Methods

  // Private Instance Event Handlers

  private async onClientRequest(msg: ClientRequest): Promise<void> {
    debug(`Recd: ${this.clientId} ${clientMessageSynopsis(msg)}`);
    switch(msg.type) {
      case 'folder': await ServerFolder.onClientRequest(this, msg); break;
      case 'notebook': await ServerNotebook.onClientRequest(this, msg); break;
      case 'user': await ServerUser.onClientRequest(this, msg); break;
      default: assert(false); break;
    }
  }

  private onSocketClose(_ws: WebSocket, code: number, reason: string): void {
    try {
      // Normal close appears to be code 1001, reason empty string.
      if (this.closeResolver) {
        debug(`Socket closed by server: ${code} '${reason}'`);
        this.closeResolver.resolve();
      } else {
        debug(`Socket closed by client: ${code} '${reason}'`);
        ServerFolder.onSocketClosed(this);
        ServerNotebook.onSocketClosed(this);
      }
      ServerSocket.instanceMap.delete(this.clientId);
    } catch(err) {
      logError(err, "Client Socket: Unexpected error handling web-socket close.");
    }
  }

  private onSocketError(_ws: WebSocket, err: Error): void {
    try {
      // TODO: What to do in this case? Close the connection?
      logError(err, "Client Socket: web socket error: ${this.id}.");
      // REVIEW: is the error recoverable? is the websocket closed? will we get a closed event?
    } catch(err) {
      logError(err, "Client Socket: Unexpected error handling web-socket error.");
    }
  }

  private onSocketMessage(_ws: WebSocket, message: WebSocket.Data): void {
    let msg: ClientRequest;
    try {
      msg = JSON.parse(message.toString());
    } catch(err) {
      logError(err, `Client Socket: invalid JSON in message received from client.`);
      return;
    }
    this.onClientRequest(msg).catch(err=>{
      logError(err, `Client Socket: unexpected error processing client ${msg.type}/${msg.operation} message.`);
      if (msg.requestId) {
        const response: ErrorResponse = {
          requestId: msg.requestId,
          type: 'error',
          message: errorMessageForUser(err),
          complete: true,
        };
        this.sendMessage(response);
      }
    });
  }

}
