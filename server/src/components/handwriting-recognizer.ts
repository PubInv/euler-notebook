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

import { StrokeData } from "../shared/stylus";
import { assert, assertFalse, PlainText, zeroPad } from "../shared/common";
import {
  Math, MathMlTree, Mn, Mi, Mrow, Msub, Msup, Msubsup, Mo, Mfrac,
  Msqrt, Munder, Munderover, Mover
  // serializeTreeToMathMlMarkup,
} from "../shared/mathml";

import {
  UNICODE_MIDDLE_DOT, UNICODE_MULTIPLICATION_SIGN, UNICODE_DIVISION_SIGN,
  MathNode, OperatorNode, RelationNode,
} from "../adapters/myscript-math";
import {  JiixDiagramBlock, JiixMathBlock, postJiixRequest, /* postMmlRequest, */ postTextRequest } from "../adapters/myscript";

import { ServerFormula } from "../models/server-formula";
import { FigureObject } from "../shared/figure";

// Types

export interface FigureRecognitionAlternative {
  figureObject: FigureObject;
}

export interface FigureRecognitionResults {
  alternatives: FigureRecognitionAlternative[];
}

export interface FormulaRecognitionAlternative {
  formula: ServerFormula;
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

export async function recognizeFigure(strokeData: StrokeData): Promise<FigureRecognitionResults> {
  debug(`Recognizing figure.`);
  const jiix = await postJiixRequest<JiixDiagramBlock>('Diagram', strokeData);
  console.log(JSON.stringify(jiix, null, 2));

  const alternative: FigureRecognitionAlternative = {
    figureObject: {
      elements: jiix.elements
    }
  };
  return { alternatives: [ alternative ] };
}

export async function recognizeFormula(strokeData: StrokeData): Promise<FormulaRecognitionResults> {
  debug(`Recognizing formula.`);

  const jiix = await postJiixRequest<JiixMathBlock>('Math', strokeData);
  console.log(JSON.stringify(jiix, null, 2));

  // const mml = await postMmlRequest(strokeData);
  // console.dir(mml);

  // TODO: If user writes multiple expressions then we should separate them into distinct cells.
  const alternatives = jiix.expressions.map((jiixExpression, _i)=>{
    //console.log(`Option ${i}`);
    const mathMlTree = convertJiixExpressionToMathMlExpression(jiixExpression);
    //console.dir(serializeTreeToMathMlMarkup(mathMlTree));
    const formula = ServerFormula.createFromMathMlTree(mathMlTree);
    const alternative: FormulaRecognitionAlternative = { formula };
    return alternative;
  });

  return { alternatives };
}

export async function recognizeText(strokeData: StrokeData): Promise<TextRecognitionResults> {
  debug(`Recognizing text.`);
  const text = await postTextRequest(strokeData);
  return { alternatives: [ { text } ] };
}

// Helper Functions

function convertJiixExpressionToMathMlExpression(expr: MathNode): Math {
  return <Math>{ type: 'math', children: convert(expr) };
}

function convert(expr: MathNode): MathMlTree[] {
  let rval: MathMlTree[] = [];
  switch(expr.type) {

    // Tokens
    case 'number': {
      if (expr.generated && expr.label == '?') {
        rval.push(<Mrow>{ type: 'mrow', children: [] });
      } else {
        rval.push(<Mn>{ type: 'mn', value: expr.value });
      }
      break;
    }
    case 'symbol': rval.push(<Mi>{ type: 'mi', identifier: expr.label }); break;

    // Operators
    case '+':
    case '-':
    case '/':
    case UNICODE_MIDDLE_DOT:
    case UNICODE_MULTIPLICATION_SIGN:
    case UNICODE_DIVISION_SIGN:
      rval.push(...convertOperatorExpression(expr));
      break;
    case 'square root':
      rval.push(<Msqrt>{ type: 'msqrt', operand: convertMrowWrapped(expr.operands[0]) });
      break;
    case '!':
      rval.push(...convert(expr.operands[0]));
      rval.push(<Mo>{ type: 'mo', symbol: '!' });
      break;

    // Relations
    case '=':
    case '<':
    case '>':
    case '\u2243':
    case '\u2248':
    case '\u2260':
    case '\u2261':
    case '\u2262':
    case '\u2264':
    case '\u2265':
    case '\u226A':
    case '\u226B':
    case '\u21D0':
    case '\u21D2':
    case '\u21D4':
    case '\u2225':
      rval.push(...convertRelationExpression(expr));
      break;

    // Grouping

    case 'fence': {
      rval.push(<Mo>{ type: 'mo', symbol: expr['open symbol'] });
      rval.push(...convert(expr.operands[0]));
      rval.push(<Mo>{ type: 'mo', symbol: expr['close symbol'] });
      break;
    }
    case 'fraction': {
      rval.push(<Mfrac>{
        type: 'mfrac',
        numerator: convertMrowWrapped(expr.operands[0]),
        denominator: convertMrowWrapped(expr.operands[1]),
      })
      break;
    }
    case 'group': {
      for (const operand of expr.operands) {
        rval.push(...convert(operand));
      }
      break;
    }

    // Subscripts and superscripts
    case 'subscript': {
      rval.push(<Msub>{
        type: 'msub',
        base: convertMrowWrapped(expr.operands![0]),
        subscript: convertMrowWrapped(expr.operands![1]),
      });
      break;
    }
    case 'superscript': {
      rval.push(<Msup>{
        type: 'msup',
        base: convertMrowWrapped(expr.operands![0]),
        superscript: convertMrowWrapped(expr.operands![1]),
      });
      break;
    }
    case 'subsuperscript': {
      rval.push(<Msubsup>{
        type: 'msubsup',
        base: convertMrowWrapped(expr.operands![0]),
        subscript: convertMrowWrapped(expr.operands![1]),
        superscript: convertMrowWrapped(expr.operands![2]),
      });
      break;
    }
    case 'underscript': {
      rval.push(<Munder>{
        type: 'munder',
        base: convertMrowWrapped(expr.operands![0]),
        underscript: convertMrowWrapped(expr.operands![1]),
      });
      break;
    }
    case 'overscript': {
      rval.push(<Mover>{
        type: 'mover',
        base: convertMrowWrapped(expr.operands![0]),
        overscript: convertMrowWrapped(expr.operands![1]),
      });
      break;
    }
    case 'underoverscript': {
      rval.push(<Munderover>{
        type: 'munderover',
        base: convertMrowWrapped(expr.operands![0]),
        underscript: convertMrowWrapped(expr.operands![1]),
        overscript: convertMrowWrapped(expr.operands![2]),
      });
      break;
    }

    default: assertFalse(`Unknown JIIX math node type: ${(<any>expr).type}`);
  }
  return rval;
}

function convertMrowWrapped(expr: MathNode): MathMlTree {
  const children = convert(expr);
  assert(children.length>=0);
  if (children.length == 1) {
    return children[0];
  } else {
    return <Mrow>{ type: 'mrow', children };
  }
}

function convertOperatorExpression(expr: OperatorNode): MathMlTree[] {
  const operands = expr.operands;
  const rval: MathMlTree[] = [];
  for (let i=0; i<operands.length-1; i++) {
    // REVIEW: May not need to wrap in mrow depending on relative operator precedence levels.
    rval.push(convertMrowWrapped(operands[i]));
    rval.push(<Mo>{ type: 'mo', symbol: entityForSymbol(expr.type) });
  }
  rval.push(convertMrowWrapped(operands[operands.length-1]));
  return rval;
}

function convertRelationExpression(expr: RelationNode): MathMlTree[] {
  const [ lhs, rhs ] = expr.operands;
  // REVIEW: May not need to wrap in mrow depending on relative operator precedence levels.
  return [
    convertMrowWrapped(lhs),
    <Mo>{ type: 'mo', symbol: entityForSymbol(expr.type) },
    convertMrowWrapped(rhs),
  ];
}

function entityForSymbol(symbol: string): string {
  assert(symbol.length == 1);
  const charCode = symbol.charCodeAt(0);
  if (charCode >= 0x20 && charCode < 0x80) { return symbol; }
  else { return `&#x${zeroPad(charCode.toString(16), 4)};`}
}
