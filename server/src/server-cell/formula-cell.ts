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

import { deepCopy, PlainText, SvgMarkup, CssLength } from "../shared/common";
import { CellSource, CellType } from "../shared/cell";
import { FormulaCellObject, PlainTextFormula, TexExpression } from "../shared/formula";
import { EMPTY_STROKE_DATA } from "../shared/stylus";

import { ServerNotebook } from "../server-notebook";

import { ServerCell } from "./index";
import { convertTexToSvg } from "../adapters/mathjax";

// Constants

const DEFAULT_HEIGHT = <CssLength>"1in";

// Exported Class

export class FormulaCell extends ServerCell<FormulaCellObject> {

  // Public Class Methods

  public static newCell(notebook: ServerNotebook, source: CellSource): FormulaCell {
    const obj: FormulaCellObject = {
      id: notebook.nextId(),
      type: CellType.Formula,
      cssSize: this.initialCellSize(notebook, DEFAULT_HEIGHT),
      displaySvg: <SvgMarkup>'',
      inputText: <PlainText>"",
      plainTextFormula: <PlainTextFormula>"",
      source,
      strokeData: deepCopy(EMPTY_STROKE_DATA),
    };
    return new this(notebook, obj);
  }

  // Public Constructor

  public constructor(notebook: ServerNotebook, obj: FormulaCellObject) {
    super(notebook, obj);
  }

  // Public Instance Methods

  public displaySvg(): SvgMarkup {
    const markup = <SvgMarkup>'';
    const quadraticFormulaTex = <TexExpression>"x = \\frac{{ - b \\pm \\sqrt {b^2 - 4ac} }}{{2a}}";
    const formulaMarkup = convertTexToSvg(quadraticFormulaTex);
    // TODO: Strip <svg></svg>
    return super.displaySvg(<SvgMarkup>(markup + formulaMarkup));

    // TODO: strip <svg></svg>
    return markup;
  }

}
