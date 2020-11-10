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

import { Html, PlainText } from "./common";
import { FolderObject, FolderPath, NotebookPath, FolderName, NotebookName, FolderChange } from "./folder";
import {
  StyleProperties, StyleId, NotebookChange, NotebookObject, StyleRelativePosition, WolframExpression
} from "./notebook";

// Types

export type ImageData = string;
export type MthMtcaData = string;
export type RequestId = '{RequestId}';
export type Symbol = string;
export type TexExpression = '{TexExpression}';

export interface SymbolData {
  name: string;
  value?: string;
}

export interface SymbolTable {
  [symbol: string]: SymbolConstraints;
}

export type SymbolConstraint = WolframExpression;
export type SymbolConstraints = SymbolConstraint[];

// Just the name of the notebook, no .mtnb extension.

// MyScript Types

export type ToolName = string;
export interface ToolData {
  name: ToolName;
  // REVIEW: This is a sum type, not a product type.
  //         i.e. we use either the html field or the tex field but never both.
  html?: Html;
  tex?: TexExpression;
  data?: any; // Black-box info that gets passed back to tool creator when tool is used.
  origin_id?: number;
}

export interface TransformationToolData {
  transformation: WolframExpression;
  output: WolframExpression;
  transformationName: string;
}

export interface StylePropertiesWithSubprops extends StyleProperties {
  subprops?: StylePropertiesWithSubprops[]; // TODO: rename subprops=>substyles.
  exclusiveChildTypeAndRole?: boolean;     // only one style of
    // that type and meaning should exist for the parent. If this is added
    // at the time the insertion request is made, the code to do the insertion
    // should automatically remove all other such instances
}

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
  InsertCellRequest|
  KeyboardInputRequest|
  MoveCellRequest|
  StylusInputRequest;
export interface DeleteCellRequest {
  type: 'deleteCell';
  styleId: StyleId;
}
export interface InsertCellRequest {
  type: 'insertCell';
  afterId?: StyleRelativePosition;
  parentId?: StyleId; // undefined or 0 means top-level.
  // TODO: rename styleProps => props
  styleProps: StylePropertiesWithSubprops;
  // type: 'insertCell';
  // cellType: CellType;
  // inputType: InputType;
  // afterId: StyleRelativePosition;
}
export interface KeyboardInputRequest {
  type: 'keyboardInputChange';
  cellId: StyleId;
  start: number;          // 0-based index of first character to replace.
  end: number;            // 0-based index of character after last character to replace.
  replacement: PlainText; // Replacement text.
  value: PlainText;          // Full value of input text, may be able to eliminate.
}
export interface MoveCellRequest {
  type: 'moveCell';
  styleId: StyleId;
  afterId: StyleRelativePosition;
}
export interface StylusInputRequest {
  type: 'stylusInputChange';
  cellId: StyleId;
  // TODO: Stroke insert or delete info.
}

// Messages from the server

export interface ServerMessageBase {
  complete?: boolean;
  requestId?: RequestId; // REVIEW: Just 'id'?
}

export interface ServerErrorMessage extends ServerMessageBase {
  type: 'error',
  message: string,
}

export interface ServerFolderMessageBase extends ServerMessageBase {
  type: 'folder',
  path: FolderPath,
}
export interface ServerFolderChangedMessage extends ServerFolderMessageBase {
  operation: 'changed';
  changes: FolderChange[];
}
export interface ServerFolderClosedMessage extends ServerFolderMessageBase {
  operation: 'closed';
  reason: string;
}
export interface ServerFolderOpenedMessage extends ServerFolderMessageBase {
  operation: 'opened';
  obj: FolderObject;
}

interface ServerNotebookMessageBase extends ServerMessageBase {
  type: 'notebook',
  path: NotebookPath,
}
export interface ServerNotebookChangedMessage extends ServerNotebookMessageBase {
  operation: 'changed';
  changes: NotebookChange[];
  undoChangeRequests?: NotebookChangeRequest[];
}
export interface ServerNotebookClosedMessage extends ServerNotebookMessageBase {
  operation: 'closed';
  reason: string;
}
export interface ServerNotebookOpenedMessage extends ServerNotebookMessageBase {
  operation: 'opened';
  obj: NotebookObject;
}

export type ServerFolderMessage = ServerFolderChangedMessage|ServerFolderClosedMessage|ServerFolderOpenedMessage;
export type ServerNotebookMessage = ServerNotebookChangedMessage|ServerNotebookClosedMessage|ServerNotebookOpenedMessage;
export type ServerMessage = ServerErrorMessage|ServerFolderMessage|ServerNotebookMessage;

// Messages from the client

interface ClientMessageBase {
  requestId?: RequestId; // TYPESCRIPT: always added on at the end before sending. How to capture this?
}

interface ClientFolderMessageBase extends ClientMessageBase {
  type: 'folder';
  path: FolderPath;
}
export interface ClientFolderChangeMessage extends ClientFolderMessageBase {
  operation: 'change';
  changeRequests: FolderChangeRequest[];
}
export interface ClientFolderCloseMessage extends ClientFolderMessageBase {
  operation: 'close';
}
export interface ClientFolderOpenMessage extends ClientFolderMessageBase {
  operation: 'open';
}

interface ClientNotebookMessageBase extends ClientMessageBase {
  type: 'notebook';
  path: NotebookPath;
}
export interface ClientNotebookChangeMessage extends ClientNotebookMessageBase {
  operation: 'change';
  changeRequests: NotebookChangeRequest[];
}
export interface ClientNotebookCloseMessage extends ClientNotebookMessageBase {
  operation: 'close';
}
export interface ClientNotebookOpenMessage extends ClientNotebookMessageBase {
  operation: 'open';
}
export interface ClientNotebookUseToolMessage extends ClientNotebookMessageBase {
  operation: 'useTool';
  styleId: StyleId;
}


export type ClientFolderMessage = ClientFolderChangeMessage|ClientFolderCloseMessage|ClientFolderOpenMessage;
export type ClientNotebookMessage = ClientNotebookChangeMessage|ClientNotebookCloseMessage|ClientNotebookOpenMessage|ClientNotebookUseToolMessage;
export type ClientMessage = ClientFolderMessage|ClientNotebookMessage;

// API Calls

export interface DebugParams {
  // /api/debug post JSON params
  notebookPath: NotebookPath;
  styleId?: StyleId;
}

export interface DebugResults {
  // /api/debug JSON return value
  html: string;
}

// Other

export interface NameValuePair {
  name: string;
  value: string;
}

// REVIEW: Belongs somewhere else
export function isEmptyOrSpaces(str: string) : boolean{
  return str === null || str.match(/^ *$/) !== null;
}
