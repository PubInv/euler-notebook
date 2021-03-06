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

// Requirements

// import * as debug1 from "debug";
// const debug = debug1('client:figure-cell');

import { TextCellObject } from "../../shared/text";

import { ClientNotebook } from "../client-notebook";

import { ClientCell } from "./index";

// Exported Class

export class TextCell extends ClientCell<TextCellObject> {

  // Public Constructor

  public constructor(notebook: ClientNotebook, obj: TextCellObject) {
    super(notebook, obj);
  }

  // Public Instance Property Functions

  // Public Instance Methods

  // Public Instance Event Handlers

  // --- PRIVATE ---

}

