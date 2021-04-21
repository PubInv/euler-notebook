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
import { EMPTY_FIGURE_OBJECT, FigureCellObject, renderFigureCell } from "../../shared/figure";
import { EMPTY_STROKE_DATA } from "../../shared/stylus";
import { SuggestionId, SuggestionObject, TYPESETTING_SUGGESTION_CLASS } from "../../shared/suggestions";
import { SvgMarkup } from "../../shared/svg";

import { ServerNotebook } from "../server-notebook";

import { ServerCell } from "./index";
import { recognizeFigure } from "../../components/handwriting-recognizer";
import { NotebookChangeRequest } from "../../shared/client-requests";
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

  public /* override */ displaySvg(): SvgMarkup {
    return renderFigureCell(this.obj);
  }

  // Public Instance Methods

  // --- PRIVATE ---

  // Private Instance Methods

  protected async recognizeStrokes(
    width: LengthInPixels,
    height: LengthInPixels,
  ): Promise<SuggestionObject[]> {
    debug(`Recognizing strokes`);
    const results = await recognizeFigure(width, height, this.obj.strokeData);
    const { alternatives } = results;
    return alternatives.map((alternative, index)=>{
      const suggestionId = <SuggestionId>`recognizedFigure${index}`;
      const { figureObject } = alternative;
      const data: NotebookChangeRequest[] = [{
        type: 'typesetFigure',
        cellId: this.id,
        figure: figureObject,
        strokeData: EMPTY_STROKE_DATA,
      }];
      const suggestionObject: SuggestionObject = {
        id: suggestionId,
        class: TYPESETTING_SUGGESTION_CLASS,
        changeRequests: data,
        display: { svg: alternative.thumbnailSvgMarkup },
      };
      return suggestionObject;
    });
  }

  // Private Instance Event Handlers

}
