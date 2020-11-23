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

import { CssSize, Html, PlainText } from "./common";
import { TexExpression, WolframExpression } from "./formula";
import { StrokeData } from "./stylus";

// Types

export type CellId = number;

// Position of cell in the notebook.
// Position 0 is the first cell of the notebook.
export type CellOrdinalPosition = number;

// Position a cell relative to another cell, or at the top or bottom of the notebook.
export type CellRelativePosition = CellId | CellPosition;

export const CELL_SOURCES = [
  'SYSTEM',
  'USER',
] as const;
export type CellSource = typeof CELL_SOURCES[number];

export enum CellPosition {
  Top = 0,
  Bottom = -1,
}

export enum CellType {
  Formula = 1,
  Text = 2,
  Figure = 3,
  Plot = 4,
}

export enum InputType {
  None = 0,
  Keyboard = 1,
  Stylus = 2,
}

export interface CellObject {
  id: CellId;
  type: CellType;
  cssSize: CssSize;
  source: CellSource;
}

export interface KeyboardCellObject extends CellObject {
  inputType: InputType.Keyboard,
  inputText: PlainText,
}

export interface StylusCellObject extends CellObject {
  inputType: InputType.Stylus,
  strokeData: StrokeData, // REVIEW: Does client need this structure?
}

// HERE TEMPORARILY:
// Move them into their own files when they become classes.

export interface FigureCellStylusObject extends StylusCellObject {
  type: CellType.Figure,
}
export type FigureCellObject = FigureCellStylusObject;

export interface PlotCellObject extends CellObject {
  type: CellType.Plot,
  formulaCellId: CellId,
  // LATER: Identify the symbols used in the plot for each axis, etc.
}

export interface TextCellKeyboardObject extends KeyboardCellObject {
  type: CellType.Text,
}
export interface TextCellStylusObject extends StylusCellObject {
  type: CellType.Text,
}
interface TextCellNoInputObject extends CellObject {
  type: CellType.Text,
  inputType: InputType.None,
}
export type TextCellObject = TextCellKeyboardObject | TextCellStylusObject | TextCellNoInputObject;

// LEGACY??

export type Symbol = '{Symbol}';

export interface SymbolData {
  name: Symbol;
  value?: string;
}

export interface SymbolTable {
  [symbol: string]: SymbolConstraints;
}

export type SymbolConstraint = WolframExpression;
export type SymbolConstraints = SymbolConstraint[];


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

