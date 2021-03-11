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

import { deepCopy, PlainText, SvgMarkup, CssLength } from "../../shared/common";
import { CellSource, CellType } from "../../shared/cell";
import { FormulaCellObject, FormulaRecognitionAlternative } from "../../shared/formula";
import { EMPTY_STROKE_DATA } from "../../shared/stylus";

import { ServerNotebook } from "../server-notebook";
import { ServerFormula } from "../server-formula";

import { ServerCell } from "./index";
import { NotebookChangeRequest } from "../../shared/client-requests";
import { FormulaTypeset, NotebookUpdate } from "../../shared/server-responses";


// Constants

const DEFAULT_HEIGHT = <CssLength>"1in";

// Exported Class

export class FormulaCell extends ServerCell<FormulaCellObject> {

  // Public Class Methods

  public static newCell(notebook: ServerNotebook, source: CellSource): FormulaCell {
    const formula = ServerFormula.createEmpty();
    const obj: FormulaCellObject = {
      id: notebook.nextId(),
      type: CellType.Formula,
      cssSize: this.initialCellSize(notebook, DEFAULT_HEIGHT),
      displaySvg: <SvgMarkup>'',
      inputText: <PlainText>"",
      formula: formula.obj,
      source,
      strokeData: deepCopy(EMPTY_STROKE_DATA),
    };
    return new this(notebook, obj);
  }

  // Public Constructor

  public constructor(notebook: ServerNotebook, obj: FormulaCellObject) {
    super(notebook, obj);
    // IMPORTANT: ServerFormula and our FormulaCellObject share the same FormulaObject!
    this.formula = new ServerFormula(obj.formula);
  }

  // Public Instance Methods

  public typesetFormula(
    alternative: FormulaRecognitionAlternative,
    updates: NotebookUpdate[],
    _undoChangeRequests: NotebookChangeRequest[],
  ): void {

    // REVIEW: Size of cell could change.
    this.obj.strokeData = deepCopy(EMPTY_STROKE_DATA);
    this.formula.updateFormula(alternative.formula);
    this.redrawDisplaySvg();

    const update: FormulaTypeset = {
      type: 'formulaTypeset',
      cellId: this.id,
      displaySvg: this.obj.displaySvg,
      formula: this.obj.formula,
      strokeData: this.obj.strokeData,
    };
    updates.push(update);

    // TODO:
    // const undoChangeRequest: ...
    // undoChangeRequests.push(undoChangeRequest);
  }

  // --- PRIVATE ---

  // Private Instance Properties

  private formula: ServerFormula;

  // Private Instance Methods

  protected /* override */ redrawDisplaySvg(): void {
    // TODO: Formula numbering, etc.
    // TODO: Strip <svg></svg>?
    const formulaMarkup = this.formula.renderSvg();
    return super.redrawDisplaySvg(<SvgMarkup>(formulaMarkup));
  }


}
