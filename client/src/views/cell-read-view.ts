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

import { CellObject } from "../shared/cell";
import { notImplemented } from "../shared/common";
import { NotebookUpdate } from "../shared/server-responses";

import { ClientCell } from "../client-cell";

import { CellView } from "./cell-edit-view";

// Exported Class

export class CellReadView<O extends CellObject> /* extends HtmlElement<'div'> */ implements CellView {

  public onUpdate(_update: NotebookUpdate, _ownRequest: boolean): void {
    notImplemented();
  };

  public constructor(_cell: ClientCell<O>) {
    // this.cell = cell;
  }

  // private cell: ClientCell<O>;
}

