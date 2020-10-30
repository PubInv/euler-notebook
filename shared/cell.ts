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

import { LengthInPoints, PlainText } from "./common";
import { StyleId } from "./notebook";

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
}

// HERE TEMPORARILY:
// Move them into their own files when they become classes.

export interface FigureCellData extends CellData {
  type: CellType.Figure,
}

export interface PlotCellData extends CellData {
  type: CellType.Plot,
  formulaStyleId: StyleId,
  // LATER: Identify the symbols used in the plot for each axis, etc.
}

export interface TextCellData extends CellData {
  type: CellType.Text,
  plainText: PlainText,
}