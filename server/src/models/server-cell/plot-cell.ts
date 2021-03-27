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

// import * as debug1 from "debug";
// const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
// const debug = debug1(`server:${MODULE}`);

import { deepCopy, PlainText, CssLength, SvgMarkup } from "../../shared/common";
import { CellId, CellType, PlotCellObject } from "../../shared/cell";
import { EMPTY_STROKE_DATA } from "../../shared/stylus";

import { ServerNotebook } from "../server-notebook";

import { ServerCell } from "./index";
import { plotFormula } from "../../components/formula-plotter";
import { FormulaSymbol } from "../../shared/formula";
import { ServerFormula } from "../server-formula";
// import { plotUnivariate } from "../adapters/wolframscript";
// import { WolframExpression } from "../shared/formula";

// Constants

const DEFAULT_HEIGHT = <CssLength>"3in";

// Exported Class

export class PlotCell extends ServerCell<PlotCellObject> {

  // Public Class Methods

  public static async plotFormula(notebook: ServerNotebook, formulaCellId: CellId, formula: ServerFormula, formulaSymbol: FormulaSymbol): Promise<PlotCellObject> {

    const plotMarkup = await plotFormula(formula, formulaSymbol);

    const obj: PlotCellObject = {
      id: 0,
      type: CellType.Plot,
      cssSize: this.initialCellSize(notebook, DEFAULT_HEIGHT),
      displaySvg: <SvgMarkup>'', // REVIEW: Define shared EMPTY_SVG constant for this?
      inputText: <PlainText>"", // REVIEW: Plain text representation of plot parameters?
      source: 'USER', // REVIEW: "UNKNOWN"?
      strokeData: deepCopy(EMPTY_STROKE_DATA),

      formula: formula.obj,
      formulaCellId,
      formulaSymbol,
      plotMarkup,
    };
    return obj;
  }

  // Public Constructor

  public constructor(notebook: ServerNotebook, obj: PlotCellObject) {
    super(notebook, obj);
  }

  // Public Instance Methods

  // --- PRIVATE ---

  // Private Instance Properties

  // Private Instance Methods

  protected /* override */ redrawDisplaySvg(): void {
    super.redrawDisplaySvg(this.obj.plotMarkup);
  }

}
