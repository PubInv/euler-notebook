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
const debug = debug1('client:formula-cell');

import { CellObject, PlotCellObject } from "../shared/cell";
import { assertFalse, CssClass } from "../shared/common";
import { NotebookUpdate } from "../shared/server-responses";

import { CellEditView, ClientCell } from ".";
import { $outerSvg, HtmlElementSpecification } from "../dom";
import { notebookChangeSynopsis } from "../shared/debug-synopsis";
import { ClientNotebook } from "../client-notebook";

// Types

// Constants

// Exported Class

export class PlotClientCell extends ClientCell<PlotCellObject> {

  // Public Constructor

  public constructor(notebook: ClientNotebook, obj: PlotCellObject) {
    super(notebook, obj);
  }

  // Public Instance Methods

  public createEditView(): PlotCellEditView {
    const instance = new PlotCellEditView(this);
    this.views.add(instance);
    return instance;
  };

  public onUpdate(update: NotebookUpdate, ownRequest: boolean): void {
    super.onUpdate(update, ownRequest);
  };

}

// Exported Class

export class PlotCellEditView extends CellEditView<PlotCellObject> {

  // Public Class Methods

  // Public Constructor

  public  constructor(cell: PlotClientCell) {
    const contentSpec: HtmlElementSpecification<'div'> = {
      tag: 'div',
      classes: [ <CssClass>'plotCell', <CssClass>'content' ],
    };
    super(cell, contentSpec);
    this.$displayPanel = this.createDisplayPanel(cell.obj);
    this.$content.prepend(this.$displayPanel);
  }

  // ClientNotebookWatcher Methods

  public onUpdate(update: NotebookUpdate): void {
    debug(`onChange: style ${this.id} ${notebookChangeSynopsis(update)}`);

    switch (update.type) {
      case 'cellInserted': {
        // Ignore. Not something we are interested in.
        break;
      }
      // case 'styleChanged': {
      //   if (change.style.id == this.cellId) {
      //     this.updateDisplayPanel(change.style);
      //   } else {
      //     // Ignore. Not something that affects our display.
      //   }
      //   break;
      // }
      case 'cellDeleted': {
        // Ignore. Not something we are interested in.
        break;
      }
      case 'cellMoved': assertFalse();
      default: assertFalse();
    }
  }

  // -- PRIVATE --

  // Private Instance Properties

  private $displayPanel?: SVGSVGElement;

  // Private Instance Methods

  private createDisplayPanel(cellObject: CellObject): SVGSVGElement {
    const $displayPanel = $outerSvg<'svg'>(cellObject.displaySvg);
    $displayPanel.classList.add('display');
    return $displayPanel;
  }

  // private updateDisplayPanel(style: CellObject): void {
  //   const $displayPanel = this.createDisplayPanel(style);
  //   this.$displayPanel!.replaceWith($displayPanel);
  //   this.$displayPanel = $displayPanel;
  // }

  // Private Event Handlers

  protected onResize(_deltaY: number, _final: boolean): void {
    debug("PlotCell resize not implemented.");
  }

}
