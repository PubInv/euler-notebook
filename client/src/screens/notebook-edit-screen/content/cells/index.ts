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

import { CellObject } from "../../../../shared/cell";
import { Content } from "..";

import { CellBase } from "./cell-base";
import { FormulaCell } from "./formula-cell";
import { FigureCell } from "./figure-cell";
import { PlotCell } from "./plot-cell";
import { TextCell } from "./text-cell";

// Constants

// Exports

export function createCell(notebookView: Content, cell: CellObject): CellBase {

  // If a style has a child of REPRESENTATION|INPUT/STROKES then use a stylus cell.
  let rval: CellBase;
  const type: string = 'FIGURE'; // TODO:
  switch(type) {
    case 'FIGURE':   rval = new FigureCell(notebookView, cell); break;
    case 'FORMULA':  rval = new FormulaCell(notebookView, cell); break;
    case 'TEXT':     rval = new TextCell(notebookView, cell); break;
    case 'PLOT':     rval = new PlotCell(notebookView, cell); break;
    default: throw new Error(`Unknown top-level cell role: ${type}`);
  }
  return rval;
}
