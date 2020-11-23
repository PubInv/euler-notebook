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

import { CellId, CellObject } from "../shared/cell";
import { NotebookChangeRequest } from "../shared/client-requests";
import { assertFalse, notImplemented } from "../shared/common";
import { NotebookUpdate } from "../shared/server-responses";

import { ChangeRequestResults, ClientNotebook } from "../client-notebook";
import { CellEditView } from "../views/cell-edit-view";

// Types

export interface CellView {
  onUpdate(update: NotebookUpdate, ownRequest: boolean): void;
}


// Exported Class

export abstract class ClientCell<O extends CellObject> {

  // Public Constructor

  public constructor(notebook: ClientNotebook, obj: O) {
    this.notebook = notebook;
    this.obj = obj;
    this.views = new Set();
  }

  // Public Instance Properties

  public obj: O;

  // Public Instance Property Functions

  public get id(): CellId { return this.obj.id; }

  // Public Instance Methods

  public abstract createEditView(): CellEditView<O>;

  public onUpdate(update: NotebookUpdate, ownRequest: boolean): void {

    switch(update.type) {
      case 'strokeDeleted': {
        // TODO: Remove the stroke from stroke data.
        notImplemented();
        break;
      }
      case 'strokeInserted': {
        // TODO: Add the stroke to stroke data.
        notImplemented();
        break;
      }
      default: assertFalse();
    }
    for (const view of this.views) {
      view.onUpdate(update, ownRequest);
    }
  };

  public removeFromNotebook(): Promise<void> {
    notImplemented();
    // WAS: container.deleteTopLevelStyle(this.cellId)
  }

  // REVIEW: Make private and
  public sendChangeRequest(request: NotebookChangeRequest): Promise<ChangeRequestResults> {
    return this.notebook.sendChangeRequest(request);
  }

  // Private Instance Properties

  protected views: Set<CellView>;
  protected notebook: ClientNotebook;
}

