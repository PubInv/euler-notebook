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
const debug = debug1('client:figure-cell');

import { renderTextCell, TextCellObject } from "../../shared/text";
import { NotebookUpdate } from "../../shared/server-responses";

import { ClientNotebook } from "../client-notebook";

import { ClientCell } from "./index";
import { notebookUpdateSynopsis } from "../../shared/debug-synopsis";
import { SvgMarkup } from "../../shared/common";

// Exported Class

export class TextCell extends ClientCell<TextCellObject> {

  // Public Constructor

  public constructor(notebook: ClientNotebook, obj: TextCellObject) {
    super(notebook, obj);
    this.refreshDisplay();
  }

  // Public Instance Methods

  // Public Instance Event Handlers

  public onUpdate(update: NotebookUpdate, ownRequest: boolean): void {
    debug(`onUpdate ${notebookUpdateSynopsis(update)}`);
    super.onUpdate(update, ownRequest);

    switch(update.type) {
      case 'textTypeset': this.refreshDisplay(); break;
    }
  }

  // --- PRIVATE ---

  // Private Instance Property Functions

  protected render(): SvgMarkup { return renderTextCell(this.obj); }

}

