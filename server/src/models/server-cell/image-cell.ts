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
// const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
// const debug = debug1(`server:${MODULE}`);

import { ImageCellObject } from "../../shared/image-cell";

import { ServerNotebook } from "../server-notebook";

import { ServerCell } from "./index";
import { LengthInPixels } from "../../shared/css";
import { SuggestionObject } from "../../shared/suggestions";

// Types


// Constants

// Exported Class

export class ImageCell extends ServerCell<ImageCellObject> {

  // Public Class Methods

  // Public Constructor

  public constructor(notebook: ServerNotebook, obj: ImageCellObject) {
    super(notebook, obj);
  }

  // Public Instance Methods

  // --- PRIVATE ---

  // Private Instance Properties

  // Public Instance Property Functions

  // Private Instance Methods

  protected async recognizeStrokes(
    _width: LengthInPixels,
    _height: LengthInPixels,
  ): Promise<SuggestionObject[]> {
    return [];
  }

  // Private Instance Event Handlers

}
