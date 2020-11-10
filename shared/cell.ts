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

import { LengthInPoints, PlainText, SvgMarkup } from "./common";
import { StylusInput } from "./stylus";

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

export interface CellData {
  type: CellType;
  height: LengthInPoints;
  displaySvg: SvgMarkup;
}

export interface CellMap {
  [id: /* CellId */number]: CellObject;
}

export interface CellObject extends CellProperties {
  id: CellId;
  source: CellSource;
}

export interface CellProperties {
  id?: CellId;
  data: any;
}


// HERE TEMPORARILY:
// Move them into their own files when they become classes.

export interface FigureCellData extends CellData {
  type: CellType.Figure,
  inputType: InputType.Stylus,
  stylusInput: StylusInput,
}

export interface PlotCellData extends CellData {
  type: CellType.Plot,
  formulaCellId: CellId,
  // LATER: Identify the symbols used in the plot for each axis, etc.
}

interface TextCellDataBase extends CellData {
  type: CellType.Text,
  inputText: PlainText,
}
export interface TextCellKeyboardData extends TextCellDataBase {
  inputType: InputType.Keyboard,
}
export interface TextCellStylusData extends TextCellDataBase {
  inputType: InputType.Stylus,
  stylusInput: StylusInput,
  stylusSvg: SvgMarkup,
}
export type TextCellData = TextCellKeyboardData | TextCellStylusData;