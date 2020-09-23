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

// Requirements

// Types

export type CssClass = '{CssClass}';
export type Html = '{Html}';
export type Milliseconds = number;  // Time interval in milliseconds.
export type PlainText = '{PlainText}';
export type SvgMarkup = '{SvgMarkup}';
export type Timestamp = number;     // Number of milliseconds since Jan 1, 1970 as returned by Date.now().

// REVIEW: This is also defined in server/common.ts.
export interface PromiseResolver<T> {
  resolve: (s: T)=>void;
  reject: (err: Error)=>void
}

// Constants

const ASSERTION_FAILED_MSG = "Assertion failed.";

// Exported Functions

export function assert(value: any, message?: string): void {
  if (!value) { throw new Error(message || ASSERTION_FAILED_MSG); }
}

export function assertFalse( message?: string): never {
  throw new Error(message || ASSERTION_FAILED_MSG);
}

export function errorMessageForUser(err: Error): Html {
  return <Html>(err instanceof ExpectedError ? err.message : "An unexpected error occurred.");
}

export function newPromiseResolver<T>(): { promise: Promise<T>, resolver: PromiseResolver<T> } {
  let resolver: PromiseResolver<T>;
  const promise = new Promise<T>((resolve, reject)=>{ resolver = { resolve, reject }; });
  // @ts-expect-error   // Expect "Variable 'rval' is used before being assigned."
  return { promise, resolver };
}

export function notImplemented(): never {
  throw new Error("Not implemented.");
}

export function sleep(ms: Milliseconds): Promise<void> {
  return new Promise<void>(resolve=>setTimeout(resolve, ms));
}

export function stackTrace(): string {
  let rval: string;
  try { throw new Error('StackTrace'); }
  catch(err) { rval = err.stack; }
  return rval;
}

// Exported Classes

export class ExpectedError extends Error {
  // An "expected error" is one that we anticipated could occur, and has a
  // useful error message for the user.
  // Also, if you catch an expected error you can assume that it has already
  // been reported to the error logging system or does not need to be logged.
  constructor(message: string) {
    super(message);
  }
}
