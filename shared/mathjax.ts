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

/*

This is code shared between the browser-side and server-side implementations
of rendering formulas using MathJax.

*/

// Requirements

import { assert, BoundingBox } from "./common";
import { cssLengthInPixels, CssLengthMetrics } from "./css";
import { TypesettingResults } from "./formula";
import { parseEnclosingSvgTag, parseViewBoxAttribute, SvgMarkup } from "./svg";

// Constants

// The length of an 'em' or 'ex' depends on font, of course,
// but for our current use of MathJax, these do not change.
export const EM_IN_PIXELS = 16;
export const EX_IN_PIXELS = 8;

const CSS_LENGTH_METRICS: CssLengthMetrics = {
  em: EM_IN_PIXELS,
  ex: EX_IN_PIXELS,
}

// Exported Functions

export function unwrap(enclosingSvgMarkup: SvgMarkup): TypesettingResults {

  const enclosingTagInfo = parseEnclosingSvgTag(enclosingSvgMarkup);
  assert(enclosingTagInfo.viewBox);
  const viewBox = parseViewBoxAttribute(enclosingTagInfo.viewBox!);
  assert(enclosingTagInfo.width);
  const width = cssLengthInPixels(enclosingTagInfo.width!, CSS_LENGTH_METRICS);
  assert(enclosingTagInfo.height);
  const height = cssLengthInPixels(enclosingTagInfo.height!, CSS_LENGTH_METRICS);

  const scale = width/viewBox.width;
  // REVIEW: Not sure why we can't put both transforms onto one <g> element.
  //         But to get this to work I needed to nest them, at least in the browser.
  const transform1 = `translate(${-viewBox.x} ${-viewBox.y})`;
  const transform2 = `scale(${scale})`;
  const svgMarkup = <SvgMarkup>`<g transform="${transform2}"><g transform="${transform1}">${enclosingTagInfo.innerMarkup}</g></g>`;

  // REVIEW: Can we get the bounding box more directly from $svg?
  const boundingBox: BoundingBox = { x: 0, y: 0, width, height };

  const rval: TypesettingResults = { svgMarkup, boundingBox };
  return rval;
}

