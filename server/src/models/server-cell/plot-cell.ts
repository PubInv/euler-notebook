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

import { deepCopy, PlainText } from "../../shared/common";
import { CellId, CellType } from "../../shared/cell";
import { PlotCellObject, renderPlotCell } from "../../shared/plot";
import { EMPTY_STROKE_DATA } from "../../shared/stylus";
import { SvgMarkup } from "../../shared/svg";

import { ServerNotebook } from "../server-notebook";

import { ServerCell } from "./index";
import { plot } from "../../components/formula-plotter";
import { FormulaSymbol } from "../../shared/formula";
import { ServerFormula } from "../server-formula";
import { PLOT_CELL_HEIGHT } from "../../shared/dimensions";
import { LengthInPixels } from "../../shared/css";
import { SuggestionObject } from "../../shared/suggestions";
// import { plotUnivariate } from "../adapters/wolframscript";
// import { WolframExpression } from "../shared/formula";

// Types

interface PlotFormulaReturnValue {
  cellObject: PlotCellObject;
  thumbnailPlotMarkup: SvgMarkup;
}

// Constants

// Exported Class

export class PlotCell extends ServerCell<PlotCellObject> {

  // Public Class Methods

  public static async plotFormula(notebook: ServerNotebook, formulaCellId: CellId, formula: ServerFormula, formulaSymbol: FormulaSymbol): Promise<PlotFormulaReturnValue> {

    const { plotMarkup, thumbnailMarkup } = await plot(formula, formulaSymbol);

    const cellObject: PlotCellObject = {
      id: 0,
      type: CellType.Plot,
      cssSize: this.initialCellSize(notebook, PLOT_CELL_HEIGHT),
      inputText: <PlainText>"", // REVIEW: Plain text representation of plot parameters?
      source: 'USER',
      strokeData: deepCopy(EMPTY_STROKE_DATA),
      suggestions: [],

      formula: formula.obj,
      formulaCellId,
      formulaSymbol,
      plotMarkup,
    };

    return { cellObject, thumbnailPlotMarkup: thumbnailMarkup };
  }

  // Public Constructor

  public constructor(notebook: ServerNotebook, obj: PlotCellObject) {
    super(notebook, obj);
  }

  // Public Instance Methods

  // --- PRIVATE ---

  // Private Instance Properties

  // Public Instance Property Functions

  public /* override */ displaySvg(): SvgMarkup {
    return renderPlotCell(this.obj);
  }

  // Private Instance Methods

  protected async recognizeStrokes(
    _width: LengthInPixels,
    _height: LengthInPixels,
  ): Promise<SuggestionObject[]> {
    return [];
  }

  // Private Instance Event Handlers

}
