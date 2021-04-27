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

import * as debug1 from "debug";
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

import { deepCopy, PlainText } from "../../shared/common";
import { LengthInPixels } from "../../shared/css";
import { CellId, CellSource, CellType } from "../../shared/cell";
import { NotebookChangeRequest } from "../../shared/client-requests";
import { FormulaTypeset } from "../../shared/server-responses";
import { EMPTY_FORMULA_OBJECT, FormulaCellObject, FormulaNumber } from "../../shared/formula";
import { EMPTY_STROKE_DATA } from "../../shared/stylus";
import { SuggestionClass, SuggestionId, SuggestionObject, TYPESETTING_SUGGESTION_CLASS } from "../../shared/suggestions";

import { recognizeFormula } from "../../components/handwriting-recognizer";

import { ServerNotebook } from "../server-notebook";
import { ServerFormula } from "../server-formula";

import { ServerCell } from "./index";
import { FORMULA_CELL_HEIGHT } from "../../shared/dimensions";
import { NotebookUpdate } from "../../shared/server-responses";
import { monitorPromise } from "../../error-handler";
import { PlotCell } from "./plot-cell";

// Constants

const PLOT_FORMULA_SUGGESTION_CLASS = <SuggestionClass>"plotFormula";

// Exported Class

export class FormulaCell extends ServerCell<FormulaCellObject> {

  // Public Class Methods

  public static newCellObject(notebook: ServerNotebook, id: CellId, source: CellSource): FormulaCellObject {
    const rval: FormulaCellObject = {
      id,
      type: CellType.Formula,
      cssSize: this.initialCellSize(notebook, FORMULA_CELL_HEIGHT),
      inputText: <PlainText>"",
      formula: deepCopy(EMPTY_FORMULA_OBJECT),
      source,
      strokeData: deepCopy(EMPTY_STROKE_DATA),
      suggestions: [],
    };
    return rval
  }

  // Public Constructor

  public constructor(notebook: ServerNotebook, obj: FormulaCellObject) {
    super(notebook, obj);
    // IMPORTANT: ServerFormula and our FormulaCellObject share the same FormulaObject!
    this._formula = ServerFormula.createFromObject(obj.formula);
    this.formulaNumber = obj.id;
  }

  // Public Instance Properties

  public formulaNumber: FormulaNumber;

  // Public Instance Property Functions

  public get formula(): ServerFormula { return this._formula; }

  // Public Instance Methods

  // Public Instance Event Handlers

  public /* override */ onUpdate(update: NotebookUpdate): void {
    super.onUpdate(update);
    switch(update.type) {
      case 'formulaTypeset': this.onFormulaTypeset(update); break;
    }
  }

  // --- PRIVATE ---

  // Private Instance Properties

  private _formula: ServerFormula;

  // Private Instance Property Functions

  // Private Instance Methods

  private async suggestPlot(): Promise<void> {
    debug(`Suggest plot: ${this.id}`);
    // REVIEW: If formula cell gets changed or deleted before we finish plotting? */
    const { cellObject, thumbnailPlotMarkup } = await PlotCell.plotFormula(this.notebook, this.id, this.formula);
    const suggestionId = <SuggestionId>'plot0';
    const changeRequests: NotebookChangeRequest[] = [
      { type: 'insertCell', cellObject, afterId: this.id },
      { type: 'removeSuggestion', cellId: this.id, suggestionId },
    ];
    const suggestionObject: SuggestionObject = {
      id: suggestionId,
      class: PLOT_FORMULA_SUGGESTION_CLASS,
      changeRequests,
      display: { svg: thumbnailPlotMarkup },
    };

    this.requestSuggestions([ suggestionObject ], PLOT_FORMULA_SUGGESTION_CLASS);
  }

  protected async recognizeStrokes(
    width: LengthInPixels,
    height: LengthInPixels,
  ): Promise<SuggestionObject[]> {
    debug(`Recognizing strokes`);
    const results = await recognizeFormula(width, height, this.obj.strokeData);
    const { alternatives } = results;
    return alternatives.map((alternative, index)=>{
      const suggestionId = <SuggestionId>`recognizedFormula${index}`;
      // TODO: remove alternative typesetting suggestions.
      const changeRequests: NotebookChangeRequest[] = [{
        type: 'typesetFormula',
        cellId: this.id,
        formula: alternative.formula.obj,
        strokeData: EMPTY_STROKE_DATA,
      }];
      const suggestionObject: SuggestionObject = {
        id: suggestionId,
        class: TYPESETTING_SUGGESTION_CLASS,
        changeRequests,
        display: { formula: alternative.formula.obj },
      };
      return suggestionObject;
    });
  }

  // Private Instance Event Handlers

  private onFormulaTypeset(update: FormulaTypeset): void {
    const { formula: formulaObject } = update;

    // Remove any prior formula plotting suggestions

    const formula = this._formula = ServerFormula.createFromObject(formulaObject);

    if (formula.isPlottable) {
      monitorPromise(this.suggestPlot(), `Error plotting formula ${this.id} for suggestion panel.`);
    }

  }

}
