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

import { NotebookChangeRequest } from "./client-requests";
import {  Html, PlainText } from "./common";
import { CssSize } from "./css";
import { MathMlTree } from "./mathml";
import { convertStrokeToPath, StrokeData } from "./stylus";
import { SvgMarkup } from "./svg";

// Types

export type CellId = number;
export type CellIndex = number; // Position of cell in the notebook. 0 is first cell.
export type PageIndex = number;
export type CellRelativePosition = CellId | CellPosition; // Position relative to another cell, or at the top or bottom of the notebook.
export type SuggestionId = '{SuggestionId}';
export type SuggestionClass = '{SuggestionClass}';
export type Suggestions = SuggestionObject[];

export const CELL_SOURCES = [
  'SYSTEM',
  'USER',
] as const;
export type CellSource = typeof CELL_SOURCES[number];

export enum CellPosition {
  Top = 0,
  Bottom = -1,
}

export enum CellType {
  Formula = 1,
  Text = 2,
  Figure = 3,
  Plot = 4,
}

export interface CellObject {
  id: CellId;
  type: CellType;
  cssSize: CssSize;
  inputText: PlainText;
  source: CellSource;
  strokeData: StrokeData;
  suggestions: Suggestions;
}

interface SuggestionDisplay {
  formulaMathMlTree?: MathMlTree;
  html?: Html;
  svg?: SvgMarkup;
}

export interface SuggestionObject {
  id: SuggestionId;
  class?: SuggestionClass;
  changeRequests: NotebookChangeRequest[];
  display: SuggestionDisplay;
}

// Exported Functions

export function renderBaseCell(obj: CellObject, inheritedMarkup: SvgMarkup): SvgMarkup {
  const strokeMarkup = <SvgMarkup>obj.strokeData.strokes.map(stroke=>convertStrokeToPath(obj.id, stroke)).join('\n');
  return <SvgMarkup>(inheritedMarkup + strokeMarkup);
}
