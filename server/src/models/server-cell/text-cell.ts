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

import { deepCopy, PlainText, SvgMarkup, CssLength, escapeHtml } from "../../shared/common";
import { CellSource, CellType, TextCellObject } from "../../shared/cell";
import { EMPTY_STROKE_DATA } from "../../shared/stylus";

import { ServerNotebook } from "../server-notebook";

import { ServerCell } from "./index";
import { NotebookUpdate, TextRecognitionAlternative, TextTypeset } from "../../shared/server-responses";
import { NotebookChangeRequest } from "../../shared/client-requests";

// Constants

const DEFAULT_HEIGHT = <CssLength>"1in";

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

  public typesetText(
    alternative: TextRecognitionAlternative,
    updates: NotebookUpdate[],
    _undoChangeRequests: NotebookChangeRequest[],
  ): void {

    // REVIEW: Size of cell could change.
    const inputText = alternative.text;
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
    updates.push(update);

    // TODO:
    // const undoChangeRequest: ...
    // undoChangeRequests.push(undoChangeRequest);
  }

  // --- PRIVATE ---

  protected /* override */ redrawDisplaySvg(): void {
    const markup = <SvgMarkup>`<text y="12">${escapeHtml(this.obj.inputText)}</text>`;
    super.redrawDisplaySvg(<SvgMarkup>(markup));
  }

}
