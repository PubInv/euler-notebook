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

import { SvgMarkup } from "../shared/common";

import { ServerFormula } from "../models/server-formula";
import { plotUnivariate } from "../adapters/wolframscript";
import { FormulaSymbol } from "../shared/formula";

// Types

// Exported Functions

export async function plotFormula(formula: ServerFormula, symbol: FormulaSymbol): Promise<SvgMarkup> {
  debug(`Plotting: symbol ${symbol}, formula ${formula.plain}`);
  const markup = await plotUnivariate(formula.obj.wolfram, symbol);
  // debug(`Plot markup: ${markup}`);
  return markup;
}

