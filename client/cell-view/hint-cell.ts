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

import { StyleObject, HintData, HintStatus } from '../notebook.js';
import { NotebookView } from '../notebook-view.js';
// import { getRenderer } from '../renderers.js';

import { CellView } from './index.js';

// Types

// Constants

const GREEN_CHECKMARK = '<span style="color:green">&#x2714;</span>';
const RED_X = '<span style="color:red">&#x2718;</span>';
const BLUE_QUESTION_MARK = '<b style="color:blue"><i>?</i></b>';

// Class

export class HintCellView extends CellView {

  // Class Methods

  public static create(notebookView: NotebookView, style: StyleObject): HintCellView {
    const instance = new this(notebookView, style);
    instance.render(style);
    return instance;
  }

  // Instance Methods

  public render(style: StyleObject): void {
    const data = <HintData>style.data;
    let mark: string;
    switch(data.status) {
      case HintStatus.Correct: mark = GREEN_CHECKMARK; break;
      case HintStatus.Incorrect: mark = RED_X; break;
      case HintStatus.Unknown: mark = BLUE_QUESTION_MARK; break;
      default: throw new Error('Unexpected.');
    }
    let text = data.text.replace('(1)', `(${data.fromId})`).replace('(2)', `(${data.toId})`);
    this.$elt.innerHTML = `HINT: ${data.fromId} &#x290F; ${data.toId}: <i>${text}</i> ${mark}`;
  }

  // -- PRIVATE --

  // Constructor

  private constructor(notebookView: NotebookView, style: StyleObject) {
    super(notebookView, style, 'textCell');
  }
}
