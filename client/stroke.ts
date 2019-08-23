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

import { $newSvg } from './dom.js';

// Exported Class

export class Stroke {

  // Class Methods

  public static start($svg: SVGSVGElement, event: PointerEvent, clientRect: ClientRect): Stroke {
    const instance = new this($svg, event, clientRect,);
    return instance;
  }

  // Instance Methods

  public abort(): void {
    // TODO: remove stroke from SVG.
  }

  public end(event: PointerEvent, clientRect: ClientRect): void {
    this.extend(event, clientRect);
  }

  public extend(event: PointerEvent, clientRect: ClientRect): void {
    this.pushEventCoordinates(event, clientRect);
    const l = this.x.length;
    const dx = this.x[l-1] - this.x[l-2];
    const dy = this.y[l-1] - this.y[l-2];
    this.pathData += `l${round(dx)},${round(dy)}`;
    this.$path.setAttribute('d', this.pathData);
  }

  // ----- Private -----

  // Private Constructor

  private constructor($svg: SVGSVGElement, event: PointerEvent, clientRect: ClientRect) {
    this.x = [];
    this.y = [];
    this.t = [];
    this.p = [];
    this.tx = [];
    this.ty = [];
    this.pushEventCoordinates(event, clientRect);
    this.pathData = `M${round(this.x[0])},${round(this.y[0])}`;
    this.$path = $newSvg<SVGPathElement>('path', {
      attrs: { d: this.pathData },
      appendTo: $svg,
    });
  }

  // Private Instance Properties

  private $path: SVGPathElement;
  private pathData: string;

  private x: number[];
  private y: number[];
  private t: number[]; // TYPESCRIPT: Timestamp
  private p: number[];  // Pressure
  private tx: number[]; // Tilt
  private ty: number[];

  // Private Instance Methods

  private pushEventCoordinates(event: PointerEvent, clientRect: ClientRect): void {
    this.x.push(event.clientX - clientRect.left);
    this.y.push(event.clientY - clientRect.top);
    this.t.push(Date.now());
    this.p.push(event.pressure);
    this.tx.push(event.tiltX);
    this.ty.push(event.tiltY);
  }
}

// Helper Functions

function round(x: number): string {
  return (Math.round(x*100)/100).toString();
}

