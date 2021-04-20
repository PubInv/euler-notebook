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

import { assert, BoundingBox } from "./common";
import { CssLength } from "./css";

// Types

export type SvgMarkup = '{SvgMarkup}';
export type ViewBoxAttribute = '{ViewBoxAttribute}';

interface EnclosingSvgInfo {
  innerMarkup: SvgMarkup;
  width?: CssLength;
  height?: CssLength;
  viewBox?: ViewBoxAttribute;
  [ attr: string ]: string|undefined;
}

// interface ViewBox {
//   x: number,
//   y: number,
//   width: number,
//   height: number,
// }

// Constants

// REVIEW: Should this be "<svg ...></svg>"?
export const EMPTY_SVG_MARKUP = <SvgMarkup>'';

const SVG_START_TAG_RE = /^<svg([^>]*)>/;
const SVG_END_TAG_RE = /\s*<\/svg>\s*/;

const ATTRIBUTE_RE = /\s+([^=]+)="([^"]*)"/g;

const VIEWBOX_ATTRIBUTE_RE = /^(-?\d+(\.\d+)?)\s+(-?\d+(\.\d+)?)\s+(-?\d+(\.\d+)?)\s+(-?\d+(\.\d+)?)/;

// Exported Functions

export function parseEnclosingSvgTag(svgMarkup: SvgMarkup): EnclosingSvgInfo {
  const startMatch = SVG_START_TAG_RE.exec(svgMarkup)!;
  assert(startMatch);
  const endMatch = SVG_END_TAG_RE.exec(svgMarkup)!;
  assert(endMatch);
  const innerMarkup = <SvgMarkup>svgMarkup.slice(startMatch[0].length, -endMatch[0].length);
  const rval: EnclosingSvgInfo = { innerMarkup };
  const attributes = startMatch[1];
  for (const attributeMatch of attributes.matchAll(ATTRIBUTE_RE)) {
    rval[attributeMatch[1]]=attributeMatch[2];
  }
  return rval;
}

export function parseViewBoxAttribute(viewBoxAttr: ViewBoxAttribute): BoundingBox {
  const match = VIEWBOX_ATTRIBUTE_RE.exec(viewBoxAttr)!;
  assert(match);
  const rval: BoundingBox = {
    x: parseFloat(match[1]),
    y: parseFloat(match[3]),
    width: parseFloat(match[5]),
    height: parseFloat(match[7]),
  };
  return rval;
}
