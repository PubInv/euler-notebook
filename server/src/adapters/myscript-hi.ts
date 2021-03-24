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
import { TextRecognitionResults } from "../shared/server-responses";
import { ServerFormula } from "../models/server-formula";
import { postLatexRequest, postTextRequest } from "./myscript-lo";
import { SvgMarkup } from "../shared/common";

// Types

// Parallels shared/formula.ts/FormulaRecognitionAlternative
interface ServerFormulaRecognitionAlternative {
  formula: ServerFormula;
  svg: SvgMarkup;
}

// Parallels shared/formula.ts/FormulaRecognitionResults
interface ServerFormulaRecognitionResults {
  alternatives: ServerFormulaRecognitionAlternative[];
}

// Exported Functions

export async function recognizeFormula(strokeData: StrokeData): Promise<ServerFormulaRecognitionResults> {
  const tex = await postLatexRequest(strokeData);
  const formula = await ServerFormula.createFromTeX(tex);
  const svg = formula.renderSvg();
  return { alternatives: [ { formula, svg } ] };
}

export async function recognizeText(strokeData: StrokeData): Promise<TextRecognitionResults> {
  const text = await postTextRequest(strokeData);
  return { alternatives: [ { text } ] };
}



