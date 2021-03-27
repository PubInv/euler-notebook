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

import { deepCopy, PlainText, SvgMarkup, CssLength, Html, assert } from "../../shared/common";
import { CellSource, CellType } from "../../shared/cell";
import { RecognizeFormula } from "../../shared/client-requests";
import { FormulaCellObject, FormulaObject } from "../../shared/formula";
import { FormulaTypeset, NotebookSuggestionsUpdated, NotebookUpdated, SuggestionClass, SuggestionId, SuggestionObject, SuggestionUpdates } from "../../shared/server-responses";
import { EMPTY_STROKE_DATA } from "../../shared/stylus";

import { recognizeFormula } from "../../components/handwriting-recognizer";

import { ServerNotebook } from "../server-notebook";
import { ServerFormula } from "../server-formula";

import { PlotFormulaSuggestionData, SuggestionData, TypesetFormulaSuggestionData } from "../suggestion";
import { ServerSocket } from "../server-socket";

import { ServerCell } from "./index";

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

  public /* override */ onAcceptSuggestionRequest(
    suggestionId: SuggestionId,
    suggestionData: SuggestionData,
    /* out */ response: NotebookUpdated,
  ): void {
    let handled: boolean = true;
    switch(suggestionData.type) {
      case 'plotFormula': this.onPlotFormulaRequest(suggestionData, response); break;
      case 'typesetFormula': this.onTypesetFormulaRequest(suggestionData, response); break;
      default: handled = false;
    }
    super.onAcceptSuggestionRequest(suggestionId, suggestionData, response, handled);
  }

  public async onRecognizeFormula(socket: ServerSocket, msg: RecognizeFormula): Promise<void> {
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
      complete: true,
      requestId: msg.requestId,
    };
    socket.sendMessage(response);
  }

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

    if (true /* TODO: Formula is plottable */) {
      const data: PlotFormulaSuggestionData = { type: 'plotFormula' };
      const suggestion: SuggestionObject = {
        id: <SuggestionId>'plot',
        class: PLOT_FORMULA_SUGGESTION_CLASS,
        html: <Html>"Plot Formula",
        data,
      };
      suggestionUpdates.add!.push(suggestion);
    }
  }

  protected /* override */ redrawDisplaySvg(): void {
    // TODO: Formula numbering, etc.
    // TODO: Strip <svg></svg>?
    const formulaMarkup = this._formula.renderSvg();
    return super.redrawDisplaySvg(<SvgMarkup>(formulaMarkup));
  }

  // Private Instance Event Handlers

  private onPlotFormulaRequest(
    _suggestionData: PlotFormulaSuggestionData,
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


    response.suggestionUpdates = [ suggestionUpdates ];
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
