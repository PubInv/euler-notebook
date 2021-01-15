/*
Math Tablet
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

import { deepCopy, PlainText, SvgMarkup } from "../shared/common";
import { CellSource, CellType, FigureCellObject } from "../shared/cell";
import { cssSizeInPoints } from "../shared/notebook";
import { EMPTY_STROKE_DATA } from "../shared/stylus";

import { ServerNotebook } from "../server-notebook";

import { ServerCell } from "./index";

// Constants

const DEFAULT_WIDTH = 6.5; // inches
const DEFAULT_SIZE = cssSizeInPoints(DEFAULT_WIDTH, 3);

// Exported Class

export class FigureCell extends ServerCell<FigureCellObject> {

  // Public Class Methods

  public static newCell(notebook: ServerNotebook, source: CellSource): FigureCell {
    const obj: FigureCellObject = {
      id: notebook.nextId(),
      type: CellType.Figure,
      cssSize: deepCopy(DEFAULT_SIZE),
      displaySvg: <SvgMarkup>'',
      inputText: <PlainText>"",
      source,
      strokeData: deepCopy(EMPTY_STROKE_DATA),
    };
    return new this(notebook, obj);
  }

  // Public Constructor

  public constructor(notebook: ServerNotebook, obj: FigureCellObject) {
    super(notebook, obj);
  }

  // Public Instance Methods

  public displaySvg(): SvgMarkup {
    const markup = <SvgMarkup>'<!-- Figure Cell SVG -->';
    return super.displaySvg(markup);
  }

}
