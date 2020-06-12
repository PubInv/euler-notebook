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

import { $new, $newSvg } from '../dom.js';
// TODO: import { getRenderer } from './renderers.js';
import { ROLE_OPTIONS, SUBROLE_OPTIONS } from './role-selectors.js';
import { StyleObject, StyleRole, StyleSubrole, DrawingData } from '../notebook.js';
import { NotebookChangeRequest, StyleChangeRequest, StyleConvertRequest } from '../math-tablet-api.js';
import { SvgStroke } from './svg-stroke.js';

// Types

type DismissCallback = (changeRequests: NotebookChangeRequest[])=>void;

// REVIEW: These types are duplicated in ink-cell-view.ts.

type PointerId = number;
type PointerMap = Map<PointerId, PointerInfo>;

interface PointerInfo {
  stroke?: SvgStroke;
}

// Constants

// Exported Class

export class StylusInputPanel {

  // Class Methods

  public static create(style: StyleObject, repStyle: StyleObject, dismissCallback: DismissCallback): StylusInputPanel {
    return new this(style, repStyle, dismissCallback);
  }

  // Instance Properties

  public $elt: HTMLDivElement;

  // Instance Methods

  public dismiss(saveChanges: boolean): void {
    if (!saveChanges) {
      this.dismissCallback([]);
      return;
    }

    const changeRequests = <NotebookChangeRequest[]>[];

    // If role/subrole changed then send a convertStyle request on root style.
    // If data has changed then send a changeStyle request on representation style.
    // otherwise send no changes.
    const role = <StyleRole>this.$roleSelector.value;
    const subrole = <StyleSubrole>this.$subroleSelector.value;
    if (role != this.style.role || subrole != this.style.subrole) {
      const changeRequest: StyleConvertRequest = { type: 'convertStyle', styleId: this.style.id, role, subrole };
      changeRequests.push(changeRequest);
    }
    if (this.drawingDataChanged) {
      const changeRequest: StyleChangeRequest = { type: 'changeStyle', styleId: this.repStyle.id, data: this.drawingData };
      changeRequests.push(changeRequest);
    }
    this.dismissCallback(changeRequests);
  }

  public focus(): void { this.$drawingArea.focus(); }

  // ----- Private -----

  // Private Constructor

  private constructor(
    style: StyleObject,
    repStyle: StyleObject,
    dismissCallback: DismissCallback,
  ) {
    this.style = style;
    this.repStyle = repStyle;
    this.drawingData = copyDrawingData(<DrawingData>repStyle.data);
    this.drawingDataChanged = false;
    this.pointerMap = new Map();

    this.$elt = $new('div', { class: 'inputPanel' });

    // Three rows: preview, error message, and input row.
    /* this.$preview = */$new('div', { appendTo: this.$elt, class: 'preview' });
    /* this.$messages = */$new('div', { appendTo: this.$elt, class: 'messages' });
    const $inputRow = $new('div', { appendTo: this.$elt, class: 'inputRow' });

    // Input row contains role/subrole/type selectors, and drawing area.
    const $selectors = $new<HTMLDivElement>('div', { appendTo: $inputRow, class: 'selectors' });
    this.constructSelectors($selectors, style);

    this.$drawingArea = $newSvg<SVGSVGElement>('svg', {
      appendTo: $inputRow,
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
    this.renderStrokes();

    const $buttonArea = $new<HTMLDivElement>('div', { appendTo: $inputRow });
    /* const $saveButton = */$new<HTMLButtonElement>('button', {
      appendTo: $buttonArea,
      html: "Save",
      listeners: { click: e=>this.onSaveClick(e) },
    });
    /* const $cancelButton = */$new<HTMLButtonElement>('button', {
      appendTo: $buttonArea,
      html: "Cancel",
      listeners: { click: e=>this.onCancelClick(e) },
    });

    // TODO: this.renderPreview();
    this.dismissCallback = dismissCallback;
  }

  // Private Instance Properties

  // private $messages: HTMLDivElement;
  // private $preview: HTMLDivElement;
  private $roleSelector!: HTMLSelectElement;
  private $subroleSelector!: HTMLSelectElement;
  private $drawingArea: SVGSVGElement;
  private dismissCallback: DismissCallback;
  private drawingData: DrawingData;
  private drawingDataChanged: boolean;
  private repStyle: StyleObject;
  private style: StyleObject;
  private pointerMap: PointerMap;

  // Private Instance Property Functions

  private pointerInfo(event: PointerEvent): PointerInfo {
    let rval = this.pointerMap.get(event.pointerId);
    if (!rval) {
      rval = {};
      this.pointerMap.set(event.pointerId, rval);
    }
    return rval;
  }

  // Private Instance Methods

  private constructSelectors($selectors: HTMLDivElement, style: StyleObject): void {

    // Role selector
    const $roleSelector = this.$roleSelector = $new<HTMLSelectElement>('select', {
      appendTo: $selectors,
      listeners: { input: e=>this.onRoleSelectorChange(e), }
    });
    for (const [ value, html ] of ROLE_OPTIONS) {
      $new<HTMLOptionElement>('option', {
        appendTo: $roleSelector,
        attrs: { value, selected: (value == style.role) },
        html
      });
    }

    // Subrole selector
    this.$subroleSelector = $new<HTMLSelectElement>('select', {
      appendTo: $selectors,
      listeners: { input: e=>this.onSubroleSelectorChange(e), }
    });
    this.populateSubroleSelector(style.role, style.subrole!);

  }

  private populateSubroleSelector(role: StyleRole, subrole?: StyleSubrole): void {
    this.$subroleSelector.innerHTML = '';
    for (const [ value, html ] of SUBROLE_OPTIONS.get(role)!) {
      $new<HTMLOptionElement>('option', {
        appendTo: this.$subroleSelector,
        attrs: { value, selected: (value === subrole) },
        html
      });
    }
  }

  // private renderPreview(): void {
  //   const renderer = getRenderer(this.repStyle.type);
  //   const { html, errorHtml } = renderer(this.drawingData);
  //   if (html) { this.$preview.innerHTML = html; }
  //   this.$messages.innerHTML = errorHtml || '';
  // }

  private renderStrokes(): void {
    this.$drawingArea.innerHTML = '';
    for (const strokeGroup of this.drawingData.strokeGroups) {
      for (const stroke of strokeGroup.strokes) {
        SvgStroke.create(this.$drawingArea, stroke);
      }
    }
  }

  // Private Event Handlers

  private onCancelClick(_event: MouseEvent): void {
    this.dismiss(false);
  }

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
    this.drawingDataChanged = true; // REVIEW: How to handle undo?

    // LATER: Incremental change request
    // const changeRequest: StyleChangeRequest = { type: 'changeStyle', styleId: strokesStyle.id, data };
    // this.notebookView.editStyle([ changeRequest ])
    // .catch((err: Error)=>{
    //   // TODO: Display error to user?
    //   console.error(`Error submitting stroke: ${err.message}`);
    // });
  }

  private onRoleSelectorChange(event: Event /* REVIEW: More specific event? */): void {
    const role = <StyleRole>(<HTMLSelectElement>event.target).value;
    this.populateSubroleSelector(role);
    // const subrole = 'UNKNOWN';
    // const changeRequest: NotebookChangeRequest = { type: 'convertStyle', styleId: this.styleId, role, subrole };
    // this.notebookView.openNotebook.sendChangeRequest(changeRequest, { wantUndo: true });
  }

  private onSaveClick(_event: MouseEvent): void {
    this.dismiss(true);
  }

  private onSubroleSelectorChange(_event: Event /* REVIEW: More specific event? */): void {
    // const subrole = <StyleSubrole>(<HTMLSelectElement>event.target).value;
    // TODO: Theoretically, preview should change.
  }

}

// Helper Functions

// REVIEW: Duplicated in ink-cell-view.ts
function copyDrawingData(data: DrawingData): DrawingData {
  return JSON.parse(JSON.stringify(data));
}