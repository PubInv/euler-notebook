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
import { EMPTY_FIGURE_OBJECT, FigureCellObject } from "../../shared/figure";
import { EMPTY_STROKE_DATA } from "../../shared/stylus";
import { SuggestionId, SuggestionObject, TYPESETTING_SUGGESTION_CLASS } from "../../shared/suggestions";

import { ServerNotebook } from "../server-notebook";

import { ServerCell } from "./index";
import { recognizeFigure } from "../../components/handwriting-recognizer";
import { NotebookChangeRequest, RemoveSuggestion } from "../../shared/client-requests";
import { FIGURE_CELL_HEIGHT } from "../../shared/dimensions";

// Constants

// Exported Class

export class FigureCell extends ServerCell<FigureCellObject> {

  // Public Class Methods

  public static newCellObject(notebook: ServerNotebook, id: CellId, source: CellSource): FigureCellObject {
    const rval: FigureCellObject = {
      id,
      type: CellType.Figure,
      cssSize: this.initialCellSize(notebook, FIGURE_CELL_HEIGHT),
      figure: deepCopy(EMPTY_FIGURE_OBJECT),
      inputText: <PlainText>"",
      source,
      strokeData: deepCopy(EMPTY_STROKE_DATA),
      suggestions: [],
    };
    return rval;
  }

  // Public Constructor

  public constructor(notebook: ServerNotebook, obj: FigureCellObject) {
    super(notebook, obj);
  }

  // Public Instance Property Functions

  // Public Instance Methods

  // --- PRIVATE ---

  // Private Instance Methods

  protected async recognizeStrokes(
    width: LengthInPixels,
    height: LengthInPixels,
  ): Promise<SuggestionObject[]> {
    debug(`Recognizing strokes`);

    // Send the strokes to the recognizer and get a list of alternatives back.
    const results = await recognizeFigure(width, height, this.obj.strokeData);

    // For use below, generate a list of change requests to remove all of the alternatives.
    // When any alternative is used, all of the alternatives are removed from the suggestion panel.
    const { alternatives } = results;
    const removeChangeRequests: RemoveSuggestion[] = alternatives.map((_alternative, index)=>({
      type: 'removeSuggestion',
      cellId: this.id,
      suggestionId: typesetFigureSuggestionId(index),
    }));

    // For each alternative, generate a suggestion object that has
    // a change request to typeset the text to that alternative,
    // and also change requests to remove all of the typesetting
    // suggestions.
    const rval = alternatives.map((alternative, index)=>{
      const suggestionId = typesetFigureSuggestionId(index);
      const { figureObject } = alternative;
      const data: NotebookChangeRequest[] = [
        {
          type: 'typesetFigure',
          cellId: this.id,
          figure: figureObject,
          strokeData: EMPTY_STROKE_DATA,
        },
        ...removeChangeRequests,
      ];
      const suggestionObject: SuggestionObject = {
        id: suggestionId,
        class: TYPESETTING_SUGGESTION_CLASS,
        changeRequests: data,
        display: { svg: alternative.thumbnailSvgMarkup },
      };
      return suggestionObject;
    });
    return rval;
  }

  // Private Instance Event Handlers

}

// Helper Functions

function typesetFigureSuggestionId(index: number): SuggestionId {
  return <SuggestionId>`typesetFigure${index}`
}
