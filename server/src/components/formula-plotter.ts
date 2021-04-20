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

import * as debug1 from "debug";
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

import { assert } from "../shared/common";
import { SvgMarkup } from "../shared/svg";

import { ServerFormula } from "../models/server-formula";
import { plotUnivariate } from "../adapters/wolframscript";
import { FormulaSymbol, WolframExpression } from "../shared/formula";

// Types

interface PlotReturnValue {
  plotMarkup: SvgMarkup,
  thumbnailMarkup: SvgMarkup,
}

// Constants

const SVG_TAG_RE = /^(<svg xmlns="http:\/\/www.w3.org\/2000\/svg" xmlns:xlink="http:\/\/www.w3.org\/1999\/xlink" width=")(\d+)(pt" height=")(\d+)(pt" viewBox="0 0 \d+ \d+" version="1.1">)/

const THUMBNAIL_SCALE_DIVISOR = 8;

// Exported Functions

export async function plot(_formula: ServerFormula, symbol: FormulaSymbol): Promise<PlotReturnValue> {
  throw new Error("Not implemented");
  const wolframExpression = <WolframExpression>'TODO: get wolfram expression from formula';
  debug(`Plotting: symbol ${symbol}, formula ${wolframExpression}`);
  const plotMarkup = await plotUnivariate(wolframExpression, symbol);
  // debug(`Plot markup: ${fullPlotMarkup}`);
  const thumbnailMarkup = thumbnailPlotFromFullPlot(plotMarkup);
  return { plotMarkup, thumbnailMarkup };
}

// Helper Functions

function thumbnailPlotFromFullPlot(fullPlotMarkup: SvgMarkup): SvgMarkup {
  // HACK ALERT:
  // To create a thumbnail plot we just change the width and height on the root SVG element to a fraction of the original size.
  // This is fragile, depending on specific ordering of attributes in the SVG element,
  // and the full markup is significantly larger than necessary for a thumbnail.
  // It is intended that a future plotting system will create a separate, mimimal thumbnail plot at the same time it creates the full plot.
  // TODO: Use parseEnclosingSvgTag from shared/svg.ts
  const match = SVG_TAG_RE.exec(fullPlotMarkup)!;
  assert(match);
  assert(match.index == 0);
  const width = parseInt(match[2], 10);
  const height = parseInt(match[4], 10);
  const thumbnailWidth = Math.round(width/THUMBNAIL_SCALE_DIVISOR);
  const thumbnailHeight = Math.round(height/THUMBNAIL_SCALE_DIVISOR);
  const rval = <SvgMarkup>`${match[1]}${thumbnailWidth}${match[3]}${thumbnailHeight}${match[5]}${fullPlotMarkup.substring(match[0].length)}`;
  return rval;
}
