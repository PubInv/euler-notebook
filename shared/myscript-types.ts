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

import { BoundingBox, PlainText } from "./common";

// Exported Types

type PointerType = 'PEN'|'TOUCH'|'ERASER';
export type StrokeId = '{StrokeId}';

export interface StrokeGroup {
  penStyle?: string;
  penStyleClasses?: string;
  strokes: Stroke[];
}

export interface Stroke {
  id: StrokeId; // Optional for MyScript but we are going to require it.
  p?: number[];
  pointerId?: number;
  pointerType?: PointerType;
  t?: number[];
  x: number[];
  y: number[];
}

// JIIX Diagram Item types:

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

type ItemId = number;
type EdgeItem = ArcItemBlock | LineItemBlock;

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
