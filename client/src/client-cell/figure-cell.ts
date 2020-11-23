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
const debug = debug1('client:figure-cell');

import { FigureCellObject } from "../shared/cell";
import { NotebookUpdate } from "../shared/server-responses";

import { ClientNotebook } from "../client-notebook";

import { ClientCell } from "./index";
import { FigureEditView } from "../views/figure-edit-view";
import { notebookUpdateSynopsis } from "../shared/debug-synopsis";

// Exported Class

export class FigureCell extends ClientCell<FigureCellObject> {

  // Public Constructor

  public constructor(notebook: ClientNotebook, obj: FigureCellObject) {
    super(notebook, obj);
  }

  // Public Instance Methods

  public createEditView(): FigureEditView {
    const instance = new FigureEditView(this);
    this.views.add(instance);
    return instance;
  };

  public onUpdate(update: NotebookUpdate, ownRequest: boolean): void {
    debug(`onUpdate ${notebookUpdateSynopsis(update)}`);
    super.onUpdate(update, ownRequest);
  };

}
