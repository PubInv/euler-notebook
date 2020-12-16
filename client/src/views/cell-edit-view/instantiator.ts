/*
Math Tablet
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

import { CellObject, CellType } from "../../shared/cell";
import { assertFalse } from "../../shared/common";

import { ClientCell } from "../../client-cell";
import { FigureCell } from "../../client-cell/figure-cell";
import { FormulaCell } from "../../client-cell/formula-cell";
import { TextCell } from "../../client-cell/text-cell";
import { PlotCell } from "../../client-cell/plot-cell";

import { FormulaEditView } from "./formula-edit-view";
import { FigureEditView } from "./figure-edit-view";
import { PlotEditView } from "./plot-edit-view";
import { TextEditView } from "./text-edit-view";

import { NotebookEditView } from "../notebook-edit-view";

import { CellEditView } from "./index";

// Constants

// Exports

export function createCellView<O extends CellObject>(notebookEditView: NotebookEditView, cell: ClientCell<O>): CellEditView<O> {
  let rval: FigureEditView|FormulaEditView|TextEditView|PlotEditView;
  switch(cell.type) {
    case CellType.Figure:   rval = new FigureEditView(notebookEditView, <FigureCell><unknown>cell); break;
    case CellType.Formula:  rval = new FormulaEditView(notebookEditView, <FormulaCell><unknown>cell); break;
    case CellType.Text:     rval = new TextEditView(notebookEditView, <TextCell><unknown>cell); break;
    case CellType.Plot:     rval = new PlotEditView(notebookEditView, <PlotCell><unknown>cell); break;
    default: assertFalse();
  }
  return <CellEditView<O>><unknown>rval;
}
