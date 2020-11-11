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

import { CellObject, CellType, FigureCellObject, PlotCellObject, TextCellObject } from "../../../../shared/cell";
import { Content } from "..";

import { CellBase } from "./cell-base";
import { FormulaCell } from "./formula-cell";
import { FigureCell } from "./figure-cell";
import { PlotCell } from "./plot-cell";
import { TextCell } from "./text-cell";
import { FormulaCellObject } from "../../../../shared/formula";
import { assertFalse } from "../../../../shared/common";

// Constants

// Exports

export function createCell(notebookView: Content, cellObject: CellObject): CellBase {

  // If a style has a child of REPRESENTATION|INPUT/STROKES then use a stylus cell.
  let rval: CellBase;
  switch(cellObject.type) {
    case CellType.Figure:   rval = new FigureCell(notebookView, </*TYPESCRIPT:*/FigureCellObject>cellObject); break;
    case CellType.Formula:  rval = new FormulaCell(notebookView, </*TYPESCRIPT:*/FormulaCellObject>cellObject); break;
    case CellType.Text:     rval = new TextCell(notebookView, </*TYPESCRIPT:*/TextCellObject>cellObject); break;
    case CellType.Plot:     rval = new PlotCell(notebookView, </*TYPESCRIPT:*/PlotCellObject>cellObject); break;
    default: assertFalse();
  }
  return rval;
}
