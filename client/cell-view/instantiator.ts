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

import { StyleObject } from '../notebook.js';
import { NotebookView } from '../notebook-view.js';

import { CellView } from './index';
import { DrawingCellView } from './drawing-cell.js';
import { FormulaCellView } from './formula-cell.js';
import { PlotCellView } from './plot-cell.js';
import { TextCellView } from './text-cell.js';

// Exports

export function createCellView(notebookView: NotebookView, style: StyleObject): CellView {
  let rval: CellView|undefined = undefined;
  switch(style.meaning) {
    case 'INPUT':
      switch(style.type) {
        case 'DRAWING':
            rval = DrawingCellView.create(notebookView, style); break;
        case 'LATEX':
        case 'MATHJS':
        case 'MATHML':
        case 'WOLFRAM':
          rval = FormulaCellView.create(notebookView, style); break;
        case 'TEXT':
        case 'HTML':
          rval = TextCellView.create(notebookView, style); break;
      }
      break;
    case 'PLOT':
        rval = PlotCellView.create(notebookView, style); break;
    // case 'EXPOSITION':
    //   if (style.type == 'HTML') { this.renderHtml(style.data); }
    //   else if (style.type == 'TEXT') { this.renderText(style.id,style.data); }
    //   else { assert(false, `Unexpected data type for exposition: ${style.type}.`); }
    //   break;
    // case 'INPUT-ALT':
    //   if (style.type == 'LATEX') { this.renderLatexFormula(style.id,style.data); }
    //   else if (style.type == 'TEXT') { this.renderText(style.id,style.data); }
    //   break;
    // case 'DECORATION':
    //   if (style.type == 'LATEX') { this.renderLatexFormula(style.id,style.data); }
    //   else if (style.type == 'TEXT') { this.renderText(style.id,style.data); }
    //   break;
    // case 'EQUATION-SOLUTION': this.renderSolution(style);
    //   break;
    //   // This is currently a "promotion" which is a form of input,
    //   // so make it a high-level thought is slightly inconsistent.
  }
  if (!rval) { throw new Error(`Don't have a CellView type for ${style.meaning}/${style.type}.`); }
  return rval;
}
