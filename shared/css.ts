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

export function convertCssLength(cssLength: CssLength, newUnit: CssLengthUnit, metrics?: CssLengthMetrics): CssLength {
  const [ oldLength, oldUnit ] = splitCssLength(cssLength);
  const newLength = convertLength(oldLength, oldUnit, newUnit, metrics);
  return joinCssLength(newLength, newUnit);
}

export function cssLengthInPixels(cssLength: CssLength, metrics?: CssLengthMetrics): LengthInPixels {
  // NOTE: Depending on your application, you may need to round (or floor or ceil) the result.
  if (cssLength == <CssLength>"0") { return 0; }
  const [ length, unitIn ] = splitCssLength(cssLength);
  return convertLength(length, unitIn, 'px', metrics);
}

export function cssSizeFromPixels(width: LengthInPixels, height: LengthInPixels): CssSize {
  return {
    width: joinCssLength(width, 'px'),
    height: joinCssLength(height, 'px'),
  };
}

export function joinCssLength(length: number, unit: CssLengthUnit): CssLength {
  return <CssLength>`${length}${unit}`;
}

// Helper Functions

function convertLength(length: number, unitIn: CssLengthUnit, unitOut: CssLengthUnit, metrics?: CssLengthMetrics): number {
  const ratio = lengthConversionRatio(unitIn, unitOut, metrics);
  return length * ratio;
}

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
  ({ factor: divisor, unit: unitOut } = emExFactor(unitOut, metrics));
  const conversionFactor = (unitIn!=unitOut ? LENGTH_CONVERSION[unitIn][unitOut]! : 1);
  assert(conversionFactor, `No CSS conversion factor for ${unitIn}->${unitOut}`);
  const ratio = conversionFactor*multiplier/divisor;
  return ratio;
}

function splitCssLength(cssLength: CssLength): [ number, CssLengthUnit ] {
  assert(cssLength!=<CssLength>"0");
  const match = CSS_LENGTH_RE.exec(cssLength)!;
  assert(match, `Can't split CSS length '${cssLength}'`);
  return [ parseFloat(match[1]), <CssLengthUnit>match[3] ];
}
