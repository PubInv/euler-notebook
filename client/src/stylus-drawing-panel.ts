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

import * as debug1 from "debug";
const debug = debug1('client:stylus-drawing-panel');

import { SvgStroke } from "./svg-stroke";
import { reportError } from "./error-handler";
import { Html } from "./shared/common";
import { SvgElement } from "./svg-element";
import { CssLengthProperty } from "./dom";


// Types

// REVIEW: These types are duplicated in stylus-input-panel.ts.

type PointerId = number;
type PointerMap = Map<PointerId, PointerInfo>;
type StrokeCallbackFn = (stroke: SvgStroke)=>Promise<void>;

interface PointerInfo {
  stroke?: SvgStroke;
}

// Constants

// Class

// Exported Class

export class StylusDrawingPanel extends SvgElement<'svg'> {

  // Public Class Methods

  // Public Constructor

  public constructor(
    width: CssLengthProperty,
    height: CssLengthProperty,
    strokeCallbackFn: StrokeCallbackFn,
  ) {
    debug(`Creating instance`)
    super({
      tag: 'svg',
      attrs: { height, width },
      class: 'stylusDrawingPanel',
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

  // --- PRIVATE ---

  // Private Instance Properties

  private pointerMap: PointerMap;
  private strokeCallbackFn: StrokeCallbackFn;

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

  private onPointerCancel(event: PointerEvent): void {
    debug(`${event.pointerType} ${event.pointerId} ${event.type}`);
    // console.dir(event);

    // TODO: Cancel stroke?
  }

  private onPointerDown(event: PointerEvent): void {
    debug(`${event.pointerType} ${event.pointerId} ${event.type}`);
    // console.dir(event);
    this.$elt.setPointerCapture(event.pointerId);
    const pi = this.pointerInfo(event);

    if (pi.stroke) {
      console.error(`Pointer ${event.pointerId} already has a stroke. Discarding.`);
      pi.stroke.abort();
      delete pi.stroke;
    }
    const clientRect = this.$elt.getBoundingClientRect();
    pi.stroke = SvgStroke.create(this.$elt);
    pi.stroke.start(event, clientRect);
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
    // console.dir(event);
    const pi = this.pointerInfo(event);
    if (pi.stroke) {
      const clientRect = this.$elt.getBoundingClientRect();
      pi.stroke.extend(event, clientRect);
    }
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
    // REVIEW: Remove pointer info from pointer map??
    debug(`${event.pointerType} ${event.pointerId} ${event.type}`);
    // console.dir(event);
    const pi = this.pointerInfo(event);
    const stroke = pi.stroke;
    if (!stroke) {
      console.warn(`Pointer ${event.pointerId} doesn't have a stroke. Ignoring.`);
      return;
    }
    const clientRect = this.$elt.getBoundingClientRect();
    stroke.end(event, clientRect);
    delete pi.stroke;

    // Notify the container that the stroke is finished.
    // Once the container has updated the underlying drawing, we can remove the stroke.
    debug(`Calling stroke callback function: ${JSON.stringify(stroke)}`);
    this.strokeCallbackFn(stroke)
    .then(
      ()=>{ stroke.remove(); },
      (err)=>{ reportError(err, <Html>"Error updating stroke"); },
    )


  }

}

