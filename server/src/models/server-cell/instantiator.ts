/*
Euler Notebook
Copyright (C) 2019-21 Public Invention
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

import { CellObject, CellSource, CellType, FigureCellObject, PlotCellObject, TextCellObject } from "../../shared/cell";
import { assertFalse } from "../../shared/common";
import { FormulaCellObject } from "../../shared/formula";

import { ServerNotebook } from "../server-notebook";

import { FormulaCell } from "./formula-cell";
import { FigureCell } from "./figure-cell";
import { PlotCell } from "./plot-cell";
import { TextCell } from "./text-cell";

import { ServerCell } from "./index";

// Constants

// Exports

export function newCell<O extends CellObject>(
  notebook: ServerNotebook,
  cellType: CellType,
  source: CellSource,
): ServerCell<O> {
  let rval: FigureCell|FormulaCell|TextCell|PlotCell;
  switch(cellType) {
    case CellType.Figure:   rval = FigureCell.newCell(notebook, source); break;
    case CellType.Formula:  rval = FormulaCell.newCell(notebook, source); break;
    case CellType.Text:     rval = TextCell.newCell(notebook, source); break;
    case CellType.Plot:     rval = PlotCell.newCell(notebook, source); break;
    default: assertFalse();
  }
  return <ServerCell<O>><unknown>rval;
}

export function existingCell<O extends CellObject>(notebook: ServerNotebook, obj: O): ServerCell<O> {
  let rval: FigureCell|FormulaCell|TextCell|PlotCell;
  switch(obj.type) {
    case CellType.Figure:   rval = new FigureCell(notebook, <FigureCellObject><unknown>obj); break;
    case CellType.Formula:  rval = new FormulaCell(notebook, <FormulaCellObject><unknown>obj); break;
    case CellType.Text:     rval = new TextCell(notebook, <TextCellObject><unknown>obj); break;
    case CellType.Plot:     rval = new PlotCell(notebook, <PlotCellObject><unknown>obj); break;
    default: assertFalse();
  }
  return <ServerCell<O>><unknown>rval;
}
