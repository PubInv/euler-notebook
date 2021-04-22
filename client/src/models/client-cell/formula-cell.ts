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
// const debug = debug1('client:formula-cell');

import { SvgMarkup } from "../../shared/svg";
import { FormulaCellObject, FormulaNumber, renderFormulaCell } from "../../shared/formula";

import { ClientNotebook } from "../client-notebook";

import { ClientCell } from "./index";
import { MathJaxTypesetter } from "../../adapters/mathjax-typesetter";

// Exported Class

export class FormulaCell extends ClientCell<FormulaCellObject> {

  // Public Constructor

  public constructor(notebook: ClientNotebook, obj: FormulaCellObject) {
    super(notebook, obj);

    // TODO:
    this.formulaNumber = obj.id;
  }

  // Public Instance Properties

  public formulaNumber: FormulaNumber;

  // Public Instance Property Functions

  public /* override */ renderToSvg(x: number, y: number): SvgMarkup {
    const innerMarkup = renderFormulaCell(MathJaxTypesetter.singleton, this.obj, this.formulaNumber);
    return super.renderToSvg(x, y, innerMarkup);
  }

  // Public Instance Methods

  // Public Instance Event Handlers

  // public /* override */ onUpdate(update: NotebookUpdate, ownRequest: boolean): void {
  //   debug(`onUpdate ${notebookUpdateSynopsis(update)}`);
  //   super.onUpdate(update, ownRequest);
  // }

  // --- PRIVATE ---

}


