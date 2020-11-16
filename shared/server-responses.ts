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

// TODO: Version the client/server API so if they get out of sync the user gets an error
//       message instead of a server or client crash.

// Requirements

import { RequestId, NotebookChangeRequest } from "./client-requests";
import { FolderObject, FolderPath, NotebookPath, FolderChange } from "./folder";
import { NotebookChange, NotebookObject } from "./notebook";

// Types

// Server Responses

export type ServerResponse = ErrorResponse|FolderResponse|NotebookResponse;
export interface ResponseBase {
  complete?: boolean;
  requestId?: RequestId; // REVIEW: Just 'id'?
}

export interface ErrorResponse extends ResponseBase {
  type: 'error',
  message: string,
}

export type FolderResponse =
  FolderChanged |
  FolderClosed |
  FolderOpened;
export interface FolderResponseBase extends ResponseBase {
  type: 'folder',
  path: FolderPath,
}
export interface FolderChanged extends FolderResponseBase {
  operation: 'changed';
  changes: FolderChange[];
}
export interface FolderClosed extends FolderResponseBase {
  operation: 'closed';
  reason: string;
}
export interface FolderOpened extends FolderResponseBase {
  operation: 'opened';
  obj: FolderObject;
}

export type NotebookResponse =
  NotebookChanged |
  NotebookClosed |
  NotebookOpened;
interface NotebookResponseBase extends ResponseBase {
  type: 'notebook',
  path: NotebookPath,
}
export interface NotebookChanged extends NotebookResponseBase {
  operation: 'changed';
  changes: NotebookChange[];
  undoChangeRequests?: NotebookChangeRequest[];
}
export interface NotebookClosed extends NotebookResponseBase {
  operation: 'closed';
  reason: string;
}
export interface NotebookOpened extends NotebookResponseBase {
  operation: 'opened';
  obj: NotebookObject;
}

