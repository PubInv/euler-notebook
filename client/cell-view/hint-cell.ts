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

import { escapeHtml } from '../dom.js';
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
    // TODO: If hint cell is moved then it needs to be re-rendered.
    const repStyle = this.notebookView.openNotebook.findStyle({ role: 'REPRESENTATION', subrole: 'INPUT' }, style.id);
    if (!repStyle) {
      console.log("NO HINT REPSTYLE");
      this.$elt.innerHTML = "";
      return;
    }

    const data = <HintData>style.data;
    let mark: string;
    switch(data.status) {
      case HintStatus.Correct: mark = GREEN_CHECKMARK; break;
      case HintStatus.Incorrect: mark = RED_X; break;
      case HintStatus.Unknown: mark = BLUE_QUESTION_MARK; break;
      default: throw new Error('Unexpected.');
    }
    let innerHtml = `<i>${escapeHtml(repStyle.data)}</i> ${mark}`;
    const precedingStyleId = this.notebookView.openNotebook.precedingStyleId(style.id);
    const afterFrom = (precedingStyleId == data.fromId);
    const followingStyleId = this.notebookView.openNotebook.followingStyleId(style.id);
    const beforeTo = (followingStyleId == data.toId);
    const inBetween =  afterFrom && beforeTo;
    if (!inBetween) {
      innerHtml =  `${data.fromId} &#x290F; ${data.toId}: ${innerHtml}`;
    }
    this.$elt.innerHTML = innerHtml;
  }

  // -- PRIVATE --

  // Constructor

  private constructor(notebookView: NotebookView, style: StyleObject) {
    super(notebookView, style, 'hintCell');
  }
}
