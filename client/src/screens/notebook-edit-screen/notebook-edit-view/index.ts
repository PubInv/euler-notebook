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

// TODO: Hide focus ring unless user is using keyboard:
//       https://medium.com/hackernoon/removing-that-ugly-focus-ring-and-keeping-it-too-6c8727fefcd2

// Requirements

import * as debug1 from "debug";
const debug = debug1('client:notebook-edit-view');

import { CellId, CellObject, CellPosition, CellRelativePosition, CellType } from "../../../shared/cell";
import { assert } from "../../../shared/common";
import { CssClass } from "../../../shared/css";
import { notebookUpdateSynopsis } from "../../../shared/debug-synopsis";
import { CellDeleted, CellInserted, CellMoved, NotebookUpdate } from "../../../shared/server-responses";

import { StylusMode } from "../../../components/stroke-panel";

import { NotebookEditScreen } from "..";

import { HtmlElement } from "../../../html-element";
import { ClientNotebook } from "../../../models/client-notebook";
import { $, RIGHT_TRIANGLE_ENTITY } from "../../../dom";

import { CellEditView } from "./cell-edit-view";
import { createCellView } from "./cell-edit-view/instantiator";

// Exported Class

export class NotebookEditView extends HtmlElement<'div'> {

  // Public Class Methods

  // Public Constructor

  public constructor(_container: NotebookEditScreen, notebook: ClientNotebook) {
    super({
      tag: 'div',
      class: <CssClass>'content',
      children: [{
        tag: 'button',
        attrs: { tabindex: -1 },
        classes: [ <CssClass>'insertCellAtTopButton', <CssClass>'iconButton' ],
        html: RIGHT_TRIANGLE_ENTITY,
        asyncButtonHandler: e=>this.onInsertCellAtTopButtonClicked(e),
      }],
    });

    this.cellViewMap = new Map();
    // this.container = _container;
    this.insertMode = CellType.Formula;
    this._stylusMode = StylusMode.Draw;
    this.notebook = notebook;

    let afterId: CellRelativePosition = CellPosition.Top;
    for (const cellObject of notebook.cellObjects()) {
      const cellUpdate: CellInserted = { type: 'cellInserted', cellObject, afterId }
      this.onCellInserted(cellUpdate);
      afterId = cellObject.id;
    }
  }

  // Public Instance Properties

  public insertMode: CellType;
  private _stylusMode: StylusMode;

  // Public Instance Property Functions

  public get stylusMode(): StylusMode {
    return this._stylusMode;
  }

  public set stylusMode(value: StylusMode) {
    // REVIEW: Warn if setting mode to same as existing?
    this._stylusMode = value;
    for (const cellView of this.cellViewMap.values()) {
      cellView.stylusMode = value;
    }
  }

  // Public Instance Methods

  public async insertCellRequest(afterId: CellRelativePosition): Promise<void> {
    await this.notebook.insertCellRequest(this.insertMode, afterId);
  }

  public async moveCellRequest(movedCellId: CellId, droppedCellId: CellId): Promise<void> {
    debug(`Move cell: ${movedCellId}, ${droppedCellId}`);
    // REVIEW: Placeholder move?
    await this.notebook.moveCellRequest(movedCellId, droppedCellId);
  }

  // Public Instance Methods

  // Public Instance Event Handlers

  public onUpdate(update: NotebookUpdate): void {
    debug(`onUpdate P${this.notebook.path} ${notebookUpdateSynopsis(update)}`);

    // Update our data structure
    switch (update.type) {
      case 'cellDeleted':  this.onCellDeleted(update); break;
      case 'cellInserted': this.onCellInserted(update); break;
      case 'cellMoved':    this.onCellMoved(update); break;
      default: /* Nothing to do */ break;
    }
  }

  // -- PRIVATE --

  // Private Instance Properties

  private cellViewMap: Map<CellId, CellEditView<CellObject>>;
  // private container: NotebookEditScreen;
  private notebook: ClientNotebook;

  // Private Instance Property Functions

  private getCellView<O extends CellObject>(cellId: CellId): CellEditView<O> {
    const rval = this.cellViewMap.get(cellId)!;
    assert(rval);
    return <CellEditView<O>>rval;
  }

  // Private Instance Methods

  private deleteCellView(cellId: CellId): CellEditView<CellObject> {
    const cellView =  this.getCellView(cellId);
    cellView.$elt.remove();
    this.cellViewMap.delete(cellId);
    return cellView;
  }

  private insertCellView(cellView: CellEditView<CellObject>, afterId: CellRelativePosition): void {
    this.cellViewMap.set(cellView.id, cellView);
    if (afterId == CellPosition.Top) {
      $(this.$elt, '.insertCellAtTopButton').after(cellView.$elt);
    } else if (afterId == CellPosition.Bottom) {
      this.$elt.append(cellView.$elt);
    } else {
      const precedingCellView = this.getCellView(afterId);
      precedingCellView.$elt.after(cellView.$elt);
    }
  }

  // Private Instance Event Handlers

  private onCellDeleted(update: CellDeleted): void {
    const { cellId } = update;
    const cellView = this.deleteCellView(cellId);
    cellView.onCellDeleted(update);
  }

  private onCellInserted(update: CellInserted): void {
    const { cellObject, afterId } = update;
    const cell = this.notebook.getCell(cellObject.id);
    const cellView = createCellView(this, cell);
    this.insertCellView(cellView, afterId);
  }

  private onCellMoved(update: CellMoved): void {
    const { cellId, afterId } = update;
    const cellView = this.deleteCellView(cellId);
    this.insertCellView(cellView, afterId);
  }

  private async onInsertCellAtTopButtonClicked(event: MouseEvent): Promise<void> {
    event.preventDefault(); // Don't take focus.
    await this.insertCellRequest(CellPosition.Top);
  }

}

// Helper Functions
