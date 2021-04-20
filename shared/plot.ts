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

import { CellObject, CellId, CellType, renderBaseCell } from "./cell";
import { SvgMarkup } from "./svg";
import { FormulaObject, FormulaSymbol } from "./formula";

// Types

export interface PlotCellObject extends CellObject {
  type: CellType.Plot,
  formula: FormulaObject,
  formulaCellId: CellId,
  formulaSymbol: FormulaSymbol,
  plotMarkup: SvgMarkup,
}

// Exported Functions

export function renderPlotCell(obj: PlotCellObject): SvgMarkup {
  return renderBaseCell(obj, obj.plotMarkup);
}
