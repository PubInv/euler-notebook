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
import { escapeHtml } from "./common";
import { cssLengthInPixels } from "./css";
import { SvgMarkup } from "./svg";

// Types

export interface TextCellObject extends CellObject {
  type: CellType.Text,
}

// Exported Functions

export function renderTextCell(obj: TextCellObject): SvgMarkup {
  const height = cssLengthInPixels(obj.cssSize.height);
  const fontCapHeight = 12; // TODO:
  const y = Math.round(height/2 + fontCapHeight/2);
  // "Times New Roman",
  const markup = <SvgMarkup>`<text fill="black" font="12pt Times, serif" stroke="none" y="${y}">${escapeHtml(obj.inputText)}</text>`;
  return renderBaseCell(obj, markup);
}
