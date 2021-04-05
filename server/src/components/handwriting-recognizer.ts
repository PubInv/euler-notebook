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

import { StrokeData } from "../shared/stylus";
import { ServerFormula } from "../models/server-formula";
import { /* postJiixRequest, */ postLatexRequest, postTextRequest } from "../adapters/myscript";
import { PlainText, SvgMarkup } from "../shared/common";

// Types

export interface FormulaRecognitionAlternative {
  formula: ServerFormula;
  svg: SvgMarkup;
}

export interface FormulaRecognitionResults {
  alternatives: FormulaRecognitionAlternative[];
}

export interface TextRecognitionAlternative {
  text: PlainText;
}

export interface TextRecognitionResults {
  alternatives: TextRecognitionAlternative[];
}

// Exported Functions

export async function recognizeFormula(strokeData: StrokeData): Promise<FormulaRecognitionResults> {
  // LATER:
  // const jiix = await postJiixRequest(strokeData);
  // const formula = ServerFormula.createFromJiix(jiix);
  const tex = await postLatexRequest(strokeData);
  const formula = await ServerFormula.createFromTeX(tex);
  const svg = formula.renderSvg();
  return { alternatives: [ { formula, svg } ] };
}

export async function recognizeText(strokeData: StrokeData): Promise<TextRecognitionResults> {
  const text = await postTextRequest(strokeData);
  return { alternatives: [ { text } ] };
}



