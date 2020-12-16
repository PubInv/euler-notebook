/*
Math Tablet
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

// TODO: Rate limit errors so a bunch of errors don't overwhelm the display.
//       Could do it like the console in the browser where identical error messages just increment a number.

// TODO: Report errors to the server. Batch them up, and rate limit the reports.

// Requirements

import { ExpectedError, Html, PlainText } from "./shared/common";

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
    catch (err) {showError(err, message); }
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
    catch (err) { showError(err, message); }
  }
  target.addEventListener(type, </* TYPESCRIPT: */EventListener>wrappedListener);
  return wrappedListener;
}

export function logError(err: Error, message?: string): void {
  // Makes a record of the error.
  // If the error might be an ExpectedError, then call logErrorIfUnexpected instead.
  // Currently it just writes the error to the browser console.
  // In the future, this may send the error to the server.
  // It does not display anything to the user.
  // If you also want the error displayed to the user, call reportError instead.
  // LATER: Send error to server.
  // LATER: console.dir does not use the sourcemap to interpret the stack trace.
  //        How do we get it to do that?

  if (message) { console.error(message); }
  // Uncomment the following line to see interpreted stack trace:
  //   throw err;
  console.dir(err);
}

export function logErrorIfUnexpected(err: Error, message?: string): void {
  // Makes a record of the error if it is not an instance of ExpectedError.
  if (err instanceof ExpectedError) { return; }
  logError(err, message);
}

export function logWarning(message: string): void {
  console.warn(message);
}

export function monitorPromise(promise: Promise<any>, message: Html): void {
  promise.catch(err=>showError(err, message));
}

export function showError(err: Error, message?: Html): void {
  // Shows the error to the user, and logs it if appropriate.
  logErrorIfUnexpected(err, /* BUGBUG */<PlainText>message);
  messageDisplayInstance.addError(err, message);
}
