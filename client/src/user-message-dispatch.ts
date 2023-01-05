/*
Euler Notebook
Copyright (C) 2021 Public Invention
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

import { logErrorIfUnexpected, logWarning } from "./error-handler";
import { errorMessageForUser } from "./error-messages";
import { ElementId, Html, PlainText } from "./shared/common";

// Types

export enum Level {
  Error = 0,
  Warning = 1,
  Success = 2,
  Debug = 3,
}

export interface Options {
  autoDismiss?: boolean;
  dontLog?: boolean;
}

export interface Info {
  level: Level,
  html: Html,
  options?: Options,
}

// Constants

export const ELEMENT_ID = <ElementId>"messageDisplay";
export const EVENT_NAME = 'showMessage';

// Exported Functions

export function monitorPromise(promise: Promise<any>, html: Html): void {
  promise.catch(err=>showError(err, html));
}

export function showDebugMessage(html: Html, options?: Options): void {
  showMessage({ level: Level.Debug, html: html, options })
}

export function showErrorMessage(html: Html, options?: Options): void {
  showMessage({ level: Level.Error, html: html, options })
}

export function showError(errorOfUnknownType: any, html: Html, options?: Options): void {
  // Shows the error to the user, and logs it if appropriate.
  // TODO: Give some information about error of unknown type.
  const err = (errorOfUnknownType instanceof Error) ? errorOfUnknownType : new Error("Error thrown that is not of type Error.");
  logErrorIfUnexpected(err, /* TODO: Html->PlainText??? */<PlainText>html);
  const html2 = <Html>`${html}: ${errorMessageForUser(err)}`;
  const info: Info = { level: Level.Error, html: html2, options };
  showMessage(info);
}

export function showWarningMessage(html: Html, options?: Options): void {
  if (!options || !options.dontLog) {
    logWarning(/* TODO: Html->PlainText??? */<PlainText>html);
  }
  showMessage({ level: Level.Warning, html, options })
}

export function showSuccessMessage(html: Html, options?: Options): void {
  showMessage({ level: Level.Success, html, options })
}

// Helper Function

function showMessage(info: Info): void {
  // To avoid circular dependencies on high-level error display code
  // we dispatch the error as a custom event, which is listened for
  // in the approprate place.
  const event = new CustomEvent(EVENT_NAME, { detail: info });
  const $elt = document.getElementById(ELEMENT_ID);
  if (!$elt) {
    logWarning(<PlainText>`Cannot find #messageDisplay element for message.`);
    return;
  }
  $elt.dispatchEvent(event);
}
