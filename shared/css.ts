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

export interface CssLengthMetrics {
  em?: number, // Length of an em in pixels
  ex?: number, // Length of an ex in pixels
}

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

const CSS_LENGTH_RE = /^(\d+(\.\d+)?)(em|ex|in|pt|px)$/;  // NOTE: Does not handle case of CSS length of "0".

export const PIXELS_PER_INCH = 96;
const POINTS_PER_INCH = 72;

const LENGTH_CONVERSION: LengthConversion = {
  // NOTE: We only have the conversion factors that we actually use.
  //       May need to add others as future needs arise.
  'in': {
    'px': PIXELS_PER_INCH,
  },
  'pt': {
    'pt': 1,
    'px': PIXELS_PER_INCH/POINTS_PER_INCH,
  },
  'px': {
    'px': 1,
  }
};

// Exported Functions

export function convertLength(length: number, unitIn: CssLengthUnit, unitOut: CssLengthUnit, metrics?: CssLengthMetrics): number {
  const ratio = lengthConversionRatio(unitIn, unitOut, metrics);
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

export function pixelsFromCssLength(cssLength: CssLength, metrics?: CssLengthMetrics): LengthInPixels {
  return Math.round(unroundedPixelsFromCssLength(cssLength, metrics));
}

export function unroundedPixelsFromCssLength(cssLength: CssLength, metrics?: CssLengthMetrics): LengthInPixels {
  if (cssLength == <CssLength>"0") { return 0; }
  const [ length, unitIn ] = splitCssLength(cssLength);
  return convertLength(length, unitIn, 'px', metrics);
}

// Helper Functions

function emExFactor(unit: CssLengthUnit, metrics?: CssLengthMetrics): { factor: number, unit: CssLengthUnit } {
  let factor: number;
  if (unit == <CssLengthUnit>'em' || unit == <CssLengthUnit>'ex') {
    assert(metrics, `Must specify CSS metrics when converting an '${unit}' unit.`)
    factor = (<any/* TYPESCRIPT: */>metrics)[unit]!;
    assert(factor, `No CSS metrics for '${unit}' unit.`);
    unit = 'px';
  } else { factor = 1; }
  return { unit, factor };
}

function lengthConversionRatio(unitIn: CssLengthUnit, unitOut: CssLengthUnit, metrics?: CssLengthMetrics): number {
  let multiplier, divisor: number;
  ({ factor: multiplier, unit: unitIn } = emExFactor(unitIn, metrics));
  ({ factor: divisor, unit: unitOut } = emExFactor(unitIn, metrics));
  const conversionFactor = (unitIn!=unitOut ? LENGTH_CONVERSION[unitIn][unitOut]! : 1);
  assert(conversionFactor, `No CSS conversion factor for ${unitIn}->${unitOut}`);
  return conversionFactor*multiplier/divisor;
}

function splitCssLength(cssLength: CssLength): [ number, CssLengthUnit ] {
  assert(cssLength!=<CssLength>"0");
  const match = CSS_LENGTH_RE.exec(cssLength)!;
  assert(match, `Can't split CSS length '${cssLength}'`);
  return [ parseFloat(match[1]), <CssLengthUnit>match[3] ];
}
