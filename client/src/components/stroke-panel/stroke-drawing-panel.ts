/*
Euler Notebook
Copyright (C) 2019-21 Public Invention
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

import * as debug1 from "debug";
const debug = debug1('client:stylus-drawing-panel');

import { Html, CssClass } from "../../shared/common";

import { DebugConsole } from "../../components/debug-console";

import { SvgStroke } from "../../svg-stroke";
import { showError } from "../../error-handler";
import { SvgElement } from "../../svg-element";
import { notebookUpdateSynopsis } from "../../shared/debug-synopsis";
import { NotebookUpdate } from "../../shared/server-responses";


// Types

// REVIEW: These types are duplicated in stylus-input-panel.ts.

type PointerId = number;
type PointerMap = Map<PointerId, PointerInfo>;
type StrokeCallbackFn = (stroke: SvgStroke)=>Promise<void>;

interface PointerInfo {
  stroke: SvgStroke;
}

// Constants

// Class

// Exported Class

export class StrokeDrawingPanel extends SvgElement<'svg'> {

  // Public Class Methods

  // Public Constructor

  public constructor(
    strokeCallbackFn: StrokeCallbackFn,
  ) {
    debug(`Creating instance`)
    super({
      tag: 'svg',
      attrs: { height: "100%", width: "100%" },
      class: <CssClass>'strokeDrawingPanel',
      listeners: {
        pointercancel:  e=>this.onPointerCancel(e),
        pointerdown:    e=>this.onPointerDown(e),
        // pointerenter:   e=>this.onPointerEnter(e),
        // pointerleave:   e=>this.onPointerLeave(e),
        pointermove:    e=>this.onPointerMove(e),
        // pointerout:     e=>this.onPointerOut(e),
        // pointerover:    e=>this.onPointerOver(e),
        pointerup:      e=>this.onPointerUp(e),
      }
    });

    this.pointerMap = new Map();
    this.strokeCallbackFn = strokeCallbackFn;
  }

  // Public Instance Methods

  // Public Instance Event Handlers

  public onUpdate(update: NotebookUpdate, _ownRequest: boolean): void {
    debug(`onUpdate ${notebookUpdateSynopsis(update)}`);
    // switch (update.type) {
    //   default: /* Nothing to do. */ break;
    // }
  };

  // --- PRIVATE ---

  // Private Instance Properties

  private pointerMap: PointerMap;
  private strokeCallbackFn: StrokeCallbackFn;

  // Private Instance Property Functions

  // Private Instance Event Handlers

  private onPointerCancel(event: PointerEvent): void {
    const pointerId = event.pointerId;
    const message = `${event.pointerType} ${pointerId} ${event.type}`;
    debug(message);
    DebugConsole.addMessage(<Html>message);

    this.pointerMap.delete(pointerId);
    this.$elt.releasePointerCapture(pointerId);
  }

  private onPointerDown(event: PointerEvent): void {

    // Don't draw strokes with touch
    // so we don't get stray marks when the user tries to scroll.
    if (event.pointerType === 'touch') {
      DebugConsole.addMessage(<Html>`Ignoring touch ${event.type} ${event.pointerId}`);
      return;
    }

    // Log the event for debugging
    const pointerId = event.pointerId;
    const message = `${event.pointerType} ${pointerId} ${event.type}`;
    debug(message);
    DebugConsole.addMessage(<Html>message);

    // Ensure there is not already a stroke in progress for this pointer.
    // If there is, warn and discard it.
    const existingPi = this.pointerMap.get(pointerId);
    if (existingPi) {
      console.error(`Pointer ${pointerId} already has a stroke. Discarding.`);
      existingPi.stroke.abort();
    }

    this.$elt.setPointerCapture(pointerId);
    const clientRect = this.$elt.getBoundingClientRect();
    const stroke = SvgStroke.create(this.$elt);
    stroke.start(event, clientRect);
    const pi: PointerInfo = { stroke };
    this.pointerMap.set(pointerId, pi);
  }

  // private onPointerEnter(_event: PointerEvent): void {
  //   debug(`${event.pointerType} ${event.pointerId} ${event.type}`);
  //   // console.dir(event);
  // }

  // private onPointerLeave(_event: PointerEvent): void {
  //   debug(`${event.pointerType} ${event.pointerId} ${event.type}`);
  //   // console.dir(event);
  // }

  private onPointerMove(event: PointerEvent): void {
    // Check if we are extending a stroke. If not, abort.
    const pi = this.pointerMap.get(event.pointerId);
    if (!pi) { return; }

    // // Log the event for debugging
    // const message = `${event.pointerType} ${event.pointerId} ${event.type}`;
    // debug(message);
    // DebugConsole.addMessage(<Html>message);

    // Extend the stroke to the new (x,y) position
    const clientRect = this.$elt.getBoundingClientRect();
    pi.stroke.extend(event, clientRect);
  }

  // private onPointerOut(_event: PointerEvent): void {
  //   debug(`${event.pointerType} ${event.pointerId} ${event.type}`);
  //   // console.dir(event);
  // }

  // private onPointerOver(_event: PointerEvent): void {
  //   debug(`${event.pointerType} ${event.pointerId} ${event.type}`);
  //   // console.dir(event);
  // }

  private onPointerUp(event: PointerEvent): void {
    // Check if we are finishing a stroke. If not, abort.
    // REVIEW: Remove pointer info from pointer map??
    const pointerId = event.pointerId;
    const pi = this.pointerMap.get(pointerId);
    if (!pi) { return; }

    // Log the event for debugging
    const message = `${event.pointerType} ${pointerId} ${event.type}`;
    debug(message);
    DebugConsole.addMessage(<Html>message);

    // Complete the stroke
    const stroke = pi.stroke;
    const clientRect = this.$elt.getBoundingClientRect();
    stroke.end(event, clientRect);
    this.pointerMap.delete(pointerId);
    this.$elt.releasePointerCapture(pointerId);

    // Notify the container that the stroke is finished.
    // Once the container has updated the underlying drawing, we can remove the stroke.
    debug(`Calling stroke callback function: ${JSON.stringify(stroke)}`);
    this.strokeCallbackFn(stroke)
    .then(
      ()=>stroke.remove(),
      (err)=>showError(err, <Html>"Error updating stroke"),
    );
  }

}

