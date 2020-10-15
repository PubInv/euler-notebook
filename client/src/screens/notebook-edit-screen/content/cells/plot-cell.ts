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
import { StyleObject, NotebookChange } from "../../../../shared/notebook";
import { Content } from "..";

import { CellBase } from "./cell-base";
import { Html, notImplemented } from "../../../../shared/common";
import { $new } from "../../../../dom";

// Types

// Constants

// Class

export class PlotCell extends CellBase {

  // Public Class Methods

  // Public Constructor

  public  constructor(container: Content, style: StyleObject) {

    const $tempPlaceholder = $new<'div'>({ tag: 'div', class: <CssClass>'plotCell', html: <Html>"<i>Not implemented</i>" });
    super(container, style, $tempPlaceholder);
    this.render(style);
  }

  // ClientNotebookWatcher Methods

  public onChange(_change: NotebookChange): void {
    notImplemented();
  }

  public onChangesFinished(): void {
    notImplemented();
  }


  // -- PRIVATE --

  // Private Instance Methods

  private render(style: StyleObject): void {
    debug(`Rendering plot cell: style ${style.id}`);
    notImplemented();
  }

  protected onResize(deltaY: number, final: boolean): void {
    debug(`onResize: ${deltaY} ${final}`);
  }

}