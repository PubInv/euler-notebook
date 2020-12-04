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

import { Stroke as MyScriptStroke } from "./myscript-types";

// Types

export type StrokeId = number;

export type StrokeRelativePosition = StrokeId | StrokePosition;

export enum StrokePosition {
  Top = 0,
  Bottom = -1,
}

export interface StrokeData {
  nextId: StrokeId;
  strokes: Stroke[];
}

export interface Stroke extends MyScriptStroke {
  id: StrokeId;
}

// Constants

export const EMPTY_STROKE_DATA: StrokeData = {
  nextId: 1,
  strokes: [],
}

// Exported Functions
