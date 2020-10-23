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

import { CssClass } from "../../../../shared/common";
import { NotebookChange, StyleObject } from "../../../../shared/notebook";
import { Content as CellContainer } from "..";

import { CellBase } from "./cell-base";
import { HtmlElementSpecification } from "../../../../dom";
import { notebookChangeSynopsis } from "../../../../shared/debug-synopsis";

// Types

// Constants

// Class

export class PlotCell extends CellBase {

  // Public Class Methods

  // Public Constructor

  public  constructor(container: CellContainer, style: StyleObject) {
    const contentSpec: HtmlElementSpecification<'div'> = {
      tag: 'div',
      classes: [ <CssClass>'plotCell', <CssClass>'content' ],
    };
    super(container, style, contentSpec);
  }

  // ClientNotebookWatcher Methods

  public onChange(change: NotebookChange): void {
    debug(`onChange: style ${this.styleId} ${notebookChangeSynopsis(change)}`);

    // TODO:
    // switch (change.type) {
    //   case 'styleInserted':
    //   case 'styleChanged':
    //   case 'styleConverted':
    //   case 'styleDeleted':
    //   default: assertFalse();
    // }
  }

  public onChangesFinished(): void { /* Nothing to do. */ }

  // -- PRIVATE --

  // Private Instance Methods

  protected onResize(_deltaY: number, _final: boolean): void {
    debug("PlotCell resize not implemented.");
  }

}
