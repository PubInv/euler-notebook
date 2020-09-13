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

import { assert, Html, PromiseResolver, Timestamp, newPromiseResolver } from "./shared/common";
import { ClientMessage, ServerMessage, ServerMessageBase, RequestId } from "./shared/math-tablet-api";

import { messageDisplayInstance } from "./message-display";
import { ClientFolder } from "./client-folder";
import { ClientNotebook } from "./client-notebook";
import { reportError } from "./error-handler";

// Types

type ConnectResolver = PromiseResolver<ServerSocket>;
type RequestResolver = PromiseResolver<ServerMessage>;

// Class

export class ServerSocket {

  // Class Methods

  public static async connect(url: string): Promise<ServerSocket> {
    // REVIEW: Use newPromiseResolver?
    return new Promise((resolve, reject)=>{
      new ServerSocket(url, { resolve, reject });
    });
  }

  // Instance Properties

  // Instance Methods

  public generateRequestId(): RequestId {
    // REVIEW: Include user ID? client ID? browser ID?
    let ts = Date.now();
    if (ts <= this.lastRequestTimestamp) { ts = this.lastRequestTimestamp++; }
    return <RequestId>`r${ts.toString(16)}`;
  }

  public sendMessage(msg: ClientMessage): void {
    const json = JSON.stringify(msg);
    try {
      this.ws.send(json);
    } catch(err) {
      // REVIEW: What to do?
      console.error(`Server Socket: Error sending websocket message: ${this.ws.readyState} ${(<any>err).code} ${err.message}`)
    }
  }

  public sendRequest<T extends ServerMessageBase>(msg: ClientMessage): Promise<T> {
    // Review: ServerMessage subtype that has the messages that could be the response to a request?
    const requestId = msg.requestId = this.generateRequestId();
    const { promise, resolver } = newPromiseResolver<ServerMessage>();
    assert(!this.requestMap.has(requestId))
    this.requestMap.set(requestId, resolver);
    this.sendMessage(msg);
    return </* TYPESCRIPT: */Promise<T>><unknown>promise;
  }

  // -- PRIVATE --

  // Private Class Properties

  // Private Constructor

  private constructor(url: string, connectPromise: ConnectResolver) {
    this.connectPromise = connectPromise;
    this.lastRequestTimestamp = 0;
    this.requestMap = new Map();
    const ws = this.ws = new WebSocket(url);
    ws.addEventListener('close', (event: CloseEvent)=>this.onWsClose(event));
    ws.addEventListener('error', (event: Event)=>this.onWsError(event));
    ws.addEventListener('message', (event: MessageEvent)=>this.onWsMessage(event));
    ws.addEventListener('open', ()=>{ this.onWsOpen(); });
  }

  // Private Instance Properties

  private connectPromise: ConnectResolver;
  private lastRequestTimestamp: Timestamp;
  private requestMap: Map<RequestId, RequestResolver>;
  private ws: WebSocket;

  // Private Instance Methods

  // Private Event Handlers

  // See https://github.com/Luka967/websocket-close-codes.
  private onWsClose(event: CloseEvent): void {
    // For terminating server: code = 1006, reason = "";
    console.log(`Notebook Conn: socket closed: ${event.code} ${event.reason}`);
    // console.dir(event);
    messageDisplayInstance.addErrorMessage(<Html>`Socket closed by server. Refresh this page in your browser to reconnect.`);
    // LATER: Attempt to reconnect after a few seconds with exponential backoff.
  }

  private onWsError(_event: Event): void {
    console.error(`Notebook Conn: socket error.`);
    // console.dir(event);
    // REVIEW: Error info?
    this.connectPromise.reject(new Error(`Cannot connect to server.`));

    // REVIEW: Is the socket stull usable? Is the socket closed? Will we also get a close event?
    messageDisplayInstance.addErrorMessage(<Html>`Socket error. Refresh this page in your browser to reconnect.`);
  }

  private onWsMessage(event: MessageEvent): void {
    try {
      const msg: ServerMessage = JSON.parse(event.data);
      const requestId = msg.requestId;
      if (requestId && this.requestMap.has(requestId)) {
        const resolver = this.requestMap.get(requestId)!;
        this.requestMap.delete(requestId);
        if (msg.type != 'error') {
          resolver.resolve(msg);
        } else {
          resolver.reject(new Error(msg.message));
        }
      } else {
        // console.log(`Message from server: ${msg.type}`);
        // console.dir(msg);
        switch(msg.type) {
          // TODO: case 'error': errors should only come back from 'requests'
          case 'folder': ClientFolder.smMessage(msg); break;
          case 'notebook': ClientNotebook.smMessage(msg); break;
          default:
            console.error(`Unexpected server message type '${(<any>msg).type}' in WebSocket message`);
            break;
        }
      }
    } catch(err) {
      reportError(err, <Html>"Unexpected client error handling `WebSocket message event.");
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
}
