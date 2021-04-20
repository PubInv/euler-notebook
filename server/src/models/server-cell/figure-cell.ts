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
import { CssLength, pixelsFromCssLength } from "../../shared/css";
import { CellId, CellSource, CellType, SuggestionClass, SuggestionId, SuggestionObject } from "../../shared/cell";
import { EMPTY_FIGURE_OBJECT, FigureCellObject, renderFigureCell } from "../../shared/figure";
import { EMPTY_STROKE_DATA } from "../../shared/stylus";
import { SvgMarkup } from "../../shared/svg";

import { ServerNotebook } from "../server-notebook";

import { ServerCell } from "./index";
import { recognizeFigure } from "../../components/handwriting-recognizer";
import { NotebookChangeRequest } from "../../shared/client-requests";
import { NotebookSuggestionsUpdated, SuggestionUpdates } from "../../shared/server-responses";

// Constants

const DEFAULT_HEIGHT = <CssLength>"3in";

const TYPESET_FIGURE_SUGGESTION_CLASS = <SuggestionClass>'typesetFigure';

// Exported Class

export class FigureCell extends ServerCell<FigureCellObject> {

  // Public Class Methods

  public static newCellObject(notebook: ServerNotebook, id: CellId, source: CellSource): FigureCellObject {
    const rval: FigureCellObject = {
      id,
      type: CellType.Figure,
      cssSize: this.initialCellSize(notebook, DEFAULT_HEIGHT),
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

  private async recognizeStrokes(): Promise<void> {
    debug(`Recognizing strokes`);
    const width = pixelsFromCssLength(this.cssSize.width);
    const height = pixelsFromCssLength(this.cssSize.height);
    const results = await recognizeFigure(width, height, this.obj.strokeData);
    const addSuggestions: SuggestionObject[] = results.alternatives.map((alternative, index)=>{
      const id = <SuggestionId>`recognizedFigure${index}`;
      const { figureObject } = alternative;
      const data: NotebookChangeRequest[] = [{
        type: 'typesetFigure',
        cellId: this.id,
        figure: figureObject,
        strokeData: EMPTY_STROKE_DATA,
      }];
      const suggestion: SuggestionObject = {
        id,
        class: TYPESET_FIGURE_SUGGESTION_CLASS,
        changeRequests: data,
        display: { svg: alternative.thumbnailSvgMarkup },
      };
      return suggestion;
    });
    const updates: SuggestionUpdates[] = [{
      cellId: this.id,
      add: addSuggestions,
      removeClasses: [ TYPESET_FIGURE_SUGGESTION_CLASS ],
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
    console.log(`Figure cell stroke inactivity timeout c${this.id}`);
    // LATER: Display recognition error to user if one occurs.
    //        Currently it will just log the error, but fails silently from the user's perspective.
    await this.recognizeStrokes();
  }

}
