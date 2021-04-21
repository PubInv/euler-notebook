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
import { LengthInPixels } from "../../shared/css";
import { CellId, CellSource, CellType } from "../../shared/cell";
import { TextCellObject, renderTextCell } from "../../shared/text";
import { EMPTY_STROKE_DATA } from "../../shared/stylus";
import { SuggestionId, SuggestionObject, TYPESETTING_SUGGESTION_CLASS } from "../../shared/suggestions";
import { SvgMarkup } from "../../shared/svg";

import { recognizeText } from "../../components/handwriting-recognizer";

import { ServerNotebook } from "../server-notebook";

import { ServerCell } from "./index";

import { NotebookChangeRequest } from "../../shared/client-requests";
import { TEXT_CELL_HEIGHT } from "../../shared/dimensions";

// Constants

// Exported Class

export class TextCell extends ServerCell<TextCellObject> {

  // Public Class Methods

  public static newCellObject(notebook: ServerNotebook, id: CellId, source: CellSource): TextCellObject {
    const rval: TextCellObject = {
      id,
      type: CellType.Text,
      cssSize: this.initialCellSize(notebook, TEXT_CELL_HEIGHT),
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

  protected async recognizeStrokes(
    width: LengthInPixels,
    height: LengthInPixels,
  ): Promise<SuggestionObject[]> {
    debug(`Recognizing strokes`);
    const results = await recognizeText(width, height, this.obj.strokeData)
    const { alternatives } = results;
    return alternatives.map((alternative, index)=>{
      const suggestionId = <SuggestionId>`recognizedText${index}`;
      const changeRequests: NotebookChangeRequest[] = [{
        type: 'typesetText',
        cellId: this.id,
        text: alternative.text,
        strokeData: EMPTY_STROKE_DATA,
      }];
      const suggestionObject: SuggestionObject = {
        id: suggestionId,
        class: TYPESETTING_SUGGESTION_CLASS,
        changeRequests: changeRequests,
        display: { html: <Html>escapeHtml(alternative.text) },
      };
      return suggestionObject;
    });
  }

  // Private Instance Event Handlers

}
