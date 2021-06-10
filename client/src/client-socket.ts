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

// TODO: A more symmetric approach would be for notebooks to emit events,
//       the server socket listens for the events and passes them as messages to the server.

// Requirements

import * as debug1 from "debug";
const debug = debug1('client:client-socket');

import { assert, Html, PromiseResolver, Timestamp, newPromiseResolver, assertFalse } from "./shared/common";
import { ExpectedError } from "./shared/expected-error";
import { clientMessageSynopsis, serverMessageSynopsis } from "./shared/debug-synopsis";
import { ClientRequest, RequestId } from "./shared/client-requests";
import { ResponseBase, ServerResponse, } from "./shared/server-responses";

import { ClientFolder } from "./models/client-folder";
import { ClientNotebook } from "./models/client-notebook";
import { showError, showErrorMessage } from "./user-message-dispatch";
import { ClientUser } from "./client-user";
import { errorTemplateForCode } from "./error-messages";

// Types

type ConnectResolver = PromiseResolver<ClientSocket>;
type RequestResolver = PromiseResolver<ServerResponse[]>;

interface RequestInfo {
  resolver: RequestResolver;
  intermediateResults?: ServerResponse[];
}

// Class

export class ClientSocket {

  // Class Methods

  public static async connect(url: string): Promise<ClientSocket> {
    // REVIEW: Use newPromiseResolver?
    return new Promise((resolve, reject)=>{
      new ClientSocket(url, { resolve, reject });
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

  public sendMessage(msg: ClientRequest): void {
    debug(`Sent: ${clientMessageSynopsis(msg)}`)
    const json = JSON.stringify(msg);
    try {
      this.ws.send(json);
    } catch(err) {
      // REVIEW: What to do?
      showError(err, <Html>"Error sending websocket message");
    }
  }

  public sendRequest<T extends ResponseBase>(msg: ClientRequest): Promise<T[]> {
    // REVIEW: ServerMessage subtype that has the messages that could be the response to a request?
    const requestId = msg.requestId = this.generateRequestId();
    const { promise, resolver } = newPromiseResolver<T[]>();
    assert(!this.requestMap.has(requestId));
    const info: RequestInfo = {
      resolver: <RequestResolver></* TYPESCRIPT: */unknown>resolver
    };
    this.requestMap.set(requestId, info);
    this.sendMessage(msg);
    return promise;
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
    ws.addEventListener('open', (event)=>{ this.onWsOpen(event); });
  }

  // Private Instance Properties

  private connectPromise: ConnectResolver;
  private lastRequestTimestamp: Timestamp;
  private requestMap: Map<RequestId, RequestInfo>;
  private ws: WebSocket;

  // Private Instance Methods

  // Private Instance Event Handlers

  // See https://github.com/Luka967/websocket-close-codes.
  private onWsClose(event: CloseEvent): void {
    // For terminating server: code = 1006, reason = "";
    debug(`Socket closed: ${event.code} ${event.reason}`);
    // console.dir(event);
    showErrorMessage(<Html>`Socket closed by server. Refresh this page in your browser to reconnect.`);
    // LATER: Attempt to reconnect after a few seconds with exponential backoff.
  }

  private onWsError(event: Event): void {
    debug(`Socket error`);
    console.error("Socket error:");
    console.dir(event);
    // console.dir(event);
    // REVIEW: Error info?
    this.connectPromise.reject(new Error(`Cannot connect to server.`));

    // REVIEW: Is the socket stull usable? Is the socket closed? Will we also get a close event?
    showErrorMessage(<Html>`Socket error. Refresh this page in your browser to reconnect.`);
  }

  private onWsMessage(event: MessageEvent): void {
    // REVIEW: Other clients will not get message if one client set a request ID.
    try {
      const msg: ServerResponse = JSON.parse(event.data);
      debug(`Recd: ${serverMessageSynopsis(msg)}`);

      const requestId = msg.requestId;
      const requestInfo = requestId && this.requestMap.get(requestId)!;
      const ownRequest = !!requestInfo; // True if our own request initiated this response.

      // Dispatch the messages.
      // console.dir(msg);
      switch(msg.type) {
        // TODO: case 'error': errors should only come back from 'requests'
        case 'folder': ClientFolder.onServerResponse(msg, ownRequest); break;
        case 'notebook': ClientNotebook.onServerResponse(msg, ownRequest); break;
        case 'user': ClientUser.onServerResponse(msg, ownRequest); break;
        case 'error': {
          if (requestInfo) {
            // Do nothing.
            // The request promise will be rejected below and the requestor will handle the error.
          } else {
            // An error from the server that we were not expecting.
            // Display it to the user.
            const message = errorTemplateForCode(msg.code)
            showErrorMessage(message);
          }
          break;
        }
        default: assertFalse();
      }

      // If this is a response to one of our requests, then accumulate the results,
      // and resolve the request promise if the results are complete.
      if (requestInfo) {
        if (msg.type != 'error') {
          // Message is not an error.
          if (msg.complete) {
            // Response is complete.
            // Resolve the request promise.
            if (!requestInfo.intermediateResults) {
              requestInfo.resolver.resolve([msg]);
            } else {
              requestInfo.intermediateResults.push(msg);
              requestInfo.resolver.resolve(requestInfo.intermediateResults);
            }
            this.requestMap.delete(requestId!);
          } else {
            // Response is incomplete.
            // Accumulate the results.
            if (!requestInfo.intermediateResults) {
              requestInfo.intermediateResults = [ msg ];
            } else {
              requestInfo.intermediateResults.push(msg);
            }
          }
        } else {
          // Message is an error.
          // Reject the request promise.
          requestInfo.resolver.reject(new ExpectedError(msg.code, msg.info));
          this.requestMap.delete(requestId!);
        }
      }

    } catch(err) {
      showError(err, <Html>"Unexpected client error handling WebSocket message event.");
    }
  }

  private onWsOpen(_event: Event): void {
    debug(`Socket opened.`);
    try {
      this.connectPromise.resolve(this);
    } catch(err) {
      showError(err, <Html>"Unexpected error handling WebSocket open");
    }
  }
}
