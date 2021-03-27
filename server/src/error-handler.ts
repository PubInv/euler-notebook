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

// TODO: Convert all console.error calls to reportError calls.

// Requirements

import { ExpectedError } from "./shared/common";

// Exported Functions

export function logError(/* TODO: component, */ err: Error, message?: string /* TYPESCRIPT: Html type? */): void {
  if (err instanceof ExpectedError) { return; }
  console.error(message || err.message);
  console.dir(err);
}

export function logWarning(module: string, message: string): void {
  console.warn(`WARNING: ${module}: ${message}`);
}

export function monitorPromise(promise: Promise<void>, message: string): void {
  promise.catch(err=>logError(err, message));
}
