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

import { RelationshipProperties, StyleProperties, StyleId, NotebookChange, NotebookObject, StyleRelativePosition } from './notebook.js';

// Types

export type ImageData = string;
export type LatexData = string;
export type MathMlData = string;
export type MthMtcaData = string;
export type SvgData = string;
export type PngData = Buffer;
export type Symbol = string;
export type TextData = string;
export type Tracker = string; // Tracking identifier supplied by the client.
export type WolframData = string;

export interface SymbolData {
  name: string;
  value?: string;
}

// Just the name of the notebook, no .mtnb extension.
export type NotebookName = string;

// Notebook paths are a FolderPath (see server/files-and-folders.ts) followed by a NotebookName,
// then a '.mtnb' extension, and a slash.
// Note that we always use forward slash, even on Windows where the filesystem
// separator is a backslash.
export type NotebookPath = string;


// MyScript Types

export type ToolName = string;
export interface ToolInfo {
  name: ToolName;
  // REVIEW: This is a sum type, not a product type.
  //         i.e. we use either the html field or the tex field but never both.
  html?: /* TYPESCRIPT: Html? */ string;
  tex?: LatexData;
  data?: any; // Black-box info that gets passed back to tool creator when tool is used.
}

export interface RelationshipPropertiesMap {
  [id: /* StyleId */number]: RelationshipProperties;
}

export interface StylePropertiesWithSubprops extends StyleProperties {
  subprops?: StylePropertiesWithSubprops[]; // TODO: rename subprops=>substyles.
  relationsTo?: RelationshipPropertiesMap;
  relationsFrom?: RelationshipPropertiesMap;
  exclusiveChildTypeAndRole?: boolean;     // only one style of
    // that type and meaning should exist for the parent. If this is added
    // at the time the insertion request is made, the code to do the insertion
    // should automatically remove all other such instances
}

// Notebook Change Requests

export type NotebookChangeRequest =
  RelationshipDeleteRequest|
  RelationshipInsertRequest|
  StyleChangeRequest|
  StyleDeleteRequest|
  StyleInsertRequest|
  StyleMoveRequest;
export interface RelationshipDeleteRequest {
  type: 'deleteRelationship';
  // TODO: rename id => relationshipId
  id: number;
}
export interface RelationshipInsertRequest {
  type: 'insertRelationship';
  fromId: StyleId;
  toId: StyleId;
  props: RelationshipProperties;
}
export interface StyleChangeRequest {
  type: 'changeStyle';
  styleId: StyleId;
  data: any;
}
export interface StyleDeleteRequest {
  type: 'deleteStyle';
  styleId: StyleId;
}
export interface StyleInsertRequest {
  type: 'insertStyle';
  afterId?: StyleRelativePosition;
  parentId?: StyleId; // undefined or 0 means top-level.
  // TODO: rename styleProps => props
  styleProps: StylePropertiesWithSubprops;
}
export interface StyleMoveRequest {
  type: 'moveStyle';
  styleId: StyleId;
  afterId: StyleRelativePosition;
}

// Messages from the server

export type ServerMessage = NotebookChanged|NotebookClosed|NotebookOpened;
export interface NotebookChanged {
  type: 'notebookChanged';
  notebookPath: NotebookPath;

  changes: NotebookChange[];
  complete?: boolean;            // True iff this is the last set of changes
                                // resulting from the original request.
  tracker?: Tracker;            // An optional, client-supplied, tracking
                                // identifier from the original change request.
  undoChangeRequests?: NotebookChangeRequest[];
}
export interface NotebookClosed {
  type: 'notebookClosed';
  notebookPath: NotebookPath;
}
export interface NotebookOpened {
  type: 'notebookOpened';
  notebookPath: NotebookPath;
  obj: NotebookObject;
}

// Messages from the client

export type ClientMessage = ChangeNotebook|CloseNotebook|OpenNotebook|UseTool;
export interface ChangeNotebook {
  type: 'changeNotebook';
  notebookPath: NotebookPath;
  changeRequests: NotebookChangeRequest[];
  options?: ChangeNotebookOptions;
}
export interface ChangeNotebookOptions {
  tracker?: Tracker;  // value passed back in NotebookChanged messages.
  wantUndo?: boolean; // true iff want undo change requests in return.
}
export interface CloseNotebook {
  type: 'closeNotebook';
  notebookPath: NotebookPath;
}
export interface OpenNotebook {
  type: 'openNotebook';
  notebookPath: NotebookPath;
}
export interface UseTool {
  type: 'useTool';
  notebookPath: NotebookPath;
  styleId: StyleId;
}

export interface NameValuePair {
    name: string;
    value: string;
}

export function isEmptyOrSpaces(str: string) : boolean{
    return str === null || str.match(/^ *$/) !== null;
  }
