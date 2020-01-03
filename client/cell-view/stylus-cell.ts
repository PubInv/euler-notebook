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

// TODO: Incremental changes so we don't redraw the entire SVG on every stroke.

// Requirements

import { $new, $newSvg, escapeHtml, Html } from '../dom.js';
import { DrawingData, StyleObject, StyleRole, StyleSubrole } from '../notebook.js';
import { NotebookView } from '../notebook-view.js';
import { getRenderer } from '../renderers.js';
import { SvgStroke } from '../svg-stroke.js';

import { CellView } from './index.js';
import { NotebookChangeRequest } from '../math-tablet-api.js';

// Types

type PointerId = number;
type PointerMap = Map<PointerId, PointerInfo>;

interface PointerInfo {
  stroke?: SvgStroke;
}

// Constants

const SELECTOR_OPTIONS = new Map<StyleRole,Html>([
  [ 'UNKNOWN', "Choose..." ],
  [ 'FORMULA', "Formula" ],
  [ 'TEXT', "Text" ],
  [ 'FIGURE', "Figure" ],
]);

const SUB_SELECTOR_OPTIONS = new Map<StyleRole,Map<StyleSubrole,string>>([
  [ 'UNKNOWN', new Map([
    [ 'UNKNOWN', "Choose..." ],
  ])],
  [ 'FORMULA', new Map([
    [ 'UNKNOWN', "Choose..." ],
    [ 'ASSUME', "Assume" ],
    [ 'PROVE', "Prove" ],
    [ 'OTHER', "Other" ],
  ])],
  [ 'TEXT', new Map([
    [ 'UNKNOWN', "Choose..." ],
    [ 'HEADING1', "Heading 1" ],
    [ 'HEADING2', "Heading 2" ],
    [ 'NORMAL', "Normal" ],
  ])],
  [ 'FIGURE', new Map([
    [ 'UNKNOWN', "Choose..." ],
    [ 'SKETCH', "Sketch" ],
    [ 'DRAWING', "Drawing" ],
  ])],

]);

// Class

export class StylusCell extends CellView {

  // Public Class Methods

  public static create(notebookView: NotebookView, style: StyleObject): StylusCell {
    const instance = new this(notebookView, style);
    instance.render(style);
    return instance;
  }

  // Instance Methods

  public render(style: StyleObject): void {
    this.renderPreview();
    const strokesStyle = this.notebookView.openNotebook.findStyle({ role: 'REPRESENTATION', subrole: 'INPUT', type: 'STROKES' }, style.id);
    if (strokesStyle) {
      this.renderStrokes(strokesStyle);
    } // REVIEW: else render what?
  }

  // -- PRIVATE --

  // Constructor

  private constructor (notebookView: NotebookView, style: StyleObject) {
    super(notebookView, style, 'stylusCell');

    this.$preview = $new<HTMLDivElement>('div', { appendTo: this.$elt, class: 'preview' });

    const $inputRow = $new<HTMLDivElement>('div', { appendTo: this.$elt, class: 'inputRow' });

    const $selectors = $new<HTMLDivElement>('div', { appendTo: $inputRow, class: 'selectors' });

    const $selector = /* this.$selector = */ $new<HTMLSelectElement>('select', {
      appendTo: $selectors,
      listeners: {
        input: e=>this.onSelectorChange(e),
      }
    });
    for (const [ role, html ] of SELECTOR_OPTIONS) {
      $new<HTMLOptionElement>('option', {
        appendTo: $selector,
        attrs: {
          selected: (role == style.role),
          value: role,
        },
        html
      });
    }

    this.$subselector = $new<HTMLSelectElement>('select', {
      appendTo: $selectors,
      listeners: {
        input: e=>this.onSubselectorChange(e),
      }
    });
    this.populateSubselector(style.role, style.subrole);

    this.$canvas = $newSvg<SVGSVGElement>('svg', {
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

    this.pointerMap = new Map();
  }

  // Private Instance Properties

  private $canvas: SVGSVGElement;
  private $preview: HTMLDivElement;
  // private $selector: HTMLSelectElement;
  private $subselector: HTMLSelectElement;
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

  private populateSubselector(role: StyleRole, subrole?: StyleSubrole|undefined): void {
    this.$subselector.innerHTML = '';
    for (const [ subrole2, html ] of SUB_SELECTOR_OPTIONS.get(role)!) {
      $new<HTMLOptionElement>('option', {
        appendTo: this.$subselector,
        attrs: {
          selected: (subrole2 == subrole),
          value: `${role}|${subrole2}`,
        },
        html
      });
    }
  }

  private renderPreview(): void {
    this.$preview.innerHTML = '';

    const latexStyle = this.notebookView.openNotebook.findStyle({ role: 'REPRESENTATION', type: 'LATEX' }, this.styleId);
    if (latexStyle) {
      const renderer = getRenderer(latexStyle.type);
      let { html, errorHtml } = renderer(latexStyle.data);
      if (errorHtml) {
        html = `<div class="error">${errorHtml}</div><tt>${escapeHtml(latexStyle.data.toString())}</tt>`;
      }
      this.$preview.innerHTML = html!;
    }
  }

  private renderStrokes(strokesStyle: StyleObject): void {
    this.$canvas.innerHTML = '';
    const data: DrawingData = strokesStyle.data;
    for (const strokeGroup of data.strokeGroups) {
      for (const stroke of strokeGroup.strokes) {
        SvgStroke.create(this.$canvas, stroke);
      }
    }
  }

  // Private Event Handlers

  private onPointerCancel(_event: PointerEvent): void {
    // console.log(`${event.pointerType} ${event.pointerId} ${event.type}`);
    // console.dir(event);
  }

  private onPointerDown(event: PointerEvent): void {
    // console.log(`${event.pointerType} ${event.pointerId} ${event.type}`);
    // console.dir(event);
    this.$canvas.setPointerCapture(event.pointerId);
    const pi = this.pointerInfo(event);

    if (pi.stroke) {
      console.error(`Pointer ${event.pointerId} already has a stroke. Discarding.`);
      pi.stroke.abort();
      delete pi.stroke;
    }
    const clientRect = this.$canvas.getBoundingClientRect();
    pi.stroke = SvgStroke.create(this.$canvas);
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
      const clientRect = this.$canvas.getBoundingClientRect();
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
    const clientRect = this.$canvas.getBoundingClientRect();
    stroke.end(event, clientRect);
    delete pi.stroke;

    const strokesStyle = this.notebookView.openNotebook.findStyle({ role: 'REPRESENTATION', subrole: 'INPUT', type: 'STROKES' }, this.styleId);
    if (!strokesStyle) { throw new Error("Stroke cell doesn't have REPRESENTATION|INPUT/STROKES substyle."); }
    const data: DrawingData = strokesStyle.data;
    data.strokeGroups[0].strokes.push(stroke.data); // REVIEW: Modifying existing data in place???

    this.notebookView.changeStyle(strokesStyle.id, data)
    .catch(err=>{
      // TODO: Display error to user?
      console.error(`Error submitting stroke: ${err.message}`);
    });
  }

  private onSelectorChange(event: Event /* REVIEW: More specific event? */): void {
    const role = <StyleRole>(<HTMLSelectElement>event.target).value;
    const subrole = 'UNKNOWN';
    const changeRequest: NotebookChangeRequest = { type: 'convertStyle', styleId: this.styleId, role, subrole };
    this.notebookView.openNotebook.sendChangeRequest(changeRequest, { wantUndo: true });
  }

  private onSubselectorChange(event: Event /* REVIEW: More specific event? */): void {
    const [ role, subrole ] = <[StyleRole,StyleSubrole]>((<HTMLSelectElement>event.target).value.split('|'));
    const changeRequest: NotebookChangeRequest = { type: 'convertStyle', styleId: this.styleId, role, subrole };
    this.notebookView.openNotebook.sendChangeRequest(changeRequest, { wantUndo: true });
  }
}

