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

import { assertFalse, chunkArray, escapeHtml, notImplementedError, PlainText, SvgMarkup } from "./common";
import { CellObject, CellType, renderBaseCell } from "./cell";

// Types

export interface FigureCellObject extends CellObject {
  type: CellType.Figure,
  figure: FigureObject,
}

export interface FigureObject {
  elements: DiagramItemBlock[];
}

// MyScript JIIX Diagram Item types:

type ItemId = number;
type EdgeItem = ArcItemBlock | LineItemBlock;

interface BoundingBox {
  x: number,
  y: number,
  width: number,
  height: number,
}

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
    TextItemBlock |
    TriangleItemBlock;

interface DiagramItemBlockBase {
  id: ItemId;
  parent?: ItemId;
  'bounding-box': BoundingBox;
}

interface EdgeItemBlockBase extends DiagramItemBlockBase {
  type: "Edge";
}
interface ArcItemBlock extends EdgeItemBlockBase {
  kind: "arc";
  connected: ItemId[];
  ports: number[];
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  phi: number;
  startAngle: number;
  sweepAngle: number;
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
interface ItemWithPointsBase {
  points: number[];
}
interface CircleItemBlock extends NodeItemBlockBase {
  kind: "circle";
  cx: number;
  cy: number;
  r: number;
}
interface DoodleItemBlock extends NodeItemBlockBase {
  kind: "doodle";
  // TODO: points:
}
interface EllipseItemBlock extends NodeItemBlockBase {
  kind: "ellipse";
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}
interface PolygonItemBlock extends NodeItemBlockBase, ItemWithPointsBase {
  kind: "polygon";
}
interface RectangleItemBlock extends NodeItemBlockBase {
  kind: "rectangle";
  x: number;
  y: number;
  width: number;
  height: number;
}
interface RhombusItemBlock extends NodeItemBlockBase, ItemWithPointsBase {
  kind: "rhombus";
}
interface TriangleItemBlock extends NodeItemBlockBase, ItemWithPointsBase {
  kind: "triangle";
}

interface PolyedgeItemBlock extends DiagramItemBlockBase {
  type: "Polyedge";
  connected: ItemId[];
  edges: EdgeItem[];
}

interface TextItemBlock extends DiagramItemBlockBase {
  type: "Text";
  label: PlainText;
  words: WordInfo[];
}


interface WordInfo {
  label: PlainText;
  candidates: PlainText[];
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

function renderFigureElement(element: DiagramItemBlock): SvgMarkup {
  // REVIEW: Why do we need to scale the coordinates? Can we pass some parameters to MyScript to prevent the scaling?
  //         Alternatively, scale the values when they come back from recognition so we don't have to scale them at rendering time.
  let markup: string;
  switch(element.type) {
    case 'Edge': {
      switch(element.kind) {
        case 'line': {
          // TODO: arrow heads
          const { x1, y1, x2, y2 } = element;
          markup = `<line x1="${scale(x1)}" y1="${scale(y1)}" x2="${scale(x2)}" y2="${scale(y2)}"/>`;
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
          markup = `<circle cx="${scale(cx)}" cy="${scale(cy)}" r="${scale(r)}"/>`
          break;
        }
        case 'ellipse': {
          const { cx, cy, rx, ry } = element;
          markup = `<ellipse cx="${scale(cx)}" cy="${scale(cy)}" rx="${scale(rx)}" ry="${scale(ry)}"/>`
         break;
        }
        case 'polygon':
        case 'rhombus':
        case 'triangle': {
          const pointsString = chunkArray(element.points, 2).map(([x,y])=>`${scale(x)},${scale(y)}`).join(' ');
          markup = `<polygon points="${pointsString}"/>`
          break;
        }
        case 'rectangle': {
          const { x, y, width, height } = element;
          markup = `<rect x="${scale(x)}" y="${scale(y)}" width="${scale(width)}" height="${scale(height)}"/>`
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
    case 'Text': {
      // TODO: Font size.
      const { 'bounding-box': boundingBox, label } = element;
      const x = boundingBox.x;
      const y = boundingBox.y + boundingBox.height;
      // LATER: Make alternatives available to the user.
      markup = `<text x="${scale(x)}" y="${scale(y)}">${escapeHtml(label)}</text>`;
      break;
    }
    default: assertFalse();
  }
  return <SvgMarkup>markup;
}

function renderFigure(figure: FigureObject): SvgMarkup {
  return <SvgMarkup>figure.elements.map(renderFigureElement).join('');
}

function scale(n: number): number {
  return Math.round(n*SCALE_FACTOR);
}