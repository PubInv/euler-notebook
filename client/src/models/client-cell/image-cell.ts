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
// const debug = debug1('client:plot-cell');

import { deepCopy } from "../../shared/common";
import { cssLengthFromPixels, CssSize } from "../../shared/css";
import { ImageCellObject, ImageInfo, PositionInfo } from "../../shared/image-cell";

import { ClientNotebook } from "../client-notebook";

import { ClientCell } from "./index";

// Exported Class

export class ImageCell extends ClientCell<ImageCellObject> {

  // Public Constructor

  public constructor(notebook: ClientNotebook, obj: ImageCellObject) {
    super(notebook, obj);
  }

  // Public Instance Property Functions

  public async changeImageRequest(imageInfo: ImageInfo, positionInfo: PositionInfo, newCellHeight?: number): Promise<void> {
    let cssSize: CssSize | undefined;
    if (newCellHeight) {
      cssSize = deepCopy(this.obj.cssSize);
      cssSize.height = cssLengthFromPixels(newCellHeight);
    }
    return this.notebook.changeImageRequest(this.id, imageInfo, positionInfo, cssSize);
  }

  // Public Instance Methods

  // Public Instance Event Handlers

  // --- PRIVATE ---

}

