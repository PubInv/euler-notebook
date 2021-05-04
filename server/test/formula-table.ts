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

// This file exports a table of formulas.
// Each entry contains a single formula in a variety of formats.
// Used for testing our conversion between formats.

// Requirements

import { JiixMathBlock } from "../src/adapters/myscript";
import { ContentMathMlTree } from "../src/shared/content-mathml";
import { TexExpression, WolframExpression } from "../src/shared/formula";
import { PresentationMathMlTree } from "../src/shared/presentation-mathml";

// Types

interface FormulaEntry {
  plain: string; // Plain text representation for documentation purposes only.
  contentMathMlTree: ContentMathMlTree,
  jiix: JiixMathBlock,
  presentationMathMlTree: PresentationMathMlTree,
  // TODO: semanticFormula
  tex: TexExpression,
  wolfram: WolframExpression,
}

// Exported Data

export const FORMULA_TABLE: FormulaEntry[] = [
  { plain: "1+1",
    contentMathMlTree: {
      type: 'math', /* TODO: child */
    },
    jiix: {
      "type": "Math",
      "expressions": [
        {
          "type": "+",
          "id": "math/45",
          "operands": [
            { "type": "number", "id": "math/43", "label": "1", "value": 1 },
            { "type": "number", "id": "math/44", "label": "1", "value": 1 },
          ]
        }
      ],
      "id": "MainBlock",
      "version": "2"
    },
    presentationMathMlTree: { type: 'math',  children: [], },
    tex: <TexExpression>"1+1",
    wolfram: <WolframExpression>"1+1",
  }, { plain: "x^2",
    contentMathMlTree: {
      type: 'math',  /* TODO: child */
    },
    jiix: {
      "type": "Math",
      "expressions": [
        {
          "type": "superscript",
          "id": "math/27",
          "operands": [
            {
              "type": "symbol",
              "id": "math/24",
              "label": "x"
            },
            {
              "type": "number",
              "id": "math/26",
              "label": "2",
              "value": 2
            }
          ]
        }
      ],
      "id": "MainBlock",
      "version": "2"
    },
    presentationMathMlTree: { type: 'math',  children: [], },
    tex: <TexExpression>"x^2",
    wolfram: <WolframExpression>"x^2",
  },
];
