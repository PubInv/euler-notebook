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

import { BoundingBox } from "./common";
import { CellObject, CellType, renderBaseCell } from "./cell";
import { convertLength, CssSize, LengthInPixels, pixelsFromCssLength, PIXELS_PER_INCH } from "./css";
import { EMPTY_MML_TREE, MathMlTree } from "./mathml";
import { SvgMarkup } from "./svg";

// Types

export type FormulaNumber = number; // TYPESCRIPT: Positive integer?
export type FormulaSymbol = '{FormulaSymbol}';
export type TexExpression = '{TexExpression}';
export type WolframExpression = '{WolframExpression}';

export interface FormulaCellObject extends CellObject {
  type: CellType.Formula,
  formula: FormulaObject;
}

export interface FormulaObject {
  mathMlTree: MathMlTree;
  // wolfram: WolframExpression;
}

export interface FormulaTypesetter{
  mathMlTreeToSvg(mathMlTree: MathMlTree, containerWidth: LengthInPixels): TypesettingResults;
}

export interface TypesettingResults {
  svgMarkup: SvgMarkup;
  boundingBox: BoundingBox;
}

// Constants

export const EMPTY_TEX_EXPRESSION = <TexExpression>'';
export const EMPTY_WOLFRAM_EXPRESSION = <WolframExpression>'';

export const EMPTY_FORMULA_OBJECT: FormulaObject = { mathMlTree: EMPTY_MML_TREE };

const FORMULA_INDENT = PIXELS_PER_INCH/2;

// Exported Functions

export function renderFormulaCell(
  formulaTypesetter: FormulaTypesetter,
  obj: FormulaCellObject,
  formulaNumber: FormulaNumber,
): SvgMarkup {
  return renderBaseCell(obj, <SvgMarkup>(
    formulaMarkup(formulaTypesetter, obj.formula, obj.cssSize) +
    formulaNumberMarkup(formulaNumber, obj.cssSize)
  ));
}

// Helper Functions

function formulaMarkup(
  formulaTypesetter: FormulaTypesetter,
  obj: FormulaObject,
  cssSize: CssSize
): SvgMarkup {
  const heightInPx = pixelsFromCssLength(cssSize.height);
  const widthInPx = pixelsFromCssLength(cssSize.width);
  const { svgMarkup, boundingBox } = formulaTypesetter.mathMlTreeToSvg(obj.mathMlTree, widthInPx);
  console.dir(boundingBox);
  const x = FORMULA_INDENT;
  const y = Math.round(heightInPx/2 - boundingBox.height/2);
  return <SvgMarkup>`<g transform="translate(${x} ${y})">${svgMarkup}</g>`;
}

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

