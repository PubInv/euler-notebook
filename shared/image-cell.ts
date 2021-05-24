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

import { CellObject, CellType, renderBaseCell } from "./cell";
import { SvgMarkup, translateSvgMarkup } from "./svg";
import { cssLengthInPixels, LengthInPixels } from "./css";
import { AbsoluteUrl, DataUrl } from "./common";

// Types

export type ImageUrl = AbsoluteUrl | DataUrl;

export interface ImageInfo {
  url: ImageUrl,            // Image data URL or absolute URL to publicly available image.
  width: LengthInPixels,    // Original size of image
  height: LengthInPixels,
  x: LengthInPixels;        // Position in cell of top-left corner of image
  y: LengthInPixels;
  magnification: number;    // 1.0 = 100%
  // LATER: rotation
}

export interface ImageCellObject extends CellObject {
  type: CellType.Image,
  info?: ImageInfo,
}

// Constants

// Credit: https://iconmonstr.com/picture-9-svg/
const ICONMONSTR_PICTURE9 = <SvgMarkup>'<path fill="black" stroke="none" d="M19.5 12c-2.483 0-4.5 2.015-4.5 4.5s2.017 4.5 4.5 4.5 4.5-2.015 4.5-4.5-2.017-4.5-4.5-4.5zm2.5 5h-5v-1h5v1zm-18 0l4-5.96 2.48 1.96 2.52-4 1.853 2.964c-1.271 1.303-1.977 3.089-1.827 5.036h-9.026zm10.82 4h-14.82v-18h22v7.501c-.623-.261-1.297-.422-2-.476v-5.025h-18v14h11.502c.312.749.765 1.424 1.318 2zm-9.32-11c-.828 0-1.5-.671-1.5-1.5 0-.828.672-1.5 1.5-1.5s1.5.672 1.5 1.5c0 .829-.672 1.5-1.5 1.5z"/>';

// Exported Functions

export function renderImageCell(x: LengthInPixels, y: LengthInPixels, obj: ImageCellObject): SvgMarkup {
  let imageMarkup: SvgMarkup;
  if (obj.info) {
    imageMarkup = <SvgMarkup>`<image href="${obj.info.url}" />`;
  } else {
    const cellWidth = cssLengthInPixels(obj.cssSize.width);
    const cellHeight = cssLengthInPixels(obj.cssSize.height);
    const iconX = Math.round(cellWidth/2 - 12);
    const iconY = Math.round(cellHeight/2 - 12);
    const rectSvg = `<rect x="2" y="2" width="${cellWidth-4}" height="${cellHeight-4}" stroke="black" fill="none"/>`
    imageMarkup = <SvgMarkup>`${rectSvg}${translateSvgMarkup(iconX, iconY, ICONMONSTR_PICTURE9)}`;
  }
  return renderBaseCell(x, y, obj, imageMarkup);
}
