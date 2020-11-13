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

import { CellId, CellRelativePosition, CellObject } from "./cell";
import { PlainText } from "./common";
import { FolderPath, NotebookPath, FolderName, NotebookName } from "./folder";
import { Stroke, StrokeId, StrokeRelativePosition } from "./stylus";

// Types

export type RequestId = '{RequestId}';

// Folder Change Requests

export type FolderChangeRequest =
  FolderCreateRequest|
  FolderDeleteRequest|
  FolderRenameRequest|
  NotebookCreateRequest|
  NotebookDeleteRequest|
  NotebookRenameRequest;
export interface FolderCreateRequest {
  type: 'createFolder';
  name: FolderName;
}
export interface FolderDeleteRequest {
  type: 'deleteFolder';
  name: FolderName;
}
export interface FolderRenameRequest {
  type: 'renameFolder';
  name: FolderName;
  newName: FolderName;
}
export interface NotebookCreateRequest {
  type: 'createNotebook';
  name: NotebookName;
}
export interface NotebookDeleteRequest {
  type: 'deleteNotebook';
  name: NotebookName;
}
export interface NotebookRenameRequest {
  type: 'renameNotebook';
  name: NotebookName;
  newName: NotebookName;
}

// Notebook Change Requests

export type NotebookChangeRequest =
  DeleteCellRequest|
  DeleteStrokeRequest|
  InsertCellRequest<any>|
  InsertStrokeRequest|
  KeyboardInputRequest|
  MoveCellRequest;
export interface DeleteCellRequest {
  type: 'deleteCell';
  cellId: CellId;
}
export interface DeleteStrokeRequest {
  type: 'deleteStroke';
  cellId: CellId;
  strokeId: StrokeId;
}
export interface InsertCellRequest<T extends CellObject> {
  type: 'insertCell';
  afterId: CellRelativePosition;
  cellObject: T;
}
export interface InsertStrokeRequest {
  type: 'insertStroke';
  cellId: CellId;
  stroke: Stroke;
  afterId: StrokeRelativePosition;
}
export interface KeyboardInputRequest {
  type: 'keyboardInputChange';
  cellId: CellId;
  start: number;          // 0-based index of first character to replace.
  end: number;            // 0-based index of character after last character to replace.
  replacement: PlainText; // Replacement text.
  value: PlainText;          // Full value of input text, may be able to eliminate.
}
export interface MoveCellRequest {
  type: 'moveCell';
  cellId: CellId;
  afterId: CellRelativePosition;
}
export interface RemoveStrokeRequest {
  type: 'removedStroke';
  cellId: CellId;
  strokeId: StrokeId;
}


// Messages from the client

export type ClientRequest = FolderRequest|NotebookRequest;
interface RequestBase {
  requestId?: RequestId; // TYPESCRIPT: always added on at the end before sending. How to capture this?
}

export type FolderRequest =
  ClientFolderChangeMessage |
  FolderCloseRequest |
  FolderOpenRequest;
interface FolderRequestBase extends RequestBase {
  type: 'folder';
  path: FolderPath;
}
export interface ClientFolderChangeMessage extends FolderRequestBase {
  operation: 'change';
  changeRequests: FolderChangeRequest[];
}
export interface FolderCloseRequest extends FolderRequestBase {
  operation: 'close';
}
export interface FolderOpenRequest extends FolderRequestBase {
  operation: 'open';
}

export type NotebookRequest =
  ClientNotebookChangeMessage |
  NotebookCloseRequests |
  NotebookOpenRequest |
  NotebookUseToolRequest;
interface NotebookRequestBase extends RequestBase {
  type: 'notebook';
  path: NotebookPath;
}
export interface ClientNotebookChangeMessage extends NotebookRequestBase {
  operation: 'change';
  changeRequests: NotebookChangeRequest[];
}
export interface NotebookCloseRequests extends NotebookRequestBase {
  operation: 'close';
}
export interface NotebookOpenRequest extends NotebookRequestBase {
  operation: 'open';
}
export interface NotebookUseToolRequest extends NotebookRequestBase {
  operation: 'useTool';
  cellId: CellId;
}

