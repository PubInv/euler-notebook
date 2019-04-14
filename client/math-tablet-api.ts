
// Requirements

import { Jiix, StrokeGroups } from "./myscript-types";

// Types

export type LatexMath = string;
export type MathJsText = string;
export type NotebookName = string;
export type StyleMeaning =
  'EVALUATION'|       // CAS evaluation of an expression.
  'EVALUATION-ERROR'| // Error in CAS evaluation of an expression
  'INPUT'|            // Primary representation of something that the user has input.
  'HANDWRITING'|      // Stroke information for the user's handwriting.
  'SIMPLIFICATION'|   // CAS simplification of expression or equation.
  'SYMBOL';           // Symbols extracted from an expression.
export type StyleType =
  // TYPE   // DATA
  'JIIX'|   // MyScript JIIX export from 'MATH' editor.
  'LATEX'|  // LaTeX string
  'MATHJS'| // MathJS plain text expression
  'STROKE'| // MyScript strokeGroups export from 'TEXT' editor.
  'TEXT';   // Plain text
export type UserName = string;

// Plain object version of TDoc

// TYPESCRIPT: Separate out styles by datatype.
export interface StyleObject {
  id: number;
  stylableId: number;
  type: StyleType;
  meaning: StyleMeaning;
  data: any;
}

export interface TDocObject {
  nextId: number;
  version: string;
  thoughts: ThoughtObject[];
  styles: StyleObject[];
}

export interface ThoughtObject {
  id: number;
}

// Messages from the server

export type ServerMessage = DeleteStyle|DeleteThought|InsertStyle|InsertThought|RefreshNotebook;

interface DeleteStyle {
  action: 'deleteStyle';
  styleId: number;
}

interface InsertStyle {
  action: 'insertStyle';
  style: StyleObject;
}

interface DeleteThought {
  action: 'deleteThought';
  thoughtId: number;
}

interface InsertThought {
  action: 'insertThought';
  thought: ThoughtObject;
}

interface RefreshNotebook {
  action: 'refreshNotebook';
  tDoc: TDocObject;
}

// Messages from the client

export type ClientMessage = InsertHandwrittenMath|InsertHandwrittenText|InsertMathJsText;

interface InsertHandwrittenMath {
  action: 'insertHandwrittenMath';
  latexMath: LatexMath;
  jiix: Jiix;
}

interface InsertHandwrittenText {
action: 'insertHandwrittenText';
text: string;
strokeGroups: StrokeGroups;
}

interface InsertMathJsText {
  action: 'insertMathJsText';
  mathJsText: MathJsText;
}



