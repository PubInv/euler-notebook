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

import { deepCopy, PlainText, SvgMarkup, CssLength, Html, assert } from "../../shared/common";
import { CellSource, CellType } from "../../shared/cell";
import { FormulaCellObject, FormulaObject, FormulaSymbol } from "../../shared/formula";
import { FormulaTypeset, NotebookSuggestionsUpdated, NotebookUpdated, SuggestionClass, SuggestionId, SuggestionObject, SuggestionUpdates } from "../../shared/server-responses";
import { EMPTY_STROKE_DATA } from "../../shared/stylus";

import { recognizeFormula } from "../../components/handwriting-recognizer";

import { ServerNotebook } from "../server-notebook";
import { ServerFormula } from "../server-formula";

import { PlotFormulaSuggestionData, SuggestionData, TypesetFormulaSuggestionData } from "../suggestion";

import { ServerCell } from "./index";
import { PlotCell } from "./plot-cell";
import { monitorPromise } from "../../error-handler";
import { AcceptSuggestion } from "../../shared/client-requests";

// Constants

const DEFAULT_HEIGHT = <CssLength>"1in";

const PLOT_FORMULA_SUGGESTION_CLASS = <SuggestionClass>'plotFormula';
const TYPESET_FORMULA_SUGGESTION_CLASS = <SuggestionClass>'typesetFormula';

// Exported Class

export class FormulaCell extends ServerCell<FormulaCellObject> {

  // Public Class Methods

  public static newCell(notebook: ServerNotebook, source: CellSource): FormulaCell {
    const formula = ServerFormula.createEmpty();
    const obj: FormulaCellObject = {
      id: notebook.nextId(),
      type: CellType.Formula,
      cssSize: this.initialCellSize(notebook, DEFAULT_HEIGHT),
      displaySvg: <SvgMarkup>'',
      inputText: <PlainText>"",
      formula: formula.obj,
      source,
      strokeData: deepCopy(EMPTY_STROKE_DATA),
    };
    return new this(notebook, obj);
  }

  // Public Constructor

  public constructor(notebook: ServerNotebook, obj: FormulaCellObject) {
    super(notebook, obj);
    // IMPORTANT: ServerFormula and our FormulaCellObject share the same FormulaObject!
    this._formula = new ServerFormula(obj.formula);
  }

  // Public Instance Properties

  public get formula(): ServerFormula { return this._formula; }

  // Public Instance Methods

  // Public Instance Event Handlers

  // --- PRIVATE ---

  // Private Instance Properties

  private _formula: ServerFormula;

  // Private Instance Methods

  private changeFormula(
    obj: FormulaObject,
    /* out */ suggestionUpdates: SuggestionUpdates,
  ): void {

    // Remove any prior formula plotting suggestions
    assert(suggestionUpdates.add);
    assert(suggestionUpdates.removeClasses);
    suggestionUpdates.removeClasses!.push(PLOT_FORMULA_SUGGESTION_CLASS);

    const newFormula = new ServerFormula(obj);
    this._formula = newFormula;
    this.obj.formula = newFormula.obj;
    this.redrawDisplaySvg();

    monitorPromise(this.plotFormulaForSuggestion(), `Error plotting formula ${this.id} for suggestion panel.`);
  }

  private async plotFormulaForSuggestion(): Promise<void> {
    // REVIEW: If ServerFormulas are immutable, then maybe the
    //         cache the plot with the formula?
    if (false /* TODO: Formula is not plottable */) { return; }

    const formulaSymbol: FormulaSymbol = <FormulaSymbol>'x'; // TODO:
    // REVIEW: If formula cell gets changed or deleted before we finish plotting? */
    const { plotCellObject, thumbnailPlotMarkup } = await PlotCell.plotFormula(this.notebook, this.id, this.formula, formulaSymbol);
    const data: PlotFormulaSuggestionData = { type: 'plotFormula', plotCellObject, afterId: this.id };
    const suggestionObject: SuggestionObject = {
      id: <SuggestionId>'plot',
      class: PLOT_FORMULA_SUGGESTION_CLASS,
      html: <Html>thumbnailPlotMarkup,
      data,
    };

    this.updateSuggestions([ suggestionObject ], [], []);
  }

  private async recognizeStrokes(): Promise<void> {
    const results = await recognizeFormula(this.obj.strokeData)
    const addSuggestions: SuggestionObject[] = results.alternatives.map((alternative, index)=>{
      const id = <SuggestionId>`recognizedFormula${index}`;
      const data: TypesetFormulaSuggestionData = {
        type: 'typesetFormula',
        formula: alternative.formula.obj,
      };
      const suggestion: SuggestionObject = {
        id,
        class: TYPESET_FORMULA_SUGGESTION_CLASS,
        data,
        html: <Html>alternative.svg,
      };
      return suggestion;
    });
    const updates: SuggestionUpdates[] = [{
      cellId: this.id,
      add: addSuggestions,
      removeClasses: [ TYPESET_FORMULA_SUGGESTION_CLASS ],
      removeIds: [],
    }];
    const response: NotebookSuggestionsUpdated = {
      type: 'notebook',
      path: this.notebook.path,
      operation: 'suggestionsUpdated',
      suggestionUpdates: updates,
    };

    this.notebook.broadcastMessage(response);
  }

  protected /* override */ redrawDisplaySvg(): void {
    // TODO: Formula numbering, etc.
    // TODO: Strip <svg></svg>?
    const formulaMarkup = this._formula.renderSvg();
    return super.redrawDisplaySvg(<SvgMarkup>(formulaMarkup));
  }

  // Private Instance Event Handlers

  protected /* override */ onAcceptSuggestionRequest(
    source: CellSource,
    request: AcceptSuggestion,
    /* out */ response: NotebookUpdated,
  ): void {
    const suggestionData = <SuggestionData>request.suggestionData;

    let handled: boolean = true;
    switch(suggestionData.type) {
      case 'plotFormula': this.onPlotFormulaRequest(suggestionData, response); break;
      case 'typesetFormula': this.onTypesetFormulaRequest(suggestionData, response); break;
      default: handled = false;
    }
    super.onAcceptSuggestionRequest(source, request, response, handled);
  }

  private onPlotFormulaRequest(
    suggestionData: PlotFormulaSuggestionData,
    /* out */ response: NotebookUpdated,
  ): void {

    // Remove the plot formula suggestions from the cell's suggestion panel.
    // REVIEW: User may want to plot the formula additional times, possibly with different parameters.
    const suggestionUpdates: SuggestionUpdates = {
      cellId: this.id,
      add: [],
      removeClasses: [ PLOT_FORMULA_SUGGESTION_CLASS ],
      removeIds: [],
    };

    // REVIEW: This duplicates code from ServerNotebook.applyInsertCellRequest.
    const { afterId, plotCellObject } = suggestionData;

    const update = this.notebook.createCellFromObject(plotCellObject, 'USER' /* TODO: */, afterId);
    response.updates.push(update);
    response.suggestionUpdates.push(suggestionUpdates);
  }

  protected async onStrokeInactivityTimeout(): Promise<void> {
    debug(`Formula cell stroke inactivity timeout c${this.id}`);
    await this.recognizeStrokes();
  }

  private onTypesetFormulaRequest(
    suggestionData: TypesetFormulaSuggestionData,
    /* out */ response: NotebookUpdated,
  ): void {

    // Remove the typeset formula suggestions from the cell's suggestion panel.
    // There may be more suggestion panel changes, depending on how the new
    // formula is different from the old formula.
    // REVIEW: Suggestions for other formula cells may need to change as a result of this formula changing.
    const suggestionUpdates: SuggestionUpdates = {
      cellId: this.id,
      add: [],
      removeClasses: [ TYPESET_FORMULA_SUGGESTION_CLASS ],
      removeIds: [],
    };

    // REVIEW: Size of cell could change.
    this.obj.strokeData = deepCopy(EMPTY_STROKE_DATA);
    this.changeFormula(suggestionData.formula, suggestionUpdates);

    const update: FormulaTypeset = {
      type: 'formulaTypeset',
      cellId: this.id,
      displaySvg: this.obj.displaySvg,
      formula: this.obj.formula,
      strokeData: this.obj.strokeData,
    };
    response.updates.push(update);
    response.suggestionUpdates = [ suggestionUpdates ];

    // TODO:
    // const undoChangeRequest: ...
    // response.undoChangeRequests.push(undoChangeRequest);

  }

}
