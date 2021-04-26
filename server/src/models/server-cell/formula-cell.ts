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
import { EMPTY_FORMULA_OBJECT, FormulaCellObject, FormulaNumber } from "../../shared/formula";
import { EMPTY_STROKE_DATA } from "../../shared/stylus";
import { SuggestionId, SuggestionObject, TYPESETTING_SUGGESTION_CLASS } from "../../shared/suggestions";

import { recognizeFormula } from "../../components/handwriting-recognizer";

import { ServerNotebook } from "../server-notebook";
import { ServerFormula } from "../server-formula";

import { ServerCell } from "./index";
import { FORMULA_CELL_HEIGHT } from "../../shared/dimensions";
import { NotebookUpdate } from "../../shared/server-responses";

// Constants

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
    switch(update.type) {
      case 'formulaTypeset': {

        break;
      }
    }
  }

  // --- PRIVATE ---

  // Private Instance Properties

  private _formula: ServerFormula;

  // Private Instance Property Functions


  // Private Instance Methods

  // private changeFormula(
  //   obj: FormulaObject,
  //   /* out */ suggestionUpdates: SuggestionUpdates,
  // ): void {

  //   // Remove any prior formula plotting suggestions
  //   assert(suggestionUpdates.add);
  //   assert(suggestionUpdates.removeClasses);
  //   suggestionUpdates.removeClasses!.push(PLOT_FORMULA_SUGGESTION_CLASS);

  //   const newFormula = ServerFormula.createFromObject(obj);
  //   this._formula = newFormula;
  //   this.obj.formula = newFormula.obj;
  //   this.redrawDisplaySvg();

  //   monitorPromise(this.plotFormulaForSuggestion(), `Error plotting formula ${this.id} for suggestion panel.`);
  // }

  // private async plotFormulaForSuggestion(): Promise<void> {
  //   // REVIEW: If ServerFormulas are immutable, then maybe the
  //   //         cache the plot with the formula?
  //   if (false /* TODO: Formula is not plottable */) { return; }

  //   const formulaSymbol: FormulaSymbol = <FormulaSymbol>'x'; // TODO:
  //   // REVIEW: If formula cell gets changed or deleted before we finish plotting? */
  //   const { cellObject, thumbnailPlotMarkup } = await PlotCell.plotFormula(this.notebook, this.id, this.formula, formulaSymbol);
  //   const data: NotebookChangeRequest[] = [
  //     { type: 'insertCell', cellObject, afterId: this.id },
  //   ];
  //   const suggestionObject: SuggestionObject = {
  //     id: <SuggestionId>'plot',
  //     class: PLOT_FORMULA_SUGGESTION_CLASS,
  //     html: <Html>thumbnailPlotMarkup,
  //     data,
  //   };

  //   this.updateSuggestions([ suggestionObject ], [], []);
  // }

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

}
