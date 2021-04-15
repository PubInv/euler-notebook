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
const debug = debug1('client:text-edit-view');

import { TextCellObject } from "../../shared/text";
import { CssClass } from "../../shared/css";
import { NotebookUpdate } from "../../shared/server-responses";
import { notebookUpdateSynopsis, cellSynopsis } from "../../shared/debug-synopsis";

import { TextCell } from "../../models/client-cell/text-cell";

import { NotebookEditView } from "../notebook-edit-view";

import { CellEditView } from "./index";

// Types

// Constants

// Exported Class

export class TextEditView extends CellEditView<TextCellObject> {

  // Public Class Methods

  // Public Constructor

  public constructor(notebookEditView: NotebookEditView, cell: TextCell) {
    debug(`Constructing: ${cellSynopsis(cell.obj)}`);
    super(notebookEditView, cell, <CssClass>'textCell');
  }

  // ClientNotebookWatcher Methods

  public onUpdate(update: NotebookUpdate, ownRequest: boolean): void {
    debug(`onUpdate C${this.id} ${notebookUpdateSynopsis(update)}`);
    super.onUpdate(update, ownRequest);
    switch(update.type) {
      case 'textTypeset': this.refreshDisplay(); break;
    }
  }

  // -- PRIVATE --

  // Private Instance Properties

  // Private Instance Property Functions

  // private get textCell(): TextCell {
  //   return <TextCell>this.cell;
  // }

  // Private Instance Methods

  // Private Instance Event Handlers

}
