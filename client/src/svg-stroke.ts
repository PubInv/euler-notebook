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

import { $newSvg } from "./dom";
import { Stroke, StrokeId } from "./shared/stylus";

// Types

// Exported Class

export class SvgStroke {

  // Class Methods

  public static create($container: SVGSVGElement): SvgStroke {
    return new this($container);
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
    // REVIEW: Do we ever trivially extend the stroke? I.E. dx == dy == 0.
    //         Should we detect that case and do something about it?
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

  public remove(): void {
    this.$path.remove();
  }

  // ----- Private -----

  // Private Constructor

  private constructor($container: SVGSVGElement) {
    this.$path = $newSvg({ tag: 'path', appendTo: $container });
    this.pathData = '';
    this.data = { id: <StrokeId>'0', x: [], y: [], /* TODO: t: [], p: [], tx: [], ty: [] */};
  }

  // Private Instance Properties

  private $path: SVGPathElement;
  private pathData: string;

  // Private Instance Methods

  private extendPath(dx: number, dy: number): void {
    this.pathData += `l${roundToTwoDecimalPlaces(dx)},${roundToTwoDecimalPlaces(dy)}`;
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
    this.pathData = `M${roundToTwoDecimalPlaces(x)},${roundToTwoDecimalPlaces(y)}`;
  }

  private updatePathAttribute(): void {
    this.$path.setAttribute('d', this.pathData);
  }
}

// Helper Functions

function roundToTwoDecimalPlaces(x: number): string {
  return (Math.round(x*100)/100).toString();
}
