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
const debug = debug1('client:client-cell');

import { CellId, CellObject, StylusCellObject } from "../shared/cell";
import { NotebookChangeRequest } from "../shared/client-requests";
import { assert, assertFalse, escapeHtml, Html, notImplemented } from "../shared/common";
import { NotebookUpdate } from "../shared/server-responses";

import { ChangeRequestResults, ClientNotebook } from "../client-notebook";
import { CellEditView } from "../views/cell-edit-view";
import { cellBriefSynopsis, cellSynopsis, notebookUpdateSynopsis } from "../shared/debug-synopsis";

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

  public toDebugHtml(): Html {
    return <Html>`<div>
<span class="collapsed">${escapeHtml(cellBriefSynopsis(this.obj))}</span>
<div class="nested" style="display:none">
  <tt>${escapeHtml(cellSynopsis(this.obj))}</tt>
</div>
</div>`;
  }

  // Public Instance Methods

  public abstract createEditView(): CellEditView<O>;

  public onUpdate(update: NotebookUpdate, ownRequest: boolean): void {
    debug(`onUpdate C${this.id} ${notebookUpdateSynopsis(update)}`);

    switch(update.type) {
      case 'strokeDeleted': {
        // TODO: Remove the stroke from stroke data.
        notImplemented();
        break;
      }
      case 'strokeInserted': {
        // TODO: Add the stroke to stroke data.
        assert(this.obj.hasOwnProperty('strokeData'));
        const obj = <StylusCellObject><unknown>this.obj;
        obj.strokeData.strokeGroups[0].strokes.push(update.stroke);
        break;
      }
      default: assertFalse();
    }
    for (const view of this.views) {
      view.onUpdate(update, ownRequest);
    }
  };

  public async delete(): Promise<void> {
    // Called when the 'X' button has been pressed in a cell.
    // Ask the notebook to delete us.
    await this.notebook.deleteCell(this.id);
  }

  // REVIEW: Make private and
  public sendChangeRequest(request: NotebookChangeRequest): Promise<ChangeRequestResults> {
    return this.notebook.sendChangeRequest(request);
  }

  // Private Instance Properties

  protected views: Set<CellView>;
  protected notebook: ClientNotebook;
}

