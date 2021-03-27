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

import { deepCopy, PlainText, SvgMarkup, CssLength, Html } from "../../shared/common";
import { CellSource, CellType } from "../../shared/cell";
import { FormulaCellObject, FormulaObject } from "../../shared/formula";
import { FormulaTypeset, NotebookSuggestionsUpdated, NotebookUpdated, SuggestionClass, SuggestionId, SuggestionObject, SuggestionUpdates } from "../../shared/server-responses";
import { EMPTY_STROKE_DATA } from "../../shared/stylus";


import { ServerNotebook } from "../server-notebook";
import { ServerFormula } from "../server-formula";

import { ServerCell } from "./index";
import { SuggestionData, TypesetFormulaSuggestionData } from "../suggestion";
import { ServerSocket } from "../server-socket";
import { recognizeFormula } from "../../components/handwriting-recognizer";
import { RecognizeFormula } from "../../shared/client-requests";


// Constants

const DEFAULT_HEIGHT = <CssLength>"1in";

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
    let handled: boolean = false;
    switch(suggestionData.type) {
      case 'typesetFormula': {
        this.onTypesetFormulaRequest(suggestionData, response);
        handled = true;
        // TODO: update the suggestions to remove the typeset suggestion
        break;
      }
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

  private changeFormula(obj: FormulaObject): void {
    const newFormula = new ServerFormula(obj);
    this._formula = newFormula;
    this.obj.formula = newFormula.obj;
  }

  protected /* override */ redrawDisplaySvg(): void {
    // TODO: Formula numbering, etc.
    // TODO: Strip <svg></svg>?
    const formulaMarkup = this._formula.renderSvg();
    return super.redrawDisplaySvg(<SvgMarkup>(formulaMarkup));
  }

  // Private Instance Event Handlers

  private onTypesetFormulaRequest(
    suggestionData: TypesetFormulaSuggestionData,
    /* out */ response: NotebookUpdated,
  ): void {

    // REVIEW: Size of cell could change.
    this.obj.strokeData = deepCopy(EMPTY_STROKE_DATA);
    this.changeFormula(suggestionData.formula);
    this.redrawDisplaySvg();

    const update: FormulaTypeset = {
      type: 'formulaTypeset',
      cellId: this.id,
      displaySvg: this.obj.displaySvg,
      formula: this.obj.formula,
      strokeData: this.obj.strokeData,
    };
    response.updates.push(update);

    // TODO:
    // const undoChangeRequest: ...
    // response.undoChangeRequests.push(undoChangeRequest);

    // Remove the typeset formula suggestions from the cell's suggestion panel.
    const suggestionUpdates: SuggestionUpdates = {
      cellId: this.id,
      removeClasses: [ TYPESET_FORMULA_SUGGESTION_CLASS ],
    }
    response.suggestionUpdates = [ suggestionUpdates ];
  }

}
