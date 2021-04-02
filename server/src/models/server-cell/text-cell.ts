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

import { deepCopy, PlainText, SvgMarkup, escapeHtml, Html } from "../../shared/common";
import { CssLength } from "../../shared/css";
import { CellSource, CellType, TextCellObject } from "../../shared/cell";
import { EMPTY_STROKE_DATA } from "../../shared/stylus";

import { recognizeText } from "../../components/handwriting-recognizer";

import { ServerNotebook } from "../server-notebook";

import { ServerCell } from "./index";
import { NotebookSuggestionsUpdated, NotebookUpdated, SuggestionClass, SuggestionId, SuggestionObject, SuggestionUpdates, TextTypeset } from "../../shared/server-responses";

import { SuggestionData, TypesetTextSuggestionData } from "../suggestion";
import { AcceptSuggestion } from "../../shared/client-requests";

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

  // --- PRIVATE ---

  // Private Instance Methods

  private changeText(text: PlainText): void {
    this.obj.inputText = text;
    this.redrawDisplaySvg();
  }

  private async recognizeStrokes(): Promise<void> {
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
    };

    this.notebook.broadcastMessage(response);
  }

  protected /* override */ redrawDisplaySvg(): void {
    const fontCapHeightInPx = 12; // TODO:
    const y = Math.round(this.heightInPx/2 + fontCapHeightInPx/2);
    const markup = <SvgMarkup>`<text y="${y}">${escapeHtml(this.obj.inputText)}</text>`;
    super.redrawDisplaySvg(<SvgMarkup>(markup));
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
      case 'typesetText': this.onTypesetTextRequest(suggestionData, response); break;
      default: handled = false;
    }
    super.onAcceptSuggestionRequest(source, request, response, handled);
  }

  protected async onStrokeInactivityTimeout(): Promise<void> {
    debug(`Text cell stroke inactivity timeout c${this.id}`);
    await this.recognizeStrokes();
  }

  private onTypesetTextRequest(
    suggestionData: TypesetTextSuggestionData,
    /* out */ response: NotebookUpdated,
  ): void {

    // REVIEW: Size of cell could change.
    const inputText = suggestionData.text;
    this.obj.strokeData = deepCopy(EMPTY_STROKE_DATA);
    this.changeText(inputText);

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
