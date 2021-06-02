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

// TODO: Version the client/server API so if they get out of sync the user gets an error
//       message instead of a server or client crash.

// Requirements

import { CellId, CellObject, CellRelativePosition } from "./cell";
import { RequestId, NotebookChangeRequest } from "./client-requests";
import { ClientId, JsonObject, PlainText, SessionToken } from "./common";
import { CssSize } from "./css";
import { Code as ErrorCode } from "./expected-error";
import { FigureObject } from "./figure";
import { FolderObject, FolderPath, NotebookPath, FolderEntry, FolderName, NotebookEntry, NotebookName } from "./folder";
import { FormulaObject } from "./formula";
import { ImageInfo, PositionInfo as ImagePositionInfo } from "./image-cell";
import { NotebookObject } from "./notebook";
import { UserPermissions } from "./permissions";
import { StrokeId, Stroke, StrokeData } from "./stylus";
import { SuggestionId, SuggestionObject } from "./suggestions";
import { CollaboratorObject, UserObject } from "./user";

// Supporting Types

// Server Responses

export type ServerResponse = ErrorResponse | FolderResponse | NotebookResponse | UserResponse;
export interface ResponseBase {
  complete?: boolean;
  requestId?: RequestId; // REVIEW: Just 'id'?
}

export interface ErrorResponse extends ResponseBase {
  type: 'error',
  code: ErrorCode,
  info?: JsonObject,
}

export type FolderResponse = FolderClosed | FolderCollaboratorConnected | FolderCollaboratorDisconnected | FolderOpened | FolderUpdated;
export interface FolderResponseBase extends ResponseBase {
  type: 'folder',
  path: FolderPath,
}
export interface FolderCollaboratorConnected extends FolderResponseBase {
  operation: 'collaboratorConnected';
  obj: CollaboratorObject;
}
export interface FolderCollaboratorDisconnected extends FolderResponseBase {
  operation: 'collaboratorDisconnected';
  clientId: ClientId;
}
export interface FolderClosed extends FolderResponseBase {
  operation: 'closed';
  reason: string;
}
export interface FolderOpened extends FolderResponseBase {
  operation: 'opened';
  collaborators: CollaboratorObject[];
  permissions: UserPermissions;
  obj: FolderObject;
}
export interface FolderUpdated extends FolderResponseBase {
  operation: 'updated';
  updates: FolderUpdate[];
}

export type NotebookResponse =
              NotebookClosed |
              NotebookCollaboratorConnected |
              NotebookCollaboratorDisconnected |
              NotebookOpened |
              NotebookUpdated;
interface NotebookResponseBase extends ResponseBase {
  type: 'notebook',
  path: NotebookPath,
}
export interface NotebookClosed extends NotebookResponseBase {
  operation: 'closed';
  reason: string;
}
export interface NotebookCollaboratorConnected extends NotebookResponseBase {
  operation: 'collaboratorConnected';
  obj: CollaboratorObject;
}
export interface NotebookCollaboratorDisconnected extends NotebookResponseBase {
  operation: 'collaboratorDisconnected';
  clientId: ClientId;
}
export interface NotebookOpened extends NotebookResponseBase {
  operation: 'opened';
  collaborators: CollaboratorObject[];
  permissions: UserPermissions;
  obj: NotebookObject;
}
export interface NotebookUpdated extends NotebookResponseBase {
  operation: 'updated';
  updates: NotebookUpdate[];
  undoChangeRequests: NotebookChangeRequest[];
}

export type UserResponse = UserLoggedIn | UserLoggedOut;
export interface UserResponseBase extends ResponseBase {
  type: 'user',
}
export interface UserLoggedIn extends UserResponseBase {
  operation: 'loggedIn';
  obj: UserObject;
  sessionToken: SessionToken;
}
export interface UserLoggedOut extends UserResponseBase {
  operation: 'loggedOut';
  // REVIEW: Include userName for verification?
}

// Folder Updates

export type FolderUpdate =
              FolderCreated |
              FolderDeleted |
              FolderRenamed |
              NotebookCreated |
              NotebookDeleted |
              NotebookRenamed;
export interface FolderCreated {
  type: 'folderCreated';
  entry: FolderEntry;
}
export interface FolderDeleted {
  type: 'folderDeleted';
  name: FolderName;
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
  name: NotebookName;
}
export interface NotebookRenamed {
  type: 'notebookRenamed';
  entry: NotebookEntry;
  oldName: NotebookName;
}

// Notebook Updates

export type NotebookUpdate =
              CellDeleted |
              CellInserted |
              CellMoved |
              CellResized |
              FigureTypeset |
              FormulaTypeset |
              ImageChanged |
              ImagePositionChanged |
              StrokeInserted |
              StrokeDeleted |
              SuggestionAdded |
              SuggestionRemoved |
              TextTypeset;
export interface CellDeleted {
  type: 'cellDeleted';
  cellId: CellId;
}
export interface CellInserted {
  type: 'cellInserted';
  cellObject: CellObject;
  afterId: CellRelativePosition;
}
export interface CellMoved {
  type: 'cellMoved';
  cellId: CellId;
  afterId: CellRelativePosition;
}
export interface CellResized {
  type: 'cellResized';
  cellId: CellId;
  cssSize: CssSize;
}
export interface FigureTypeset {
  type: 'figureTypeset';
  cellId: CellId;
  figure: FigureObject;
  strokeData: StrokeData;
}
export interface FormulaTypeset {
  type: 'formulaTypeset';
  cellId: CellId;
  formula: FormulaObject;
  strokeData: StrokeData;
}
export interface ImageChanged {
  type: 'imageChanged';
  cellId: CellId;
  imageInfo?: ImageInfo;
  positionInfo?: ImagePositionInfo;
}
export interface ImagePositionChanged {
  type: 'imagePositionChanged';
  cellId: CellId;
  positionInfo: ImagePositionInfo;
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
export interface SuggestionAdded {
  type: 'suggestionAdded';
  cellId: CellId;
  suggestionObject: SuggestionObject;
}
export interface SuggestionRemoved {
  type: 'suggestionRemoved';
  cellId: CellId;
  suggestionId: SuggestionId;
}
export interface TextTypeset {
  type: 'textTypeset';
  cellId: CellId;
  text: PlainText;
  strokeData: StrokeData;
}
