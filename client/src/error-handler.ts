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

// TODO: Rate limit errors so a bunch of errors don't overwhelm the display.
//       Could do it like the console in the browser where identical error messages just increment a number.

// TODO: Report errors to the server. Batch them up, and rate limit the reports.

// Requirements

import { Html } from "./dom";
import { messageDisplayInstance } from "./message-display";

// Types

export type AsyncListener<E extends Event> = (event: E)=>Promise<void>;
export type SyncListener<E extends Event> = (event: E)=>void;

// Constants

// Global Variables

// Exported Functions

export function addAsyncEventListener<E extends Event>(target: EventTarget, type: string, listener: AsyncListener<E>, message: Html): SyncListener<E> {
  // Returns the actual listener added, in case the caller wants to remove it later.
  // TODO: Type this so that callers don't have to specify the type of the event.
  //       It should be inferred from the type parameter.
  const wrappedListener = function(event: E): void {
    try { monitorPromise(listener(event), message); }
    catch (err) {reportError(err, message); }
  }
  target.addEventListener(type, </* TYPESCRIPT: */EventListener>wrappedListener);
  return wrappedListener;
}

export function addSyncEventListener<E extends Event>(target: EventTarget, type: string, listener: SyncListener<E>, message: Html): SyncListener<E> {
  // Returns the actual listener added, in case the caller wants to remove it later.
  // TODO: Type this so that callers don't have to specify the type of the event.
  //       It should be inferred from the type parameter.
  const wrappedListener = function(event: E): void {
    try { listener(event); }
    catch (err) { reportError(err, message); }
  }
  target.addEventListener(type, </* TYPESCRIPT: */EventListener>wrappedListener);
  return wrappedListener;
}

export function monitorPromise(promise: Promise<any>, message: Html): void {
  promise.catch(err=>reportError(err, message));
}

export function reportError(err: Error, message: Html): void {
  console.error(message);
  console.dir(err);
  // TODO: Report error to server.
  messageDisplayInstance.addErrorMessage(message, err);
}

