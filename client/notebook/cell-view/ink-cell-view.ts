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

import { $newSvg } from '../../dom.js';
import { DrawingData, StyleId, StyleObject } from '../../shared/notebook.js';
import { StyleChangeRequest } from '../../shared/math-tablet-api.js';
import { NotebookView } from '../notebook-view.js';
// import { getRenderer } from '../renderers.js';
import { SvgStroke } from '../svg-stroke.js';

import { CellView } from './index.js';

// Types

// REVIEW: These types are duplicated in stylus-input-panel.ts.

type PointerId = number;
type PointerMap = Map<PointerId, PointerInfo>;

interface PointerInfo {
  stroke?: SvgStroke;
}

// Constants

// Class

export class InkCellView extends CellView {

  // Class Methods

  public static create(notebookView: NotebookView, style: StyleObject): InkCellView {
    const instance = new this(notebookView, style);
    return instance;
  }

  // Instance Methods

  public render(_style: StyleObject): void {
    // TODO:
    console.error("TODO: Render requested for ink-cell-view.");
  }

  // -- PRIVATE --

  // Private Constructor

  private constructor(notebookView: NotebookView, style: StyleObject) {
    super(notebookView, style, 'inkCell');

    const repStyle = this.notebookView.openNotebook.findStyle({ role: 'INPUT', type: 'STROKE-DATA' }, style.id);
    if (!repStyle) {
      // TODO: Better way to handle this error.
      throw new Error("No REPRESENTATION/INPUT substyle for UNINTERPRETED-INK style.");
    }
    // TODO: What about when other clients drawing in the same cell? How do their changes get propagated into our drawing data?
    this.drawingData = copyDrawingData(repStyle.data);
    this.pointerMap = new Map();
    this.repStyleId = repStyle.id;

    this.$drawingArea = $newSvg<SVGSVGElement>('svg', {
      appendTo: this.$elt,
      attrs: { width: '6.5in', height: '1in' }, // TODO: strokesStyle.data.size,
      class: 'canvas',
      id: `svg${style.id}`,
      listeners: {
        pointercancel:  e=>this.onPointerCancel(e),
        pointerdown:    e=>this.onPointerDown(e),
        pointerenter:   e=>this.onPointerEnter(e),
        pointerleave:   e=>this.onPointerLeave(e),
        pointermove:    e=>this.onPointerMove(e),
        pointerout:     e=>this.onPointerOut(e),
        pointerover:    e=>this.onPointerOver(e),
        pointerup:      e=>this.onPointerUp(e),
      }
    });

    this.$drawingArea.innerHTML = '';
    for (const strokeGroup of this.drawingData.strokeGroups) {
      for (const stroke of strokeGroup.strokes) {
        SvgStroke.create(this.$drawingArea, stroke);
      }
    }

  }

  // Private Instance Properties

  private $drawingArea: SVGSVGElement;
  private drawingData: DrawingData;
  private pointerMap: PointerMap;
  private repStyleId: StyleId;

  // Private Instance Property Functions

  private pointerInfo(event: PointerEvent): PointerInfo {
    let rval = this.pointerMap.get(event.pointerId);
    if (!rval) {
      rval = {};
      this.pointerMap.set(event.pointerId, rval);
    }
    return rval;
  }

  // Private Instance Event Handlers

  private onPointerCancel(_event: PointerEvent): void {
    // console.log(`${event.pointerType} ${event.pointerId} ${event.type}`);
    // console.dir(event);
  }

  private onPointerDown(event: PointerEvent): void {
    // console.log(`${event.pointerType} ${event.pointerId} ${event.type}`);
    // console.dir(event);
    this.$drawingArea.setPointerCapture(event.pointerId);
    const pi = this.pointerInfo(event);

    if (pi.stroke) {
      console.error(`Pointer ${event.pointerId} already has a stroke. Discarding.`);
      pi.stroke.abort();
      delete pi.stroke;
    }
    const clientRect = this.$drawingArea.getBoundingClientRect();
    pi.stroke = SvgStroke.create(this.$drawingArea);
    pi.stroke.start(event, clientRect);
  }

  private onPointerEnter(_event: PointerEvent): void {
    // console.log(`${event.pointerType} ${event.pointerId} ${event.type}`);
    // console.dir(event);
  }

  private onPointerLeave(_event: PointerEvent): void {
    // console.log(`${event.pointerType} ${event.pointerId} ${event.type}`);
    // console.dir(event);
  }

  private onPointerMove(event: PointerEvent): void {
    // console.dir(event);
    const pi = this.pointerInfo(event);
    if (pi.stroke) {
      const clientRect = this.$drawingArea.getBoundingClientRect();
      pi.stroke.extend(event, clientRect);
    }
  }

  private onPointerOut(_event: PointerEvent): void {
    // console.log(`${event.pointerType} ${event.pointerId} ${event.type}`);
    // console.dir(event);
  }

  private onPointerOver(_event: PointerEvent): void {
    // console.log(`${event.pointerType} ${event.pointerId} ${event.type}`);
    // console.dir(event);
  }

  private onPointerUp(event: PointerEvent): void {
    // console.log(`${event.pointerType} ${event.pointerId} ${event.type}`);
    // console.dir(event);
    const pi = this.pointerInfo(event);
    const stroke = pi.stroke;
    if (!stroke) {
      console.warn(`Pointer ${event.pointerId} doesn't have a stroke. Ignoring.`);
      return;
    }
    const clientRect = this.$drawingArea.getBoundingClientRect();
    stroke.end(event, clientRect);
    delete pi.stroke;

    this.drawingData.strokeGroups[0].strokes.push(stroke.data);

    const changeRequest: StyleChangeRequest = { type: 'changeStyle', styleId: this.repStyleId, data: this.drawingData };
    this.notebookView.editStyle([ changeRequest ])
    .catch((err: Error)=>{
      // TODO: Display error to user?
      console.error(`Error submitting stroke: ${err.message}`);
    });
  }

}

// Helper Functions

// REVIEW: Duplicated in stylus-input-panel.ts
function copyDrawingData(data: DrawingData): DrawingData {
  return JSON.parse(JSON.stringify(data));
}
