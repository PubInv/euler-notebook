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

import { deepCopy, PlainText, escapeHtml, Html } from "../../shared/common";
import { CssLength, pixelsFromCssLength } from "../../shared/css";
import { CellId, CellSource, CellType, SuggestionClass, SuggestionId, SuggestionObject } from "../../shared/cell";
import { TextCellObject, renderTextCell } from "../../shared/text";
import { EMPTY_STROKE_DATA } from "../../shared/stylus";
import { SvgMarkup } from "../../shared/svg";

import { recognizeText } from "../../components/handwriting-recognizer";

import { ServerNotebook } from "../server-notebook";

import { ServerCell } from "./index";
import { NotebookSuggestionsUpdated, SuggestionUpdates } from "../../shared/server-responses";

import { NotebookChangeRequest } from "../../shared/client-requests";

// Constants

const DEFAULT_HEIGHT = <CssLength>"1in";
const TYPESET_TEXT_SUGGESTION_CLASS = <SuggestionClass>'typesetText';


// Exported Class

export class TextCell extends ServerCell<TextCellObject> {

  // Public Class Methods

  public static newCellObject(notebook: ServerNotebook, id: CellId, source: CellSource): TextCellObject {
    const rval: TextCellObject = {
      id,
      type: CellType.Text,
      cssSize: this.initialCellSize(notebook, DEFAULT_HEIGHT),
      inputText: <PlainText>"",
      source,
      strokeData: deepCopy(EMPTY_STROKE_DATA),
      suggestions: [],
    };
    return rval;
  }

  // Public Constructor

  public constructor(notebook: ServerNotebook, obj: TextCellObject) {
    super(notebook, obj);
  }

  // Public Instance Property Functions

  public /* override */ displaySvg(): SvgMarkup {
    return renderTextCell(this.obj);
  }

  // Public Instance Methods

  // Public Instance Event Handlers

  // --- PRIVATE ---

  // Private Instance Methods

  private async recognizeStrokes(): Promise<void> {
    debug(`Recognizing strokes`);
    const width = pixelsFromCssLength(this.cssSize.width);
    const height = pixelsFromCssLength(this.cssSize.height);
   const results = await recognizeText(width, height, this.obj.strokeData)
    const addSuggestions: SuggestionObject[] = results.alternatives.map((alternative, index)=>{
      const id = <SuggestionId>`recognizedText${index}`;
      const data: NotebookChangeRequest[] = [{
        type: 'typesetText',
        cellId: this.id,
        text: alternative.text,
        strokeData: EMPTY_STROKE_DATA,
      }];
      const suggestion: SuggestionObject = {
        id,
        class: TYPESET_TEXT_SUGGESTION_CLASS,
        changeRequests: data,
        display: { html: <Html>escapeHtml(alternative.text) },
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

  // Private Instance Event Handlers

  protected async onStrokeInactivityTimeout(): Promise<void> {
    debug(`Text cell stroke inactivity timeout c${this.id}`);
    // LATER: Display recognition error to user if one occurs.
    //        Currently it will just log the error, but fails silently from the user's perspective.
    await this.recognizeStrokes();
  }

}
