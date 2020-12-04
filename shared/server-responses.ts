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

import { CellId, CellObject } from "./cell";
import { RequestId, NotebookChangeRequest } from "./client-requests";
import { CssSize } from "./common";
import { FolderObject, FolderPath, NotebookPath, FolderEntry, FolderName, NotebookEntry, NotebookName } from "./folder";
import { NotebookObject } from "./notebook";
import { StrokeId, Stroke } from "./stylus";

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
  FolderClosed |
  FolderOpened |
  FolderUpdated;
export interface FolderResponseBase extends ResponseBase {
  type: 'folder',
  path: FolderPath,
}
export interface FolderClosed extends FolderResponseBase {
  operation: 'closed';
  reason: string;
}
export interface FolderOpened extends FolderResponseBase {
  operation: 'opened';
  obj: FolderObject;
}
export interface FolderUpdated extends FolderResponseBase {
  operation: 'updated';
  updates: FolderUpdate[];
}

export type NotebookResponse =
  NotebookUpdated |
  NotebookClosed |
  NotebookOpened;
interface NotebookResponseBase extends ResponseBase {
  type: 'notebook',
  path: NotebookPath,
}
export interface NotebookClosed extends NotebookResponseBase {
  operation: 'closed';
  reason: string;
}
export interface NotebookOpened extends NotebookResponseBase {
  operation: 'opened';
  obj: NotebookObject;
}
export interface NotebookUpdated extends NotebookResponseBase {
  operation: 'updated';
  updates: NotebookUpdate[];
  undoChangeRequests: NotebookChangeRequest[];
}

// Folder Updates

export type FolderUpdate = FolderCreated|FolderDeleted|FolderRenamed|NotebookCreated|NotebookDeleted|NotebookRenamed;
export interface FolderCreated {
  type: 'folderCreated';
  entry: FolderEntry;
}
export interface FolderDeleted {
  type: 'folderDeleted';
  entry: FolderEntry;
}
export interface FolderRenamed {
  type: 'folderRenamed';
  entry: FolderEntry;
  oldName: FolderName;
}
export interface NotebookCreated {
  type: 'notebookCreated';
  entry: NotebookEntry;
}
export interface NotebookDeleted {
  type: 'notebookDeleted';
  entry: NotebookEntry;
}
export interface NotebookRenamed {
  type: 'notebookRenamed';
  entry: NotebookEntry;
  oldName: NotebookName;
}

// Notebook Updates

export type NotebookUpdate = CellDeleted | CellInserted | CellMoved | CellResized | StrokeInserted | StrokeDeleted;
export interface CellDeleted {
  type: 'cellDeleted';
  cellId: CellId;
}
export interface CellInserted {
  type: 'cellInserted';
  cellObject: CellObject;
  cellIndex: number;
}
export interface CellMoved {
  type: 'cellMoved';
  cellId: CellId;
  newIndex: number; // After cell is removed from its existing position, this is the index of where it should be inserted.
}
export interface CellResized {
  type: 'cellResized';
  cellId: CellId;
  cssSize: CssSize;
}
export interface StrokeDeleted {
  type: 'strokeDeleted';
  cellId: CellId;
  strokeId: StrokeId;
}
export interface StrokeInserted {
  type: 'strokeInserted';
  cellId: CellId;
  stroke: Stroke;
}
