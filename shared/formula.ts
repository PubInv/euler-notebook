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

import { CellObject, CellType } from "./cell";
import { SvgMarkup } from "./common";
import { convertLength, CssSize, pixelsFromCssLength } from "./css";

// Types

export type FormulaNumber = number; // TYPESCRIPT: Positive integer?
export type FormulaSymbol = '{FormulaSymbol}';
export type TexExpression = '{TexExpression}';
export type WolframExpression = '{WolframExpression}';

// This type is for the variation of plain-text math input that we accept.
// Currently, it is the same as WolframExpression
// except that we convert single equals to double equals.
export type PlainTextFormula = '{PlainTextFormula}';

export interface FormulaCellObject extends CellObject {
  type: CellType.Formula,
  formula: FormulaObject;
}

export interface FormulaObject {
  plain: PlainTextFormula;
  tex: TexExpression;
  wolfram: WolframExpression;
}

// Constants

export const EMPTY_PLAINTEXT_FORMULA = <PlainTextFormula>'';
export const EMPTY_TEX_EXPRESSION = <TexExpression>'';
export const EMPTY_WOLFRAM_EXPRESSION = <WolframExpression>'';

// Exported Functions

export function renderFormulaCell(obj: FormulaCellObject, formulaNumber: FormulaNumber): SvgMarkup {
  let markup: SvgMarkup = <SvgMarkup>'';
  // TODO: formula markup itself.
  markup += formulaNumberMarkup(formulaNumber, obj.cssSize);
  return <SvgMarkup>markup;
}

// Helper Functions

function formulaNumberMarkup(formulaNumber: FormulaNumber, cssSize: CssSize): SvgMarkup {
  const heightInPx = pixelsFromCssLength(cssSize.height);
  const widthInPx = pixelsFromCssLength(cssSize.width);
  const fontSizeInPt = 12;  // TODO:
  const fontCapHeightInPx = 12; // TODO:
  const fontEmInPix = convertLength(fontSizeInPt, 'pt', 'px');
  const x = Math.round(widthInPx - fontEmInPix*4);
  const y = Math.round(heightInPx/2 + fontCapHeightInPx/2);
  return <SvgMarkup>`<text class="formulaNumber" x="${x}" y="${y}">(${formulaNumber})</text>`;
}

