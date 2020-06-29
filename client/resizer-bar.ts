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

// TODO: Don't let shrink to conceal any ink.

// Requirements

import { $new } from './dom.js';

// Types

// REVIEW: These types are duplicated in stylus-input-panel.ts.

type InsertCallbackFn = ()=>void;
type PointerId = number;
type PointerMap = Map<PointerId, PointerInfo>;
type ResizeCallbackFn = (deltaY: number, final: boolean)=>void;

interface PointerInfo {
  clientY: number;
  lastDeltaY: number;
}

// Constants

// Class

// Exported Class

export class ResizerBar  {

  // Class Methods

  public static create(
    $parentElt: Element,
    resizeCallbackFn: ResizeCallbackFn,
    insertCallbackFn: InsertCallbackFn,
  ): ResizerBar {
    return new this($parentElt, resizeCallbackFn, insertCallbackFn);
  }

  // -- PRIVATE --

  // Private Constructor

  private constructor(
    $parentElt: Element,
    resizeCallbackFn: ResizeCallbackFn,
    insertCallbackFn: InsertCallbackFn,
  ) {
    this.resizeCallbackFn = resizeCallbackFn;

    this.pointerMap = new Map();

    this.$elt = $new<HTMLDivElement>('div', {
      appendTo: $parentElt,
      class: 'resizeBar',
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

    $new('button', {
      appendTo: this.$elt,
      attrs: { tabindex: -1 },
      class: 'insertCellBelowButton',
      html: '&#x25B6;',
      listeners: { click: _e=>insertCallbackFn() },
    });

  }

  // Private Instance Properties

  private $elt: HTMLDivElement;
  private pointerMap: PointerMap;
  private resizeCallbackFn: ResizeCallbackFn;

  // Private Instance Property Functions

  // Private Instance Methods

  // Private Instance Event Handlers

  private onPointerCancel(event: PointerEvent): void {
    // console.log(`${event.pointerType} ${event.pointerId} ${event.type}`);
    // console.dir(event);
    if (!this.pointerMap.delete(event.pointerId)) {
      console.warn(`Unknown pointer ID on pointer cancel: ${event.pointerId}`);
      return;
    }
    this.$elt.releasePointerCapture(event.pointerId);
    // REVIEW: Abort resizing callback?
  }

  private onPointerDown(event: PointerEvent): void {
    if (event.target !== this.$elt) {
      // User clicked on insert button.
      return;
    }
    // console.log(`${event.pointerType} ${event.pointerId} ${event.type}`);
    // console.dir(event);
    this.$elt.setPointerCapture(event.pointerId);

    const pi: PointerInfo = {
      clientY: event.clientY,
      lastDeltaY: 0,
    };
    this.pointerMap.set(event.pointerId, pi);
  }

  // private onPointerEnter(event: PointerEvent): void {
  //   console.log(`${event.pointerType} ${event.pointerId} ${event.type}`);
  //   // console.dir(event);
  // }

  // private onPointerLeave(event: PointerEvent): void {
  //   console.log(`${event.pointerType} ${event.pointerId} ${event.type}`);
  //   // console.dir(event);
  // }

  private onPointerMove(event: PointerEvent): void {
    // console.dir(`${event.pointerType} ${event.pointerId} ${event.type}`);
    const pi = this.pointerMap.get(event.pointerId);
    if (!pi) { /* Pointer is not down */ return; }

    // Call the resize callback unless the vertical displacement hasn't changed.
    const totalDeltaY = Math.round(event.clientY-pi.clientY);
    if (totalDeltaY != pi.lastDeltaY) {
      const deltaY = totalDeltaY - pi.lastDeltaY;
      pi.lastDeltaY = totalDeltaY;
      this.resizeCallbackFn(deltaY, false);
    }
  }

  // private onPointerOut(event: PointerEvent): void {
  //   console.log(`${event.pointerType} ${event.pointerId} ${event.type}`);
  //   // console.dir(event);
  // }

  // private onPointerOver(event: PointerEvent): void {
  //   console.log(`${event.pointerType} ${event.pointerId} ${event.type}`);
  //   // console.dir(event);
  // }

  private onPointerUp(event: PointerEvent): void {

    const pi = this.pointerMap.get(event.pointerId);
    if (!pi) {
      // User clicked on insert button, or started the mouse press on another element.
      return;
    }

    // console.log(`${event.pointerType} ${event.pointerId} ${event.type}`);
    // console.dir(event);

    this.pointerMap.delete(event.pointerId);
    this.$elt.releasePointerCapture(event.pointerId);

    const totalDeltaY = Math.round(event.clientY-pi.clientY);
    const deltaY = totalDeltaY - pi.lastDeltaY;
    this.resizeCallbackFn(deltaY, true);
  }

}

