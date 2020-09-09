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

import { StyleObject } from "../../../../shared/notebook"
import { Content } from ".."

import { CellBase } from "./cell-base"
import { FormulaCell } from "./formula-cell"
import { HintCell } from "./hint-cell"
import { InkCell } from "./ink-cell"
import { PlotCell } from "./plot-cell"
import { TextCell } from "./text-cell"

// Constants

// Exports

export function createCell(notebookView: Content, style: StyleObject): CellBase {

  // If a style has a child of REPRESENTATION|INPUT/STROKES then use a stylus cell.
  let rval: CellBase;
  switch(style.role) {
    case 'FIGURE':  // TODO: rval = FiguireCellView.create(notebookView, style); break;
    case 'FORMULA':           rval = new FormulaCell(notebookView, style); break;
    case 'HINT':              rval = new HintCell(notebookView, style); break;
    case 'TEXT':              rval = new TextCell(notebookView, style); break;
    case 'PLOT':              rval = new PlotCell(notebookView, style); break;
    case 'UNINTERPRETED-INK': rval = new InkCell(notebookView, style); break;
    // HACK: We don't actually know an 'UNKNOWN' cell will end up being a stylus cell until
    // the REPRESENTATION|INPUT/STROKES style is attached, but this prevents us from needing
    // the extra machinery to defer creating the cell until the substyles have been attached.
    // LATER?: case 'UNKNOWN': rval = UnknownCellView.create(notebookView, style); break;
    default: throw new Error(`Unknown top-level cell role: ${style.role}`);
  }
  return rval;
}
