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

import { CssClass, Html } from "../shared/common";
import { Stroke } from "../shared/myscript-types";
import { NotebookUpdate, StrokeInserted } from "../shared/server-responses";
import { notebookUpdateSynopsis } from "../shared/debug-synopsis";
import { FigureCellObject } from "../shared/cell";
import { InsertStroke } from "../shared/client-requests";

import { HtmlElementSpecification } from "../dom";
import { logError } from "../error-handler";
import { StrokeCallbackFn, StrokePanel } from "../components/stroke-panel";

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
    this.$inputPanel = this.createInputPanel();
    this.$content.append(this.$inputPanel);
  }

  // Public Instance Methods

  // ClientNotebookWatcher Methods

  public onUpdate(update: NotebookUpdate, ownRequest: boolean): void {
    debug(`onUpdate: C${this.id} ${notebookUpdateSynopsis(update)}`);
    super.onUpdate(update, ownRequest);
    switch (update.type) {
      case 'strokeInserted': this.onStrokeInserted(update, ownRequest); break;
    }
  }

  // -- PRIVATE --

  // Private Instance Properties

  private $inputPanel: HTMLDivElement;
  private strokePanel!: StrokePanel;

  // Private Instance Property Functions

  // Private Instance Methods

  private createInputPanel(): HTMLDivElement {
    const panel = this.strokePanel = this.createStrokeSubpanel(this.cell.obj);
    return panel.$elt;
  }

  private createStrokeSubpanel(cellObject: FigureCellObject): StrokePanel {
    const callbackFn: StrokeCallbackFn = async (stroke: Stroke)=>{
      const changeRequest: InsertStroke = { type: 'insertStroke', cellId: cellObject.id, stroke };
      // TODO: Remove tentative stroke from subpanel.
      await this.cell.sendChangeRequest(changeRequest)
      .catch(err=>{
        // REVIEW: Proper way to handle this error?
        logError(err, <Html>"Error sending stroke from figure cell");
      });
    };

    // Create the panel
    const strokePanel = new StrokePanel(cellObject.cssSize, cellObject.strokeData, callbackFn);
    return strokePanel;
  }

  // Private Instance Event Handlers

  private onStrokeInserted(update: StrokeInserted, _ownRequest: boolean): void {
    this.strokePanel.insertStroke(update.strokeId, update.stroke);
  }
}


