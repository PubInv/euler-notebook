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

import { CellId } from "./cell";
import { ElementId } from "./common";
import { SvgMarkup } from "./svg";
import { Stroke, StrokeId } from "./myscript-types";

// Types

export type { Stroke, StrokeId }

type PathDAttribute = '{PathDAttribute}';

export type StrokeRelativePosition = StrokeId | StrokePosition;

export enum StrokePosition {
  Top = 0,
  Bottom = -1,
}

export interface StrokeData {
  nextId: number;
  strokes: Stroke[];
}

// Constants

export const EMPTY_STROKE_DATA: StrokeData = {
  nextId: 1,
  strokes: [],
}

// Exported Functions

export function convertStrokeToPath(cellId: CellId, stroke: Stroke): SvgMarkup {
  const shape = convertStrokeToPathShape(stroke);
  return <SvgMarkup>`<path id="${strokePathId(cellId, stroke.id)}" d="${shape}"></path>`;
}

export function convertStrokeToPathShape(stroke: Stroke): PathDAttribute {
  if (stroke.x.length<2) {
    console.warn(`Have a stroke with too few data points: ${stroke.x.length}`)
    return <PathDAttribute>"";
  }
  let shape: PathDAttribute = <PathDAttribute>`M${stroke.x[0]} ${stroke.y[0]}`;
  for (let i=1; i<stroke.x.length; i++) {
    shape += ` L${stroke.x[i]} ${stroke.y[i]}`
  }
  return shape;
}

export function renderStrokesToSvg(strokeData: StrokeData, cellId: CellId): SvgMarkup {
  return <SvgMarkup>strokeData.strokes.map(stroke=>convertStrokeToPath(cellId, stroke)).join('\n');
}

export function strokePathId(cellId: CellId, strokeId?: StrokeId): ElementId {
  return <ElementId>`c${cellId}s${strokeId}`;
}

// Helper Functions

// function convertStrokesToSvg(cellId: CellId, cssSize: CssSize, strokeData: StrokeData): SvgMarkup {
//   const paths: string[] = [];
//   for (const stroke of strokeData.strokes) {
//     const path = convertStrokeToPath(cellId, stroke);
//     paths.push(path);
//   }
//   const svgMarkup = <SvgMarkup>`<svg class="svgPanel" height="${cssSize.height}" width="${cssSize.width}" fill="none" stroke="black">${paths.join('')}</svg>`;
//   return svgMarkup;
// }
