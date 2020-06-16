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

import { $newSvg } from '../dom.js';
import { Stroke } from '../shared/notebook.js';

// Types

// Exported Class

export class SvgStroke {

  // Class Methods

  public static create($svg: SVGSVGElement, data?: Stroke): SvgStroke {
    return new this($svg, data);
  }

  // Instance Properties

  public data: Stroke;

  // Instance Methods

  public abort(): void {
    // TODO: remove stroke from SVG.
  }

  public end(event: PointerEvent, clientRect: ClientRect): void {
    this.extend(event, clientRect);
  }

  public extend(event: PointerEvent, clientRect: ClientRect): void {
    this.pushEventCoordinates(event, clientRect);
    const l = this.data.x.length;
    const dx = this.data.x[l-1] - this.data.x[l-2];
    const dy = this.data.y[l-1] - this.data.y[l-2];
    this.extendPath(dx, dy);
    this.updatePathAttribute();
  }

  public start(event: PointerEvent, clientRect: ClientRect): void {
    this.pushEventCoordinates(event, clientRect);
    this.startPath(this.data.x[0], this.data.y[0]);
    this.updatePathAttribute();
  }

  // ----- Private -----

  // Private Constructor

  private constructor($svg: SVGSVGElement, data?: Stroke) {
    this.$path = $newSvg<SVGPathElement>('path', {
      // attrs: { d: this.pathData },
      appendTo: $svg,
    });
    this.pathData = '';
    if (data) {
      this.data = data; // REVIEW: Deep copy?
      if (data.x.length>0) {
        this.startPath(data.x[0], data.y[0]);
        for (let i = 1; i<data.x.length; i++) {
          this.extendPath(data.x[i]-data.x[i-1], data.y[i]-data.y[i-1]);
        }
        this.updatePathAttribute();
      }
    } else {
      this.data = { x: [], y: [], /* TODO: t: [], p: [], tx: [], ty: [] */};
    }
  }

  // Private Instance Properties

  private $path: SVGPathElement;
  private pathData: string;

  // Private Instance Methods

  private extendPath(dx: number, dy: number): void {
    this.pathData += `l${round(dx)},${round(dy)}`;
  }

  private pushEventCoordinates(event: PointerEvent, clientRect: ClientRect): void {
    this.data.x.push(event.clientX - clientRect.left);
    this.data.y.push(event.clientY - clientRect.top);
    // this.data.t.push(Date.now());
    // this.data.p.push(event.pressure);
    // this.data.tx.push(event.tiltX);
    // this.data.ty.push(event.tiltY);
  }

  private startPath(x: number, y: number): void {
    this.pathData = `M${round(x)},${round(y)}`;
  }

  private updatePathAttribute(): void {
    this.$path.setAttribute('d', this.pathData);
  }
}

// Helper Functions

function round(x: number): string {
  return (Math.round(x*100)/100).toString();
}
