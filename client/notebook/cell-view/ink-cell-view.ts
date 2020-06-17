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

import { DrawingData, StyleId, StyleObject } from '../../shared/notebook.js';
import { StyleChangeRequest } from '../../shared/math-tablet-api.js';

// import { $ } from '../../dom.js';
import { deepCopy } from '../../common.js';
import { SvgStroke } from '../svg-stroke.js';
import { StylusDrawingPanel } from '../stylus-drawing-panel.js';

import { NotebookView } from '../notebook-view.js';

// import { getRenderer } from '../renderers.js';

import { CellView } from './index.js';
import { $new } from '../../dom.js';

// Types

// Constants

// Exported Class

export class InkCellView extends CellView {

  // Class Methods

  public static create(notebookView: NotebookView, style: StyleObject): InkCellView {
    return new this(notebookView, style);
  }

  // Instance Methods

  public render(style: StyleObject): void {
    // TODO: What if the user is in the middle of a stroke?

    console.log("RENDERING INK CELL VIEW");
    this.$elt.innerHTML = '';
    const inputStyle = this.notebookView.openNotebook.findStyle({ role: 'INPUT', type: 'STROKE-DATA' }, style.id);
    if (!inputStyle) {
      // TODO: Better way to handle this error.
      // throw new Error("No INPUT substyle for UNINTERPRETED-INK style.");
      console.warn("No INPUT substyle for UNINTERPRETED-INK style.");
      return;
    }
    this.drawingData = deepCopy(inputStyle.data);
    this.inputStyleId = inputStyle.id;

    const svgRepStyle = this.notebookView.openNotebook.findStyle({ role: 'REPRESENTATION', type: 'SVG-MARKUP' }, style.id);
    if (svgRepStyle) {
      this.$elt.innerHTML = svgRepStyle.data;
    } else {
      // TODO: What to do in this case?
      console.warn("No SVG-MARKUP substyle for UNINTERPRETED-INK style.");
    }

    // TODO: Get dimensions from svgPanel?
    /* this.stylusDrawingPanel = */ StylusDrawingPanel.create(this.$elt, (stroke)=>this.onStrokeComplete(stroke));

    // LATER: Insert button be on *all* cells, not just ink cells.
    /* this.$insertBelowButton = */ $new('button', {
      appendTo: this.$elt,
      class: 'insertBelowButton',
      html: '&#x25B6;',
      listeners: {
        click: e=>this.onInsertBelowButtonClicked(e),
      },
    });
  }

  // -- PRIVATE --

  // Private Constructor

  private constructor(notebookView: NotebookView, style: StyleObject) {
    super(notebookView, style, 'inkCell');
    this.render(style);
  }

  // Private Instance Properties

  // private stylusDrawingPanel: StylusDrawingPanel;
  private drawingData!: DrawingData;
  private inputStyleId!: StyleId;  // REVIEW: What if the input style id changes?

  // Private Event Handlers

  private onInsertBelowButtonClicked(_event: MouseEvent): void {
    this.notebookView.insertInkCellBelow(this.styleId);
  }

  private onStrokeComplete(stroke: SvgStroke): void {
    // TODO: What if socket to server is closed? We'll just accumulate strokes that will never get saved.
    //       How do we handle offline operation?
    this.drawingData.strokeGroups[0].strokes.push(stroke.data);
    const changeRequest: StyleChangeRequest = { type: 'changeStyle', styleId: this.inputStyleId, data: this.drawingData };
    this.notebookView.editStyle([ changeRequest ])
    .catch((err: Error)=>{
      // TODO: What to do here?
      console.error(`Error submitting stroke: ${err.message}`);
    });
  }
}
