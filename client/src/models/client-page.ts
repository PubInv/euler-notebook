/*
Euler Notebook
Copyright (C) 2021 Public Invention
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

// import * as debug1 from "debug";
// const debug = debug1('client:client-page');

import { CssSize } from "../shared/css";
import { CellIndex, PageIndex } from "../shared/cell";


import { ClientNotebook } from "./client-notebook";

// Types

// Exported Class

export class ClientPage {

  // Public Constructor

  public constructor(
    notebook: ClientNotebook,
    pageIndex: PageIndex,
    _cellIndex: CellIndex,
    _numCells: number,
  ) {
    this.notebook = notebook;
    this.index = pageIndex;
  }

  // Public Instance Properties

  public index: PageIndex;

  // Public Instance Property Functions

  public get cssSize(): CssSize {
    return this.notebook.pageSize;
  }

  // --- PRIVATE ---

  // Private Instance Properties

  private notebook: ClientNotebook;
  // private pageNo: PageNumber;
}

// Helper Functions


