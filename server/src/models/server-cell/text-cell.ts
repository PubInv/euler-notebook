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

import { deepCopy, PlainText, SvgMarkup, CssLength, escapeHtml, Html } from "../../shared/common";
import { CellSource, CellType, TextCellObject } from "../../shared/cell";
import { RecognizeText } from "../../shared/client-requests";
import { EMPTY_STROKE_DATA } from "../../shared/stylus";

import { recognizeText } from "../../components/handwriting-recognizer";

import { ServerNotebook } from "../server-notebook";

import { ServerCell } from "./index";
import { NotebookSuggestionsUpdated, NotebookUpdated, SuggestionClass, SuggestionId, SuggestionObject, SuggestionUpdates, TextTypeset } from "../../shared/server-responses";

import { SuggestionData, TypesetTextSuggestionData } from "../suggestion";
import { ServerSocket } from "../server-socket";

// Constants

const DEFAULT_HEIGHT = <CssLength>"1in";
const TYPESET_TEXT_SUGGESTION_CLASS = <SuggestionClass>'typesetText';


// Exported Class

export class TextCell extends ServerCell<TextCellObject> {

  // Public Class Methods

  public static newCell(notebook: ServerNotebook, source: CellSource): TextCell {
    const obj: TextCellObject = {
      id: notebook.nextId(),
      type: CellType.Text,
      cssSize: this.initialCellSize(notebook, DEFAULT_HEIGHT),
      displaySvg: <SvgMarkup>'',
      inputText: <PlainText>"",
      source,
      strokeData: deepCopy(EMPTY_STROKE_DATA),
    };
    return new this(notebook, obj);
  }

  // Public Constructor

  public constructor(notebook: ServerNotebook, obj: TextCellObject) {
    super(notebook, obj);
  }

  // Public Instance Methods

  // Public Instance Event Handlers

  public /* override */ onAcceptSuggestionRequest(
    suggestionId: SuggestionId,
    suggestionData: SuggestionData,
    /* out */ response: NotebookUpdated,
  ): void {
    let handled: boolean = false;
    switch(suggestionData.type) {
      case 'typesetText': {
        this.typesetText(suggestionData, response);
        handled = true;
        // TODO: update the suggestions to remove the typeset suggestion
        break;
      }
    }
    super.onAcceptSuggestionRequest(suggestionId, suggestionData, response, handled);
  }

  public async onRecognizeText(socket: ServerSocket, msg: RecognizeText): Promise<void> {
    const results = await recognizeText(this.obj.strokeData)
    const addSuggestions: SuggestionObject[] = results.alternatives.map((alternative, index)=>{
      const id = <SuggestionId>`recognizedText${index}`;
      const data: TypesetTextSuggestionData = {
        type: 'typesetText',
        text: alternative.text,
      };
      const suggestion: SuggestionObject = {
        id,
        class: TYPESET_TEXT_SUGGESTION_CLASS,
        data,
        html: <Html>escapeHtml(alternative.text),
      };
      return suggestion;
    });
    const updates: SuggestionUpdates[] = [{
      cellId: this.id,
      add: addSuggestions,
      removeClasses: [ TYPESET_TEXT_SUGGESTION_CLASS ],
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

  protected /* override */ redrawDisplaySvg(): void {
    const markup = <SvgMarkup>`<text y="12">${escapeHtml(this.obj.inputText)}</text>`;
    super.redrawDisplaySvg(<SvgMarkup>(markup));
  }

  // Private Instance Event Handlers

  private typesetText(
    suggestionData: TypesetTextSuggestionData,
    /* out */ response: NotebookUpdated,
  ): void {

    // REVIEW: Size of cell could change.
    const inputText = suggestionData.text;
    this.obj.strokeData = deepCopy(EMPTY_STROKE_DATA);
    this.obj.inputText = inputText;
    this.redrawDisplaySvg();

    const update: TextTypeset = {
      type: 'textTypeset',
      cellId: this.id,
      displaySvg: this.obj.displaySvg,
      inputText,
      strokeData: this.obj.strokeData,
    };
    response.updates.push(update);

    // TODO:
    // const undoChangeRequest: ...
    // response.undoChangeRequests.push(undoChangeRequest);

    // Remove the typeset formula suggestions from the cell's suggestion panel.
    const suggestionUpdates: SuggestionUpdates = {
      cellId: this.id,
      add: [],
      removeClasses: [ TYPESET_TEXT_SUGGESTION_CLASS ],
      removeIds: [],
    }
    response.suggestionUpdates = [ suggestionUpdates ];

  }

}
