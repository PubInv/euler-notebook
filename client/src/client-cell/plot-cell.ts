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

import { CellObject } from "../shared/cell";
import { assertFalse, CssClass } from "../shared/common";
import { NotebookUpdate } from "../shared/server-responses";
import { Content as CellContainer } from "../screens/notebook-edit-screen/content";

import { CellBase } from "./cell-base";
import { $outerSvg, HtmlElementSpecification } from "../dom";
import { notebookChangeSynopsis } from "../shared/debug-synopsis";

// Types

// Constants

// Class

export class PlotCell extends CellBase {

  // Public Class Methods

  // Public Constructor

  public  constructor(container: CellContainer, style: CellObject) {
    const contentSpec: HtmlElementSpecification<'div'> = {
      tag: 'div',
      classes: [ <CssClass>'plotCell', <CssClass>'content' ],
    };
    super(container, style, contentSpec);
    this.$displayPanel = this.createDisplayPanel(style);
    this.$content.prepend(this.$displayPanel);
  }

  // ClientNotebookWatcher Methods

  public onChange(change: NotebookUpdate): void {
    debug(`onChange: style ${this.cellId} ${notebookChangeSynopsis(change)}`);

    switch (change.type) {
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
