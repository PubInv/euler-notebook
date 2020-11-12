/*
Math Tablet
Copyright (C) 2019 Public Invention
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

import { StylusInput } from "./stylus";
import { CellObject, CellType, InputType } from "./cell";
import { PlainText, SvgMarkup } from "./common";

// Types

// This type is for the variation of plain-text math input that we accept.
// Currently, it is the same as WolframExpression
// except that we convert single equals to double equals.
export type PlainTextFormula = '{PlainTextFormula}';

interface FormulaCellObjectBase extends CellObject {
  type: CellType.Formula,
  inputText: PlainText;
  plainTextFormula: PlainTextFormula; // REVIEW: Does the client need this?
}
export interface FormulaCellKeyboardObject extends FormulaCellObjectBase {
  inputType: InputType.Keyboard,
}
export interface FormulaCellStylusObject extends FormulaCellObjectBase {
  inputType: InputType.Stylus,
  stylusInput: StylusInput, // REVIEW: Does the client need this?
  stylusSvg: SvgMarkup,
}
interface FormulaCellNoInputObject extends FormulaCellObjectBase {
  inputType: InputType.None,
}
export type FormulaCellObject = FormulaCellKeyboardObject | FormulaCellStylusObject | FormulaCellNoInputObject;

// CONSTANTS

export const EMPTY_FORMULA = <PlainTextFormula>'';