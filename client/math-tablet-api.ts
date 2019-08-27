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

import { RelationshipProperties, StyleProperties, StyleId, NotebookChange, NotebookObject } from './notebook.js';

// Types

export type ImageData = string;
export type LatexData = string;
export type MathJsData = string;
export type MathMlData = string;
export type MthMtcaData = string;
export type Symbol = string;
export type TextData = string;
export type WolframData = string;

export interface SymbolData {
  name: string;
  value?: string;
}

// Just the name of the notebook, no .mtnb extension.
export type NotebookName = string;

// MyScript Types

export interface Jiix {
  // TYPESCRIPT: TODO
}

export interface MyScriptServerKeys {
  applicationKey: string;
  hmacKey: string;
}

export interface StrokeGroups {
  // TYPESCRIPT: TODO
}

export type ToolName = string;
export interface ToolInfo {
  name: ToolName;
  html?: /* TYPESCRIPT: Html? */ string;
  // This is needed because we don't want to try to do
  // TeX rendering into HTML on the server side; so we must
  // inform the tool processor what we want in some way.
  tex?: string;
  data?: any;
}

export interface RelationshipPropertiesMap {
  [id: /* StyleId */number]: RelationshipProperties;
}

export interface StylePropertiesWithSubprops extends StyleProperties {
  subprops?: StylePropertiesWithSubprops[];
  relationsTo?: RelationshipPropertiesMap;
  relationsFrom?: RelationshipPropertiesMap;
}

// Notebook Change Requests

export type NotebookChangeRequest =
  RelationshipDeleteRequest|
  RelationshipInsertRequest|
  StyleDeleteRequest|
  StyleInsertRequest;
export interface RelationshipDeleteRequest {
  type: 'deleteRelationship';
  id: number;
}
export interface RelationshipInsertRequest {
  type: 'insertRelationship';
  fromId: StyleId;
  toId: StyleId;
  props: RelationshipProperties;
}
export interface StyleDeleteRequest {
  type: 'deleteStyle';
  // Why is this a number and not a StyleId? - rlr
  styleId: StyleId;
//  styleId: number;
}
export interface StyleInsertRequest {
  type: 'insertStyle';
  afterId?: StyleId; // or 0, -1.
  parentId?: StyleId; // or 0.
  styleProps: StylePropertiesWithSubprops;
}

// Messages from the server

export type ServerMessage = NotebookChanged|NotebookClosed|NotebookOpened;
export interface NotebookChanged {
  type: 'notebookChanged';
  notebookName: NotebookName;
  changes: NotebookChange[];
}
export interface NotebookClosed {
  type: 'notebookClosed';
  notebookName: NotebookName;
}
export interface NotebookOpened {
  type: 'notebookOpened';
  notebookName: NotebookName;
  obj: NotebookObject;
}

// Messages from the client

export type ClientMessage = ChangeNotebook|CloseNotebook|OpenNotebook|UseTool;
export interface ChangeNotebook {
  type: 'changeNotebook';
  notebookName: NotebookName;
  changeRequests: NotebookChangeRequest[];
}
export interface CloseNotebook {
  type: 'closeNotebook';
  notebookName: NotebookName;
}
export interface OpenNotebook {
  type: 'openNotebook';
  notebookName: NotebookName;
}
export interface UseTool {
  type: 'useTool';
  notebookName: NotebookName;
  styleId: StyleId;
}

export interface NameValuePair {
    name: string;
    value: string;
}
