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
import { CellId } from "./notebook";

// Types

export enum CellType {
  Formula = 1,
  Text = 2,
  Figure = 3,
  Plot = 4,
}

export interface CellData {
  type: CellType;
  height: LengthInPoints;
  displaySvg: SvgMarkup;
}

export enum InputType {
  None = 0,
  Keyboard = 1,
  Stylus = 2,
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