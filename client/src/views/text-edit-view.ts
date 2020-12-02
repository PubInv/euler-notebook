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
const debug = debug1('client:text-edit-view');

import { TextCellObject } from "../shared/cell";
import { CssClass } from "../shared/common";
import { NotebookUpdate } from "../shared/server-responses";
import { notebookUpdateSynopsis, cellSynopsis } from "../shared/debug-synopsis";

import { $new } from "../dom";


import { TextCell } from "../client-cell/text-cell";
import { CellEditView } from "./cell-edit-view";

// Types

// Constants

// Exported Class

export class TextEditView extends CellEditView<TextCellObject> {

  // Public Class Methods

  // Public Constructor

  public constructor(cell: TextCell) {
    debug(`Constructing: ${cellSynopsis(cell.obj)}`);

    const $content = $new({
      tag: 'div',
      classes: [ <CssClass>'content', <CssClass>'textCell' ],
    });

    super(cell, $content);
  }

  // ClientNotebookWatcher Methods

  public onUpdate(update: NotebookUpdate, ownRequest: boolean): void {
    debug(`onUpdate C${this.id} ${notebookUpdateSynopsis(update)}`);
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
