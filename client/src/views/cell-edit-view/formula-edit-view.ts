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

// TODO: Render prefix, handle and status into display SVG.

// Requirements

import * as debug1 from "debug";
const debug = debug1('client:formula-edit-view');

import { CssClass } from "../../shared/common";
import { FormulaCellObject } from "../../shared/formula";
import { NotebookUpdate } from "../../shared/server-responses";
import { notebookUpdateSynopsis } from "../../shared/debug-synopsis";

import { HtmlElementSpecification } from "../../dom";

import { FormulaCell } from "../../client-cell/formula-cell";

import { NotebookEditView } from "../notebook-edit-view";

import { CellEditView } from "./index";

// Types

// Constants

// Exported Class

export class FormulaEditView extends CellEditView<FormulaCellObject> {

  // Public Class Methods

  // Public Constructor

  public constructor(notebookEditView: NotebookEditView, cell: FormulaCell) {
    debug(`Creating instance: style ${cell.obj.id}`);

    const contentSpec: HtmlElementSpecification<'div'> ={
      tag: 'div',
      classes: [ <CssClass>'content', <CssClass>'formulaCell' ],
    };
    super(notebookEditView, cell, contentSpec);

    // TODO: Formula prefix, formula handle (formula number), formula status.
    // const prefixHtml = <Html>''; // LATER: Prefix may be something like, "Assume", or "Define", or "Prove" etc.,
    // const $inputPanel = $new({
    //   tag: 'div',
    //   class: <CssClass>'formulaInput',
    //   children: [
    //     { tag: 'div', class: <CssClass>'prefixPanel', html: prefixHtml },
    //     panel.$elt,
    //     { tag: 'div', class: <CssClass>'handlePanel', html: <Html>`(${cellObject.id})` },
    //     { tag: 'div', class: <CssClass>'statusPanel', html: <Html>'&nbsp;' },
    //   ],
    // });
  }

  // Public Instance Methods

  public onUpdate(update: NotebookUpdate, ownRequest: boolean): boolean {
    debug(`onUpdate C${this.id} ${notebookUpdateSynopsis(update)}`);
    super.onUpdate(update, ownRequest);
    // switch (update.type) {
    //   default: /* Nothing to do */ break;
    // }
    return false;
  }

  // -- PRIVATE --

  // Private Instance Properties

  // Private Instance Property Functions

  // Private Instance Methods

  // Private Event Handlers

}

// HELPER FUNCTIONS
