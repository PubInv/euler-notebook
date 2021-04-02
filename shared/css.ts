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

import { assert } from "./common";

// Types

export type CssClass = '{CssClass}';
export type CssLength = '{CssLength}';
export type CssLengthUnit = 'in'|'pt'|'px';
export type CssSelector = '{CssSelector}';

export type LengthInPixels = number;
export type PositionInPixels = number;

export interface CssSize {
  height: CssLength;
  width: CssLength;
}

interface LengthConversion {
  [ unit: string /* CssLengthUnit */]: LengthConversion2;
}
interface LengthConversion2 {
  [ unit: string /* CssLengthUnit */]: number;
}

// Constants

const CSS_LENGTH_RE = /^(\d+(\.\d+)?)(in|px)$/;

export const PIXELS_PER_INCH = 96;
const POINTS_PER_INCH = 72;

const LENGTH_CONVERSION: LengthConversion = {
  // NOTE: We only have the conversion factors that we actually use.
  //       May need to add others as future needs arise.
  'in': {
    'px': PIXELS_PER_INCH,
  },
  'pt': {
    'px': PIXELS_PER_INCH/POINTS_PER_INCH,
  },
  'px': {
    'px': 1,
  }
};

// Exported Functions

export function convertLength(length: number, unitIn: CssLengthUnit, unitOut: CssLengthUnit): number {
  const ratio = lengthConversionRatio(unitIn, unitOut);
  return length * ratio;
}

export function cssLengthInPixels(length: number, unit: CssLengthUnit): CssLength {
  const lengthInPixels = Math.round(convertLength(length, unit, 'px'));
  return <CssLength>`${lengthInPixels}px`;
}

export function cssSizeInPixels(width: LengthInPixels, height: LengthInPixels, unit: CssLengthUnit): CssSize {
  return {
    width: cssLengthInPixels(width, unit),
    height: cssLengthInPixels(height, unit),
  };
}

export function pixelsFromCssLength(cssLength: CssLength): LengthInPixels {
  const [ length, unitIn ] = splitCssLength(cssLength);
  return Math.round(convertLength(length, unitIn, 'px'));
}

// Helper Functions

function lengthConversionRatio(unitIn: CssLengthUnit, unitOut: CssLengthUnit): number {
  const rval = LENGTH_CONVERSION[unitIn][unitOut]!;
  assert(rval);
  return rval;
}

function splitCssLength(cssLength: CssLength): [ number, CssLengthUnit ] {
  const match = CSS_LENGTH_RE.exec(cssLength)!;
  assert(match);
  return [ parseFloat(match[1]), <CssLengthUnit>match[3] ];
}
