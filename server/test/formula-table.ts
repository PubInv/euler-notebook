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

// When cutting & pasting JSON, this search & replace will remove unnecessary quotes:
// Regex Search:  "(child|children|id|label|operands|operator|symbol|tag|type|value)"\s*:
// Replace:       $1:

// Requirements

import { MathNode as JiixExpression } from "../src/adapters/myscript-math";
import { ContentMathMlTree } from "../src/shared/content-mathml";
import { WolframExpression } from "../src/shared/formula";
import { PresentationMathMlTree } from "../src/shared/presentation-mathml";

// Types

interface FormulaEntry {
  plain: string; // Plain text representation for documentation purposes only.
  contentMathMlTree: ContentMathMlTree,
  jiixExpression: JiixExpression,
  presentationMathMlTree: PresentationMathMlTree,
  // tex: TexExpression,
  wolfram: WolframExpression,
}

// Exported Data

// TODO: Unary minus
// TODO: Equations
// TODO: Relations

export const FORMULA_TABLE: FormulaEntry[] = [
  { plain: "1",
    jiixExpression: { type: "number", id: "math/19", label: "1", value: 1 },
    presentationMathMlTree: {
      tag: "math",
      children: [ { tag: "mn", value: 1 } ]
    },
    contentMathMlTree: {
      tag: "math",
      child: { tag: "cn", value: 1 }
    },
    wolfram: <WolframExpression>"1",
  }, { plain: "3.14",
    jiixExpression: { type: "number", id: "math/59", label: "3.14", value: 3.14 },
    presentationMathMlTree: {
      tag: "math",
      children: [ { tag: "mn", value: 3.14 } ]
    },
    contentMathMlTree: {
      tag: "math",
      child: { tag: "cn", value: 3.14 }
    },
    wolfram: <WolframExpression>"3.14",
  }, { plain: "1+2",
    jiixExpression: {
      type: "+", id: "math/45",
      operands: [
        { type: "number", id: "math/43", label: "1", value: 1 },
        { type: "number", id: "math/44", label: "2", value: 2 },
      ]
    },
    presentationMathMlTree: {
      tag: 'math',
      children: [
       { tag: "mn", value: 1 },
       { tag: "mo", symbol: "+" },
       { tag: "mn", value: 2 },
      ],
    },
    contentMathMlTree: {
      "tag": "math",
      "child": {
        "tag": "apply",
        "operator": { "tag": "plus" },
        "operands": [
          { "tag": "cn", "value": 1 },
          { "tag": "cn", "value": 2 }
        ]
      }
    },
    wolfram: <WolframExpression>"Plus[1,2]",
  }, { plain: "12-4",
    jiixExpression: {
      type: "-", id: "math/62",
      operands: [
        { type: "number", id: "math/60", label: "12", value: 12 },
        { type: "number", id: "math/61", label: "4", value: 4 }
      ]
    },
    presentationMathMlTree: {
      tag: "math",
      children: [
        { tag: "mn", value: 12 },
        { tag: "mo", symbol: "-" },
        { tag: "mn", value: 4 }
      ]
    },
    contentMathMlTree: {
      tag: "math",
      child: {
        tag: "apply",
        operator: { tag: "minus" },
        operands: [
          { tag: "cn", value: 12 },
          { tag: "cn", value: 4 }
        ]
      }
    },
    wolfram: <WolframExpression>"Subtract[12,4]",
  }, { plain: "6 x 8",
    jiixExpression: {
      type: "×", id: "math/38",
      operands: [
        { type: "number", id: "math/36", label: "6", value: 6 },
        { type: "number", id: "math/37", label: "8", value: 8 }
      ]
    },
    presentationMathMlTree: {
      tag: "math",
      children: [
        { tag: "mn", value: 6 },
        { tag: "mo", symbol: "&#x00d7;" },
        { tag: "mn", value: 8 }
      ]
    },
    contentMathMlTree: {
      tag: "math",
      child: {
        tag: "apply",
        operator: { tag: "times" },
        operands: [
          { tag: "cn", value: 6 },
          { tag: "cn", value: 8 }
        ]
      }
    },
    wolfram: <WolframExpression>"Times[6,8]",
  }, { plain: "6·8 (center dot multiplication)",
    jiixExpression: {
      type: "·",
      id: "math/50",
      operands: [
        {
          type: "number",
          id: "math/48",
          label: "6",
          value: 6
        },
        {
          type: "number",
          id: "math/49",
          label: "8",
          value: 8
        }
      ]
    },
    presentationMathMlTree: {
      tag: "math",
      children: [
        {
          tag: "mn",
          value: 6
        },
        {
          tag: "mo",
          symbol: "&#x00b7;"
        },
        {
          tag: "mn",
          value: 8
        }
      ]
    },
    contentMathMlTree: {
      "tag": "math",
      "child": {
        "tag": "apply",
        "operator": { "tag": "times" },
        "operands": [
          { "tag": "cn", "value": 6 },
          { "tag": "cn", "value": 8 }
        ]
      }
    },
    wolfram: <WolframExpression>"Times[6,8]",
  }, { plain: "22÷7",
    jiixExpression: {
      type: "÷", id: "math/67",
      operands: [
        { type: "number", id: "math/65", label: "22", value: 22 },
        { type: "number", id: "math/66", label: "7", value: 7 }
      ]
    },
    presentationMathMlTree: {
      tag: "math",
      children: [
        { tag: "mn", value: 22 },
        { tag: "mo", symbol: "&#x00f7;" },
        { tag: "mn", value: 7 }
      ]
    },
    contentMathMlTree: {
      "tag": "math",
      "child": {
        "tag": "apply", "operator": { "tag": "quotient" },
        "operands": [
          { "tag": "cn", "value": 22 },
          { "tag": "cn", "value": 7 }
        ]
      }
    },
    wolfram: <WolframExpression>"Divide[22,7]",
  }, { plain: "22/7",
    jiixExpression: {
      type: "/", id: "math/64",
      operands: [
        { type: "number", id: "math/62", label: "22", value: 22 },
        { type: "number", id: "math/63", label: "7", value: 7 }
      ]
    },
    presentationMathMlTree: {
      tag: "math",
      children: [
        { tag: "mn", value: 22 },
        { tag: "mo", symbol: "/" },
        { tag: "mn", value: 7 }
      ]
    },
    contentMathMlTree: {
      "tag": "math",
      "child": {
        "tag": "apply", "operator": { "tag": "quotient" },
        "operands": [
          { "tag": "cn", "value": 22 },
          { "tag": "cn", "value": 7 }
        ]
      }
    },
    wolfram: <WolframExpression>"Divide[22,7]",
  }, { plain: "(fraction) 22 (over) 7",
    jiixExpression: {
      type: "fraction", id: "math/59",
      operands: [
        { type: "number", id: "math/57", label: "22", value: 22 },
        { type: "number", id: "math/58", label: "7", value: 7 }
      ]
    },
    presentationMathMlTree: {
      tag: "math",
      children: [
        {
          tag: "mfrac",
          "numerator": { tag: "mn", value: 22 },
          "denominator": { tag: "mn", value: 7 }
        }
      ]
    },
    contentMathMlTree: {
      "tag": "math",
      "child": {
        "tag": "apply", "operator": { "tag": "quotient" },
        "operands": [
          { "tag": "cn", "value": 22 },
          { "tag": "cn", "value": 7 }
        ]
      }
    },
    wolfram: <WolframExpression>"Divide[22,7]",
  }, { plain: "(x+a)(x-a)",
    jiixExpression: {
      type: "group", id: "math/134",
      operands: [
        {
          type: "fence", id: "math/131",
          "open symbol": "(", "close symbol": ")",
          operands: [
            {
              type: "+", id: "math/130",
              operands: [
                { type: "symbol", id: "math/121", label: "x" },
                { type: "symbol", id: "math/123", label: "a" }
              ]
            }
          ]
        },
        {
          type: "fence", id: "math/133",
          "open symbol": "(", "close symbol": ")",
          operands: [
            {
              type: "-", id: "math/132",
              operands: [
                { type: "symbol", id: "math/126", label: "x" },
                { type: "symbol", id: "math/128", label: "a" }
              ]
            }
          ]
        }
      ]
    },
    presentationMathMlTree: {
      tag: "math",
      children: [
        { tag: "mo", symbol: "(" },
        { tag: "mi", "identifier": "x" },
        { tag: "mo", symbol: "+" },
        { tag: "mi", "identifier": "a" },
        { tag: "mo", symbol: ")" },
        { tag: "mo", symbol: "(" },
        { tag: "mi", "identifier": "x" },
        { tag: "mo", symbol: "-" },
        { tag: "mi", "identifier": "a" },
        { tag: "mo", symbol: ")" }
      ]
    },
    contentMathMlTree: {
      "tag": "math",
      "child": {
        "tag": "apply",
        "operator": { "tag": "times" },
        "operands": [
          {
            "tag": "apply",
            "operator": { "tag": "plus" },
            "operands": [
              { "tag": "ci", "identifier": "x" },
              { "tag": "ci", "identifier": "a" }
            ]
          },
          {
            "tag": "apply",
            "operator": { "tag": "minus" },
            "operands": [
              { "tag": "ci", "identifier": "x" },
              { "tag": "ci", "identifier": "a" }
            ]
          }
        ]
      }
    },
    wolfram: <WolframExpression>"Times[Plus[x,a],Subtract[x,a]]",
  // }, { plain: "",
  //   jiixExpression: ,
  //   presentationMathMlTree: ,
  //   contentMathMlTree: ,
  //   wolfram: <WolframExpression>"",
  }, { plain: "x^2",
    jiixExpression: {
      type: "superscript",
      id: "math/27",
      operands: [
        { type: "symbol", id: "math/24", label: "x" },
        { type: "number", id: "math/26", label: "2", value: 2 }
      ]
    },
    presentationMathMlTree: {
      tag: 'math',
      children: [
        {
          tag: "msup",
          base: { tag: "mi", "identifier": "x" },
          superscript: { tag: "mn", value: 2 },
        }
      ],
    },
    contentMathMlTree: {
      tag: 'math',
      child: {
        tag: "apply",
        operator: { tag: "power" },
        operands: [
          { tag: "ci", "identifier": "x" },
          { tag: "cn", value: 2 },
        ],
      }
    },
    wolfram: <WolframExpression>"Power[x,2]",
  }, { plain: "ax^2 + bx + c",
    jiixExpression: {
      type: "+",
      id: "math/102",
      operands: [
        {
          type: "group", id: "math/100",
          operands: [
            { type: "symbol", id: "math/90", label: "a" },
            {
              type: "superscript",
              id: "math/99",
              operands: [
                { type: "symbol", id: "math/91", label: "x" },
                { type: "number", id: "math/98", label: "2", value: 2 }
              ]
            }
          ]
        },
        {
          type: "group", id: "math/101",
          operands: [
            { type: "symbol", id: "math/94", label: "b" },
            { type: "symbol", id: "math/95", label: "x" }
          ]
        },
        { type: "symbol", id: "math/97", label: "c" }
      ]
    },
    presentationMathMlTree: {
      tag: "math",
      children: [
        {
          tag: "mrow",
          children: [
            { tag: "mi", "identifier": "a" },
            {
              tag: "msup",
              "base": { tag: "mi", "identifier": "x" },
              "superscript": { tag: "mn", value: 2 }
            }
          ]
        },
        { tag: "mo", symbol: "+" },
        {
          tag: "mrow",
          children: [
            { tag: "mi", "identifier": "b" },
            { tag: "mi", "identifier": "x" }
          ]
        },
        { tag: "mo", symbol: "+" },
        { tag: "mi", "identifier": "c" }
      ]
    },
    contentMathMlTree: {
      tag: "math",
      child: {
        tag: "apply",
        operator: { tag: "plus" },
        operands: [
          {
            tag: "apply",
            operator: { tag: "times" },
            operands: [
              { tag: "ci", "identifier": "a" },
              {
                tag: "apply",
                operator: { tag: "power" },
                operands: [
                  { tag: "ci", "identifier": "x" },
                  { tag: "cn", value: 2 }
                ]
              }
            ]
          },
          {
            tag: "apply",
            operator: { tag: "times" },
            operands: [
              { tag: "ci", "identifier": "b" },
              { tag: "ci", "identifier": "x" }
            ]
          },
          { tag: "ci", "identifier": "c" }
        ]
      }
    },
    wolfram: <WolframExpression>"Plus[Times[a,Power[x,2]],Times[b,x],c]",
  }, { plain: "x = 1",
    jiixExpression: {
      "type": "=", "id": "math/36",
      "operands": [
        { "type": "symbol", "id": "math/35", "label": "x" },
        { "type": "number", "id": "math/38", "label": "1", "value": 1 }
      ]
    },
    presentationMathMlTree: {
      "tag": "math",
      "children": [
        { "tag": "mi", "identifier": "x" },
        { "tag": "mo", "symbol": "=" },
        { "tag": "mn", "value": 1 }
      ]
    },
    contentMathMlTree: {
      "tag": "math",
      "child": {
        "tag": "apply",
        "operator": { "tag": "eq" },
        "operands": [
          { "tag": "ci", "identifier": "x" },
          { "tag": "cn", "value": 1 }
        ]
      }
    },
    wolfram: <WolframExpression>"Equal[x,1]",
  }, { plain: "x ≠ 1",
      jiixExpression: {
        "type": "≠", "id": "math/38",
        "operands": [
          { "type": "symbol", "id": "math/34", "label": "x" },
          { "type": "number", "id": "math/37", "label": "1", "value": 1 }
        ]
      },
      presentationMathMlTree: {
        "tag": "math",
        "children": [
          { "tag": "mi", "identifier": "x" },
          { "tag": "mo", "symbol": "&#x2260;" },
          { "tag": "mn", "value": 1 }
        ]
      },
      contentMathMlTree: {
        "tag": "math",
        "child": {
          "tag": "apply",
          "operator": { "tag": "neq" },
          "operands": [
            { "tag": "ci", "identifier": "x" },
            { "tag": "cn", "value": 1 }
          ]
        }
      },
      wolfram: <WolframExpression>"Unequal[x,1]",
  }, { plain: "x > 1",
    jiixExpression: {
      "type": ">", "id": "math/46",
      "operands": [
        { "type": "symbol", "id": "math/42", "label": "x" },
        { "type": "number", "id": "math/45", "label": "1", "value": 1 }
      ]
    },
    presentationMathMlTree: {
      "tag": "math",
      "children": [
        { "tag": "mi", "identifier": "x" },
        { "tag": "mo", "symbol": ">" },
        { "tag": "mn", "value": 1 }
      ]
    },
    contentMathMlTree: {
      "tag": "math",
      "child": {
        "tag": "apply",
        "operator": { "tag": "gt" },
        "operands": [
          { "tag": "ci", "identifier": "x" },
          { "tag": "cn", "value": 1 }
        ]
      }
    },
    wolfram: <WolframExpression>"Greater[x,1]",
  }, { plain: "x ≥ 1",
      jiixExpression: {
        "type": "≥", "id": "math/40",
        "operands": [
          { "type": "symbol", "id": "math/36", "label": "x" },
          { "type": "number", "id": "math/39", "label": "1", "value": 1 }
        ]
      },
      presentationMathMlTree: {
        "tag": "math",
        "children": [
          { "tag": "mi", "identifier": "x" },
          { "tag": "mo", "symbol": "&#x2265;" },
          { "tag": "mn", "value": 1 }
        ]
      },
      contentMathMlTree: {
        "tag": "math",
        "child": {
          "tag": "apply",
          "operator": { "tag": "geq" },
          "operands": [
            { "tag": "ci", "identifier": "x" },
            { "tag": "cn", "value": 1 }
          ]
        }
      },
      wolfram: <WolframExpression>"GreaterEqual[x,1]",
  }, { plain: "x < 1",
    jiixExpression: {
      "type": "<", "id": "math/46",
      "operands": [
        { "type": "symbol", "id": "math/42", "label": "x" },
        { "type": "number", "id": "math/45", "label": "1", "value": 1 }
      ]
    },
    presentationMathMlTree: {
      "tag": "math",
      "children": [
        { "tag": "mi", "identifier": "x" },
        { "tag": "mo", "symbol": "<" },
        { "tag": "mn", "value": 1 }
      ]
    },
    contentMathMlTree: {
      "tag": "math",
      "child": {
        "tag": "apply",
        "operator": { "tag": "lt" },
        "operands": [
          { "tag": "ci", "identifier": "x" },
          { "tag": "cn", "value": 1 }
        ]
      }
    },
    wolfram: <WolframExpression>"Less[x,1]",
  }, { plain: "x ≤ 1",
      // TODO: Unlike the other relational operators (=, !=, >, >=, <),
      //       less-than-or-equal-to comes back as a symbol in a group, not a type!!!
      jiixExpression: {
        "type": "group", "id": "math/39",
        "operands": [
          { "type": "symbol", "id": "math/35", "label": "x" },
          { "type": "symbol", "id": "math/36", "label": "≤" },
          { "type": "number", "id": "math/38", "label": "1", "value": 1 }
        ]
      },
      presentationMathMlTree: {
        "tag": "math",
        "children": [
          { "tag": "mi", "identifier": "x" },
          { "tag": "mo", "symbol": "&#x2264;" },
          { "tag": "mn", "value": 1 }
        ]
      },
      contentMathMlTree: {
        "tag": "math",
        "child": {
          "tag": "apply",
          "operator": { "tag": "leq" },
          "operands": [
            { "tag": "ci", "identifier": "x" },
            { "tag": "cn", "value": 1 }
          ]
        }
      },
      wolfram: <WolframExpression>"LessEqual[x,1]",
  // }, { plain: "",
    //   jiixExpression: ,
    //   presentationMathMlTree: ,
    //   contentMathMlTree: ,
    //   wolfram: <WolframExpression>"",
  },
];
