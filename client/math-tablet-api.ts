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

export type NotebookName = string; // Just the name of the notebook, no .mtnb extension.
export type NotebookPath = string; // relative path from ~/math-tablet-usr/ plus name plus .mtnb extension.

export type RelationshipMeaning =
  'SYMBOL-DEPENDENCY';

export type StyleMeaning =
  'ATTRIBUTE' |       // Generic attribute. Meaning implied by type.
  'EVALUATION'|       // CAS evaluation of an expression.
  'EVALUATION-ERROR'| // Error in CAS evaluation of an expression
  'HANDWRITING'|      // Stroke information for the user's handwriting.
  'INPUT'|            // Primary representation of something that the user has input.
  'INPUT-ALT' |       // An alternative representation, e.g. LaTeX version of handwritten math.
  'QUADRATIC'|        // DEPRECATED: A quadratic expression, presumably worth plotting.
  'SIMPLIFICATION' |  // CAS simplification of expression or equation.
  'INDENTED'|         // Indented text for the purpose of exposition.
  'PLOT'|             // Indented text for the purpose of exposition.
  'SYMBOL'|           // Symbols extracted from an expression.
  'SYMBOL-DEFINITION'|// Definition of a symbol.
  'SYMBOL-USE'|       // Use of a symbol
  'UNIVARIATE-QUADRATIC'|  // A quadratic expression, presumably worth plotting.
  'SUBTRIVARIATE';  // An expression in one or two variables presumable plottable.

  export type StyleType =
  'IMAGE'|            // ImageData: URL of image relative to notebook folder.
  'JIIX'|             // Jiix: MyScript JIIX export from 'MATH' editor.
  'LATEX'|            // LatexData: LaTeX string
  'MATHEMATICA'|      // Mathematica style (evaluation)
  /* DEPRECATED: */ 'CLASSIFICATION'|   // A classifcication of the thought.
  'MATHJS'|           // MathJsData: MathJS plain text expression
  'MATHML'|           // MathMlData: MathML Presentation XML
  'STROKE'|           // StrokeGroups: MyScript strokeGroups export from 'TEXT' editor.
  'SYMBOL'|           // SymbolData: symbol in a definition or expression.
  'TEXT'|             // TextData: Plain text
  'TOOL-MENU' |       // ToolMenu: Menu of tools that an observer can apply to a thought.
  'WOLFRAM';          // WolframData: Wolfram language expression

  export type StyleSource =
  'TEST'|             // An example source used only by our test system
  'USER'|             // Directly entered by user
  'MATHJS'|           // The Mathjs Computer Algebra System system
  'MATHEMATICA'|      // Mathematica style (evaluation)
  'MATHSTEPS' |       // The Mathsteps CAS system
  'SANDBOX' |         // Sandbox for temporary experiments
  'SYSTEM'            // The Math-Tablet app itself, not the user or an observer.

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
}
export type ToolMenu = ToolInfo[];
	
// Plain object version of TDoc

export type RelationshipId = number;
export type StylableId = ThoughtId|StyleId;
export type StyleId = number;
export type ThoughtId = number;

export interface RelationshipProperties {
  meaning: RelationshipMeaning;
}

export interface RelationshipObject extends RelationshipProperties {
  id: RelationshipId;
  sourceId: StylableId;
  targetId: StylableId;
}

export interface StyleProperties {
  data: any;
  meaning: StyleMeaning;
  source: StyleSource;
  type: StyleType;
}

export interface StyleObject extends StyleProperties {
  id: StyleId;
  stylableId: StylableId;
}

export interface TDocObject {
  nextId: StylableId;
  relationships: RelationshipObject[];
  styles: StyleObject[];
  thoughts: ThoughtObject[];
  version: string;
}

export interface ThoughtProperties {
  // Expect thoughts will have some sort of properties in the future.
  // e.g. position and size
}

export interface ThoughtObject extends ThoughtProperties {
  id: ThoughtId;
}

// Notebook Change types:

export type NotebookChange = RelationshipDeleted|RelationshipInserted|StyleDeleted|StyleInserted|ThoughtDeleted|ThoughtInserted;

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
  stylableId: StylableId;
  styleId: StyleId;
}

export interface StyleInserted {
  type: 'styleInserted';
  style: StyleObject;
}

interface ThoughtDeleted {
  type: 'thoughtDeleted';
  // REVIEW: This is probably not sufficient info,
  //         as the thought has already been deleted from
  //         the TDoc when this event is fired.
  thoughtId: ThoughtId;
}

interface ThoughtInserted {
  type: 'thoughtInserted';
  thought: ThoughtObject;
}

// Messages from the server

export type ServerMessage = NotebookChanged|NotebookClosed|NotebookOpened;

interface NotebookChanged {
  action: 'notebookChanged';
  notebookName: NotebookName;
  change: NotebookChange;
}

interface NotebookClosed {
  action: 'notebookClosed';
  notebookName: NotebookName;
}

interface NotebookOpened {
  action: 'notebookOpened';
  notebookName: NotebookName;
  notebook: TDocObject;
}

// Messages from the client

export type ClientMessage = CloseNotebook|DeleteThought|InsertThought|OpenNotebook;

interface CloseNotebook {
  action: 'closeNotebook';
  notebookName: NotebookName;
}

interface DeleteThought {
  action: 'deleteThought';
  notebookName: NotebookName;
  thoughtId: number;
}

interface InsertThought {
  action: 'insertThought';
  notebookName: NotebookName;
  thoughtProps: ThoughtProperties;
  stylePropss: StyleProperties[];
}

interface OpenNotebook {
  action: 'openNotebook';
  notebookName: NotebookName;
}
