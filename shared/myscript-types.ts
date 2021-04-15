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