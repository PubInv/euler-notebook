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

import { deepCopy, PlainText, SvgMarkup } from "../../shared/common";
import { CssLength } from "../../shared/css";
import { CellId, CellSource, CellType } from "../../shared/cell";
import { FigureCellObject, renderFigureCell } from "../../shared/figure";
import { EMPTY_STROKE_DATA } from "../../shared/stylus";

import { ServerNotebook } from "../server-notebook";

import { ServerCell } from "./index";

// Constants

const DEFAULT_HEIGHT = <CssLength>"3in";

// Exported Class

export class FigureCell extends ServerCell<FigureCellObject> {

  // Public Class Methods

  public static newCellObject(notebook: ServerNotebook, id: CellId, source: CellSource): FigureCellObject {
    const rval: FigureCellObject = {
      id,
      type: CellType.Figure,
      cssSize: this.initialCellSize(notebook, DEFAULT_HEIGHT),
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

  // Private Instance Event Handlers

  protected async onStrokeInactivityTimeout(): Promise<void> {
    console.log(`Figure cell stroke inactivity timeout c${this.id}`);
  }

}
