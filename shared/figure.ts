/*
Euler Notebook
Copyright (C) 2021 Public Invention
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

import { CellObject, CellType, renderBaseCell } from "./cell";
import { assertFalse, notImplementedError, SvgMarkup } from "./common";

// Types

export interface FigureCellObject extends CellObject {
  type: CellType.Figure,
  figure: FigureObject,
}

export interface FigureObject {
  elements: DiagramItemBlock[];
}

// MyScript JIIX Diagram Item types:

export type DiagramItemBlock =
    ArcItemBlock |
    CircleItemBlock |
    DoodleItemBlock |
    EllipseItemBlock |
    LineItemBlock |
    PolyedgeItemBlock |
    PolygonItemBlock |
    RectangleItemBlock |
    RhombusItemBlock |
    TextItemBlock;

interface ArcItemBlock extends EdgeItemBlockBase {
  kind: "arc";
  connected: number[];
  ports: number[];
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  phi: number;
  startAngle: number;
  sweepAngle: number;
}

interface CircleItemBlock extends NodeItemBlockBase {
  kind: "circle";
  cx: number;
  cy: number;
  r: number;
}

interface DoodleItemBlock extends NodeItemBlockBase {
  kind: "rhombus";
  // TODO: points:
}

interface EllipseItemBlock extends NodeItemBlockBase {
  kind: "ellipse";
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

interface DiagramItemBlockBase {
  id: number;
}

interface EdgeItemBlockBase extends DiagramItemBlockBase {
  type: "Edge";
}

interface LineItemBlock extends EdgeItemBlockBase {
  kind: "line";
  connected: number[];
  ports: number[];
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface NodeItemBlockBase extends DiagramItemBlockBase {
  type: "Node";
}

interface PolyedgeItemBlock extends DiagramItemBlockBase {
  type: "Polyedge";
}

interface PolygonItemBlock extends NodeItemBlockBase {
  kind: "polygon";
  // TODO: points[]
}

interface RectangleItemBlock extends NodeItemBlockBase {
  kind: "rectangle";
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RhombusItemBlock extends NodeItemBlockBase {
  kind: "rhombus";
  // TODO: points[]
}

interface TextItemBlock extends DiagramItemBlockBase {
  type: "Text";
}

// Constants

export const EMPTY_FIGURE_OBJECT = {
  elements: [],
};

// REVIEW: Why does MyScript return things scaled down by 1/4?
const SCALE_FACTOR = 4;

// Exported Functions

export function renderFigureCell(obj: FigureCellObject): SvgMarkup {
  const markup = renderFigure(obj.figure);
  return renderBaseCell(obj, <SvgMarkup>markup);
}

// Helper Functions

function renderFigure(figure: FigureObject): SvgMarkup {
  let markup = '';
  for (const element of figure.elements) {
    switch(element.type) {
      case 'Edge': {
        switch(element.kind) {
          case 'line': {
            notImplementedError("Line edge figure element");
            break;
          }
          case 'arc': {
            notImplementedError("Arc edge figure element");
            break;
          }
          default: assertFalse();
        }
        break;
      }
      case 'Node': {
        switch(element.kind) {
          case 'circle': {
            const { cx, cy, r } = element;
            markup += `<circle cx="${scale(cx)}" cy="${scale(cy)}" r="${scale(r)}"/>`
            break;
          }
          case 'ellipse': {
            const { cx, cy, rx, ry } = element;
            markup += `<ellipse cx="${scale(cx)}" cy="${scale(cy)}" rx="${scale(rx)}" ry="${scale(ry)}"/>`
           break;
          }
          case 'polygon': {
            notImplementedError("Polygon figure element");
            break;
          }
          case 'rectangle': {
            const { x, y, width, height } = element;
            markup += `<rect x="${scale(x)}" y="${scale(y)}" width="${scale(width)}" height="${scale(height)}"/>`
            break;
          }
          case 'rhombus': {
            notImplementedError("Rhombus figure element");
            break;
          }
          default: assertFalse();
        }
        break;
      }
      case 'Polyedge': {
        notImplementedError("Polyedge figure elements");
        break;
      }
      default: assertFalse();
    }
  }
  return <SvgMarkup>markup;
}

function scale(n: number): number {
  return Math.round(n*SCALE_FACTOR);
}