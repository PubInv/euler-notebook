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
import { StyleChangeRequest, StyleMoveRequest } from '../../shared/math-tablet-api.js';

import { $configure } from '../../dom.js';
import { deepCopy, assert } from '../../common.js';
import { SvgStroke } from '../svg-stroke.js';
import { StylusDrawingPanel } from '../stylus-drawing-panel.js';

import { NotebookView } from '../notebook-view.js';

// import { getRenderer } from '../renderers.js';

import { CellView } from './index.js';
import { $new } from '../../dom.js';

// Types

interface CellDragData {
  styleId: StyleId;
}

// Constants

const CELL_MIME_TYPE = 'application/vnd.mathtablet.cell';

// Exported Class

export class InkCellView extends CellView {

  // Class Methods

  public static create(notebookView: NotebookView, style: StyleObject): InkCellView {
    return new this(notebookView, style);
  }

  // Instance Methods

  public render(style: StyleObject): void {
    // TODO: What if the user is in the middle of a stroke?

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

    // LATER: These button be on *all* cells, not just ink cells.
    $configure(this.$elt, {
      listeners: {
        dragenter: e=>this.onDragEnter(e),
        dragover: e=>this.onDragOver(e),
        drop: e=>this.onDrop(e),
      }
    });
    $new('button', {
      appendTo: this.$elt,
      class: 'insertCellBelowButton',
      html: '&#x25B6;',
      listeners: {
        click: e=>this.onInsertCellBelowButtonClicked(e),
      },
    });
    $new('button', {
      appendTo: this.$elt,
      class: 'deleteCellButton',
      html: '&#x2715;',
      listeners: {
        click: e=>this.onDeleteCellButtonClicked(e),
      },
    });
    $new('div', {
      appendTo: this.$elt,
      attrs: { draggable: true },
      class: 'dragIcon',
      html: "&equiv;",
      listeners: {
        dragend: e=>this.onDragEnd(e),
        dragstart: e=>this.onDragStart(e),
      },
      style: "width:16px;height:16px",
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

  private onDeleteCellButtonClicked(_event: MouseEvent): void {
    this.notebookView.deleteTopLevelStyle(this.styleId).catch(err=>{
      // TODO: Better handling of this error.
      console.error(`Error deleting cell:\n${err.stack}`);
    });
  }

  // TODO: Remove or comment out all of the drag/drop console messages.

  private onDragEnter(event: DragEvent): void {
    // console.log("Drag enter");

    // REVIEW: Very odd. If we try to get the data from the data transfer object we get an empty string
    //         even though the dataTranspfer.types array indicates that the data is there.
    //         So we can't make any decisions based on the data itself.
    // const cellDragData = getDragData(event);

    const dropAllowed = hasDragData(event);
    if (!dropAllowed) {
      console.warn(`Drag enter: aborting, no ${CELL_MIME_TYPE} data.`);
      return;
    }

    // Allow a drop by preventing the default action.
    event.preventDefault();
    // REVIEW: Set event.dataTransfer.dropEffect?
  }

  private onDragOver(event: DragEvent): void {
    // REVIEW: See review comment in onDragEnter. Getting the drag data from the event.dataTransfer fails.
    const dropAllowed = hasDragData(event);
    if (!dropAllowed) {
      console.warn(`Drag over: aborting, no ${CELL_MIME_TYPE} data.`);
      return;
    }

    // Allow a drop by preventing the default action.
    event.preventDefault();
  }

  private onDragStart(event: DragEvent): void {
    // console.log("Drag start");
    const cellDragData: CellDragData = {
      styleId: this.styleId,
    }
    // TODO: Other data types: LaTeX, SVG, text/plain, text/uri-list etc.
    setDragData(event, cellDragData);
    event.dataTransfer!.effectAllowed = 'all';
  }

  private onDragEnd(_event: DragEvent): void {
    // console.log(`Drag end: ${event.dataTransfer?.dropEffect}`)
  }

  private onDrop(event: DragEvent): void {
    const cellDragData = getDragData(event);
    if (!cellDragData) { return; }
    // console.log(`Dropped style ${cellDragData.styleId} onto style ${this.styleId}`);

    const c = this.notebookView.openNotebook.compareStylePositions(cellDragData.styleId, this.styleId);
    if (c==0) { /* Dropped onto self */ return; }

    // If dragging down, then put dragged cell below the cell that was dropped on.
    // If dragging up, then put dragged cell above the cell that was dropped on.
    const afterId = c<0 ? this.styleId : this.notebookView.openNotebook.precedingStyleId(this.styleId);
    const moveRequest: StyleMoveRequest = {
      type: 'moveStyle',
      styleId: cellDragData.styleId,
      afterId,
    }
    this.notebookView.editStyle([ moveRequest ])
    .catch((err: Error)=>{
      // TODO: What to do here?
      console.error(`Error moving style for drag/drop: ${err.message}`);
    });
  }

  private onInsertCellBelowButtonClicked(_event: MouseEvent): void {
    this.notebookView.insertInkCellBelow(this.styleId).catch(err=>{
      // TODO: Better handling of this error.
      console.error(`Error inserting cell below:\n${err.stack}`);
    });
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


// HELPER FUNCTIONS

function getDragData(event: DragEvent): CellDragData|undefined {
  assert(event.dataTransfer);
  const json = event.dataTransfer!.getData(CELL_MIME_TYPE);
  if (!json) { return undefined; }
  const cellDragData = <CellDragData>JSON.parse(json);
  return cellDragData;
}

function hasDragData(event: DragEvent): boolean {
  return event.dataTransfer!.types.includes(CELL_MIME_TYPE);
}

function setDragData(event: DragEvent, cellDragData: CellDragData): void {
  assert(event.dataTransfer);
  const json = JSON.stringify(cellDragData);
  event.dataTransfer!.setData(CELL_MIME_TYPE, json);
  // TODO: Other data types: LaTeX, SVG, text/plain, text/uri-list etc.
}
