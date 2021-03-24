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

import { CssClass, ElementId, Html } from "../../shared/common";
import { convertStrokeToPathShape, Stroke, StrokeData, StrokeId } from "../../shared/stylus";
import { NotebookUpdate } from "../../shared/server-responses";
import { notebookUpdateSynopsis } from "../../shared/debug-synopsis";

import { SvgElement } from "../../svg-element";
import { $newSvg, $svg } from "../../dom";
import { showError } from "../../error-handler";

// Types

// REVIEW: These types are duplicated in stylus-input-panel.ts.

type PointerId = number;
type PointerMap = Map<PointerId, PointerInfo>;
type EraseCallbackFn = (strokeId: StrokeId)=>Promise<void>;

interface PointerInfo {
  $downElt?: SVGPathElement;
  strokeId?: StrokeId;
}

// Constants

const STROKE_ID_RE = /^S(\d+)$/;

// Class

// Exported Class

export class StrokeSelectionPanel extends SvgElement<'svg'> {

  // Public Class Methods

  // Public Constructor

  public constructor(
    strokeData: StrokeData,
    eraseCallbackFn: EraseCallbackFn,
  ) {
    debug(`Creating instance`)
    super({
      tag: 'svg',
      attrs: { height: "100%", width: "100%" },
      class: <CssClass>'strokeSelectionPanel',
      listeners: {
        pointercancel:  e=>this.onPointerCancel(e),
        pointerdown:    e=>this.onPointerDown(e),
        // pointerenter:   e=>this.onPointerEnter(e),
        // pointerleave:   e=>this.onPointerLeave(e),
        // pointermove:    e=>this.onPointerMove(e),
        // pointerout:     e=>this.onPointerOut(e),
        // pointerover:    e=>this.onPointerOver(e),
        pointerup:      e=>this.onPointerUp(e),
      }
    });

    this.pointerMap = new Map();
    this.eraseCallbackFn = eraseCallbackFn;
    this.insertStrokes(strokeData);
  }

  // Public Instance Methods

  // Public Instance Event Handlers

  public onUpdate(update: NotebookUpdate, _ownRequest: boolean): void {
    debug(`onUpdate ${notebookUpdateSynopsis(update)}`);
    switch (update.type) {
      case 'textTypeset':
      case 'formulaTypeset':
        this.deleteAllStrokes();
        this.insertStrokes(update.strokeData);
        break;
      case 'strokeDeleted':
        this.deleteStroke(update.strokeId);
        break;
      case 'strokeInserted':
        this.insertStroke(update.stroke);
        break;
      default: /* Nothing to do. */ break;
    }
  };

  // --- PRIVATE ---

  // Private Instance Properties

  private pointerMap: PointerMap;
  private eraseCallbackFn: EraseCallbackFn;

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

  private deleteAllStrokes(): void {
    this.$elt.innerHTML = '';
  }

  private deleteStroke(strokeId: StrokeId): void {
    const $path = $svg(this.$elt, `#S${strokeId}`);
    $path.remove();
  }

  private insertStroke(stroke: Stroke): void {
    const d = convertStrokeToPathShape(stroke);
    const $path = $newSvg({
      tag: 'path',
      id: <ElementId>`S${stroke.id}`,
      attrs: { d },
    });
    this.$elt.append($path);
  }

  private insertStrokes(strokeData: StrokeData): void {
    for (const stroke of strokeData.strokes) {
      this.insertStroke(stroke);
    }
  }

  private releaseCapture(pointerId: PointerId, pi: PointerInfo): void {
    this.$elt.releasePointerCapture(pointerId);
    delete pi.$downElt;
    delete pi.strokeId;
  }

  private setCapture(
    pointerId: PointerId,
    pi: PointerInfo,
    $downElt: SVGPathElement,
    strokeId: StrokeId,
  ): void {
    if (pi.$downElt) {
      console.warn(`Pointer down on captured pointer.`);
      return;
    }
    this.$elt.setPointerCapture(pointerId);
    pi.$downElt = $downElt;
    pi.strokeId = strokeId;
  }

  // Private Instance Event Handlers

  private onPointerCancel(event: PointerEvent): void {
    debug(`${event.pointerType} ${event.pointerId} ${event.type}`);
    const pi = this.pointerInfo(event);
    if (pi.$downElt) {
      this.releaseCapture(event.pointerId, pi);
    }
  }

  private onPointerDown(event: PointerEvent): void {
    debug(`${event.pointerType} ${event.pointerId} ${event.type}`);
    // console.dir(event);
    const pi = this.pointerInfo(event);
    const $downElt = document.elementFromPoint(event.x, event.y);
    if ($downElt && $downElt.tagName == 'path') {
      const match = STROKE_ID_RE.exec($downElt.id);
      if (match) {
        const strokeId = parseInt(match[1], 10);
        this.setCapture(event.pointerId, pi, <SVGPathElement>$downElt, strokeId);
      }
    }
  }

  // private onPointerEnter(_event: PointerEvent): void {
  //   debug(`${event.pointerType} ${event.pointerId} ${event.type}`);
  //   // console.dir(event);
  // }

  // private onPointerLeave(_event: PointerEvent): void {
  //   debug(`${event.pointerType} ${event.pointerId} ${event.type}`);
  //   // console.dir(event);
  // }

  // private onPointerMove(_event: PointerEvent): void {
  //   // console.dir(event);
  // }

  // private onPointerOut(_event: PointerEvent): void {
  //   debug(`${event.pointerType} ${event.pointerId} ${event.type}`);
  //   // console.dir(event);
  // }

  // private onPointerOver(_event: PointerEvent): void {
  //   debug(`${event.pointerType} ${event.pointerId} ${event.type}`);
  //   // console.dir(event);
  // }

  private onPointerUp(event: PointerEvent): void {
    debug(`${event.pointerType} ${event.pointerId} ${event.type}`);
    // console.dir(event);
    const pi = this.pointerInfo(event);
    if (pi.$downElt) {
      const $upElt = document.elementFromPoint(event.x, event.y);
      if ($upElt === pi.$downElt) {
        this.eraseCallbackFn(pi.strokeId!)
        .catch(
          (err)=>showError(err, <Html>"Error erasing stroke"),
        )
      } else {
        // REVIEW: What to do? Down on one element, up on another.
      }
      this.releaseCapture(event.pointerId, pi);
    }
  }

}

