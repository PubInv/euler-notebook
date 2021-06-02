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

import { LengthInPixels } from "../../shared/css";
import { ImageCellObject } from "../../shared/image-cell";
import { SuggestionClass, SuggestionId, SuggestionObject } from "../../shared/suggestions";

import { recognizeImage } from "../../components/image-recognizer";

import { ServerNotebook } from "../server-notebook";

import { ServerCell } from "./index";
import { NotebookChangeRequest, RemoveSuggestion } from "../../shared/client-requests";
import { ServerFormula } from "../server-formula";
import { FormulaCell } from "./formula-cell";
import { CellId, CellSource, CellType } from "../../shared/cell";
import { IMAGE_CELL_HEIGHT } from "../../shared/dimensions";
import { deepCopy, PlainText } from "../../shared/common";
import { EMPTY_STROKE_DATA } from "../../shared/stylus";

// Types


// Constants

const TYPESET_IMAGE_SUGGESTION_CLASS = <SuggestionClass>"typesetImage";

// Exported Class

export class ImageCell extends ServerCell<ImageCellObject> {

  // Public Class Methods

  public static newCellObject(notebook: ServerNotebook, id: CellId, source: CellSource): ImageCellObject {
    const rval: ImageCellObject = {
      id,
      type: CellType.Image,
      cssSize: this.initialCellSize(notebook, IMAGE_CELL_HEIGHT),
      inputText: <PlainText>"",
      source,
      strokeData: deepCopy(EMPTY_STROKE_DATA),
      suggestions: [],
    };
    return rval;
  }

  // Public Constructor

  public constructor(notebook: ServerNotebook, obj: ImageCellObject) {
    super(notebook, obj);
  }

  // Public Instance Methods

  // --- PRIVATE ---

  // Private Instance Properties

  // Public Instance Property Functions

  // Private Instance Methods

  protected async generateInitialSuggestions(): Promise<SuggestionObject[]> {
    if (!this.obj.imageInfo) { return []; }

    debug(`Recognizing strokes`);

    // Send the image to the recognizer and get a list of alternatives back.
    const results = await recognizeImage(this.obj.imageInfo.url);
    const { alternatives } = results;

    // For each alternative, generate a suggestion object that has
    // a change request to typeset the text to that alternative,
    // and also change requests to remove all of the typesetting
    // suggestions.
    const rval: SuggestionObject[] = [];
    for (let i=0; i<alternatives.length; i++) {
      const alternative = alternatives[i];
      const suggestionId = typesetImageSuggestionId(i);
      const formula = await ServerFormula.createFromMathMl(alternative.presentationMathMlTree, alternative.contentMathMlTree);
      const insertCell = FormulaCell.insertFormulaRequest(this.notebook, formula, this.id);
      const removeSuggestion: RemoveSuggestion = {
        type: 'removeSuggestion',
        cellId: this.id,
        suggestionId: typesetImageSuggestionId(i),
      };
      const changeRequests: NotebookChangeRequest[] = [
        insertCell,
        removeSuggestion
      ];
      const suggestionObject: SuggestionObject = {
        id: suggestionId,
        class: TYPESET_IMAGE_SUGGESTION_CLASS,
        changeRequests,
        display: { formula: formula.obj },
      };
      rval.push(suggestionObject);
    };
    return rval;
  }

  protected async recognizeStrokes(
    _width: LengthInPixels,
    _height: LengthInPixels,
  ): Promise<SuggestionObject[]> {
    return [];
  }

}

// Helper Functions

function typesetImageSuggestionId(index: number): SuggestionId {
  return <SuggestionId>`typesetImage${index}`
}
