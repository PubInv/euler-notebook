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

// Notebook paths are a FolderPath (see files-and-folders.ts) followed by a NotebookName,
// then a '.mtnb' extension, and a slash.
// Note that we always use forward slash, even on Windows where the filesystem
// separator is a backslash.
export type NotebookPath = string;

export type RelationshipMeaning =
  'SYMBOL-DEPENDENCY' |
  'EQUIVALENCE';

export type StyleMeaning =
  'ATTRIBUTE' |       // Generic attribute. Meaning implied by type.
  'ERROR' |           // An error message. Type should be text.
  'EVALUATION'|       // CAS evaluation of an expression.
  'EVALUATION-ERROR' |// Error in CAS evaluation of an expression.
  'EXPOSITION' |      // A longer discussion or description.
  'FORMULA-ALT' |     // Alternative representation of a formula.
  'HANDWRITING' |     // REVIEW: Used? Deprecate? Stroke information for the user's handwriting.
  'INPUT' |           // Primary representation of something that the user has input.
  'INPUT-ALT' |       // An alternative representation, e.g. LaTeX version of handwritten math.
  'QUADRATIC' |       // DEPRECATED: A quadratic expression, presumably worth plotting.
  'SIMPLIFICATION' |  // CAS simplification of expression or equation.
  'PLOT' |            // Plot of a formula
  'SYMBOL' |          // Symbols extracted from an expression.
  'SYMBOL-DEFINITION'|// Definition of a symbol.
  'SYMBOL-USE' |      // Use of a symbol.
  'EQUIVALENT-CHECKS'|// Checking expression equivalence of with other styles
  'UNIVARIATE-QUADRATIC'|// A quadratic expression, presumably worth plotting.
  'SUBTRIVARIATE';    // An expression in one or two variables presumable plottable.

export type StyleType =
  'HTML' |            // Html: HTML-formatted text
  'IMAGE' |           // ImageData: URL of image relative to notebook folder.
  'JIIX' |            // Jiix: MyScript JIIX export from 'MATH' editor.
  'LATEX' |           // LatexData: LaTeX string
  /* DEPRECATED: */ 'CLASSIFICATION'|   // A classifcication of the style.
  'MATHJS' |          // MathJsData: MathJS plain text expression
  'MATHML' |          // MathMlData: MathML Presentation XML
  'STROKE' |          // StrokeGroups: MyScript strokeGroups export from 'TEXT' editor.
  'SYMBOL' |          // SymbolData: symbol in a definition or expression.
  'TEXT' |            // TextData: Plain text
  'TOOL' |            // ToolInfo: Tool that can be applied to the parent style.
  'WOLFRAM';          // WolframData: Wolfram language expression

export type StyleSource =
  'MATHEMATICA' |     // Mathematica style (evaluation)
  'MATHJS' |          // The Mathjs Computer Algebra System system
  'MATHSTEPS' |       // The Mathsteps CAS system
  'SANDBOX' |         // Sandbox for temporary experiments
  'SUBTRIV-CLASSIFIER'|
  'SYMBOL-CLASSIFIER'|
  'SYSTEM'|           // The Math-Tablet app itself, not the user or an observer.
  'TEST' |            // An example source used only by our test system
  'USER'              // Directly entered by user

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
  html: /* TYPESCRIPT: Html? */ string;
  data?: any;
}

// Plain object version of TDoc

export type RelationshipId = number;
export type StyleId = number;

export interface RelationshipMap {
  [id: /* RelationshipId */number]: RelationshipObject;
}

export interface RelationshipProperties {
  meaning: RelationshipMeaning;
}

export interface RelationshipPropertiesMap {
  [id: /* StyleId */number]: RelationshipProperties;
}

export interface RelationshipObject extends RelationshipProperties {
  id: RelationshipId;
  source: StyleSource;
  fromId: StyleId;
  toId: StyleId;
}

export interface StyleMap {
  [id: /* StyleId */number]: StyleObject;
}

export interface StyleProperties {
  data: any;
  meaning: StyleMeaning;
  type: StyleType;
}

export interface StylePropertiesWithSubprops extends StyleProperties {
  subprops?: StylePropertiesWithSubprops[];
  relationsTo?: RelationshipPropertiesMap;
  relationsFrom?: RelationshipPropertiesMap;
}

export interface StyleObject extends StyleProperties {
  id: StyleId;
  parentId: StyleId; // 0 if top-level style.
  source: StyleSource;
}

export interface TDocObject {
  nextId: StyleId;
  relationshipMap: RelationshipMap;
  styleMap: StyleMap;
  styleOrder: StyleId[];
  version: string;
}

// Notebook Change types:

export type NotebookChange = RelationshipDeleted|RelationshipInserted|StyleDeleted|StyleInserted;

interface RelationshipDeleted {
  type: 'relationshipDeleted';
  // REVIEW: This is probably not sufficient info,
  //         as the style has already been deleted from
  //         the TDoc when this event is fired.
  relationship: RelationshipObject;
}

interface RelationshipInserted {
  type: 'relationshipInserted';
  relationship: RelationshipObject;
}

interface StyleDeleted {
  type: 'styleDeleted';
  // REVIEW: This is probably not sufficient info,
  //         as the style has already been deleted from
  //         the TDoc when this event is fired.
  parentId: StyleId;
  styleId: StyleId;
}

export interface StyleInserted {
  type: 'styleInserted';
  style: StyleObject;
  afterId?: StyleId;
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
  styleId: number;
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
  action: 'notebookChanged';
  notebookName: NotebookName;
  changes: NotebookChange[];
}

export interface NotebookClosed {
  action: 'notebookClosed';
  notebookName: NotebookName;
}

export interface NotebookOpened {
  action: 'notebookOpened';
  notebookName: NotebookName;
  tDoc: TDocObject;
}

// Messages from the client

// REVIEW: Unify with NotebookChange?

export type ClientMessage = CloseNotebook|DeleteStyle|InsertStyle|OpenNotebook|UseTool;

export interface CloseNotebook {
  action: 'closeNotebook';
  notebookName: NotebookName;
}

export interface DeleteStyle {
  action: 'deleteStyle';
  notebookName: NotebookName;
  styleId: number;
}

export interface InsertStyle {
  action: 'insertStyle';
  notebookName: NotebookName;
  styleProps: StylePropertiesWithSubprops;
  afterId: StyleId; // or 0, -1.
}

export interface OpenNotebook {
  action: 'openNotebook';
  notebookName: NotebookName;
}

export interface UseTool {
  action: 'useTool';
  notebookName: NotebookName;
  styleId: StyleId;
}
