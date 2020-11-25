/*
Math Tablet
Copyright (C) 2019 Public Invention
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
const debug = debug1('client:figure-edit-view');

import { CssClass } from "../shared/common";
import { NotebookUpdate } from "../shared/server-responses";
import { notebookUpdateSynopsis } from "../shared/debug-synopsis";
import { FigureCellObject } from "../shared/cell";

import { HtmlElementSpecification } from "../dom";

import { FigureCell } from "../client-cell/figure-cell";
import { CellEditView } from "./cell-edit-view";

// Types

// Exported Class

export class FigureEditView extends CellEditView<FigureCellObject> {

  // Public Class Methods

  // Public Constructor

  public constructor(cell: FigureCell) {

    const contentSpec: HtmlElementSpecification<'div'> = {
      tag: 'div',
      classes: [ <CssClass>'content', <CssClass>'figureCell' ],
    };
    super(cell, contentSpec);
  }

  // Public Instance Methods

  // ClientNotebookWatcher Methods

  public onUpdate(update: NotebookUpdate, ownRequest: boolean): void {
    debug(`onUpdate: C${this.id} ${notebookUpdateSynopsis(update)}`);
    super.onUpdate(update, ownRequest);
    // switch (update.type) {
    //   default: /* Nothing to do */ break;
    // }
  }

  // -- PRIVATE --

  // Private Instance Properties

  // Private Instance Property Functions

  // Private Instance Methods

  // Private Instance Event Handlers

}


