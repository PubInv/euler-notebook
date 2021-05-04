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

import { assert, BoundingBox } from "./common";
import { CellObject, CellType, renderBaseCell } from "./cell";
import { ContentMathMlTree } from "./content-mathml";
import { CssSize, LengthInPixels, cssLengthInPixels } from "./css";
import { FORMULA_INDENT, FORMULA_NUMBER_INDENT } from "./dimensions";
import { EMPTY_MML_TREE, PresentationMathMlTree } from "./presentation-mathml";
import { SvgMarkup, translateSvgMarkup } from "./svg";

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
  contentMathMlTree?: ContentMathMlTree;
  presentationMathMlTree: PresentationMathMlTree;
  // wolfram: WolframExpression;
}

export interface FormulaTypesetter{
  presentationMathMlTreeToSvg(presentationMathMlTree: PresentationMathMlTree, containerWidth: LengthInPixels): TypesettingResults;
}

export interface TypesettingResults {
  svgMarkup: SvgMarkup;
  boundingBox: BoundingBox;
}

// Constants

export const EMPTY_TEX_EXPRESSION = <TexExpression>'';
export const EMPTY_WOLFRAM_EXPRESSION = <WolframExpression>'';

export const EMPTY_FORMULA_OBJECT: FormulaObject = { presentationMathMlTree: EMPTY_MML_TREE };

const FORMULA_INDENT_PX = cssLengthInPixels(FORMULA_INDENT);
const FORMULA_NUMBER_INDENT_PX = cssLengthInPixels(FORMULA_NUMBER_INDENT);

// Global Variables

let gFormulaTypesetter: FormulaTypesetter;

// Exported Functions

export function renderFormula(formulaObject: FormulaObject, containerWidth: LengthInPixels): TypesettingResults {
  return gFormulaTypesetter.presentationMathMlTreeToSvg(formulaObject.presentationMathMlTree, containerWidth);
}

export function renderFormulaCell(
  x: LengthInPixels,
  y: LengthInPixels,
  obj: FormulaCellObject,
  formulaNumber: FormulaNumber,
): SvgMarkup {
  assert(gFormulaTypesetter);
  return renderBaseCell(x, y, obj, <SvgMarkup>(
    formulaMarkup(obj.formula, obj.cssSize) +
    formulaNumberMarkup(formulaNumber, obj.cssSize)
  ));
}

export function initialize(formulaTypesetter: FormulaTypesetter) {
  assert(!gFormulaTypesetter);
  gFormulaTypesetter = formulaTypesetter;
}

// Helper Functions

function formulaMarkup(
  obj: FormulaObject,
  cssSize: CssSize
): SvgMarkup {
  const height = cssLengthInPixels(cssSize.height);
  const width = cssLengthInPixels(cssSize.width);
  const usableWidth = width - FORMULA_INDENT_PX - FORMULA_NUMBER_INDENT_PX;
  const { svgMarkup, boundingBox } = renderFormula(obj, usableWidth);
  const x = FORMULA_INDENT_PX;
  const y = Math.round(height/2 - boundingBox.height/2);
  return translateSvgMarkup(x, y, svgMarkup);
}

function formulaNumberMarkup(formulaNumber: FormulaNumber, cssSize: CssSize): SvgMarkup {
  // LATER: Right justify the formula numbers.
  const height = cssLengthInPixels(cssSize.height);
  const width = cssLengthInPixels(cssSize.width);
  const fontCapHeightInPx = 12; // TODO:
  const x = width - FORMULA_NUMBER_INDENT_PX;
  const y = height/2 + fontCapHeightInPx/2;
  // "Times New Roman",
  return <SvgMarkup>`<text fill="black" font="font 14pt Times, serif" stroke="none" x="${x}" y="${y}">(${formulaNumber})</text>`;
}

