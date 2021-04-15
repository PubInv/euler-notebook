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

import { SvgMarkup, EMPTY_SVG_MARKUP } from "./common";
import { CellObject, CellType, renderBaseCell } from "./cell";
// import { DiagramItemBlock } from "./myscript-types";

// Types

// export type FigureContent = DiagramItemBlock[];
export type FigurePresentation = SvgMarkup;

export interface FigureCellObject extends CellObject {
  type: CellType.Figure,
  figure: FigureObject,
}

export interface FigureObject {
  // content: FigureContent;
  presentation: FigurePresentation;
}

// Constants

export const EMPTY_FIGURE_OBJECT = {
  presentation: EMPTY_SVG_MARKUP,
};

// Exported Functions

export function renderFigureCell(obj: FigureCellObject): SvgMarkup {
  const markup = renderFigure(obj.figure);
  return renderBaseCell(obj, markup);
}

// Helper Functions

function renderFigure(figure: FigureObject): SvgMarkup {
  return figure.presentation;
}
