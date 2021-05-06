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

import { assert, assertFalse, zeroPad } from "../shared/common";
import {
  PresentationMathMlTree, Mn, Mi, Mrow, Msub, Msup, Msubsup, Mo, Mfrac,
  Msqrt, Munder, Munderover, Mover, PresentationMathMlNode, Mtable, Mtr, Mtd
} from "../shared/presentation-mathml";

import {
  UNICODE_MIDDLE_DOT, UNICODE_MULTIPLICATION_SIGN, UNICODE_DIVISION_SIGN,
  MathNode,
} from "../adapters/myscript-math";

// Exported Functions

export function convertJiixExpressionToPresentationMathMlTree(jiixExpression: MathNode): PresentationMathMlTree {
  return { tag: 'math', children: convertSubexpression(jiixExpression) };
}

// Helper Functions

function convertSubexpression(expr: MathNode): PresentationMathMlNode[] {
  let rval: PresentationMathMlNode[] = [];
  switch(expr.type) {

    // Tokens
    case 'number': {
      if (expr.generated && expr.label == '?') {
        rval.push(<Mrow>{ tag: 'mrow', children: [] });
      } else {
        rval.push(<Mn>{ tag: 'mn', value: expr.value });
      }
      break;
    }
    case 'symbol':
      rval.push(<Mi>{ tag: 'mi', identifier: expr.label });
      break;

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
      rval.push(<Msqrt>{ tag: 'msqrt', operand: convertMrowWrapped(expr.operands![0]) });
      break;
    case '!':
      rval.push(...convertSubexpression(expr.operands![0]));
      rval.push(<Mo>{ tag: 'mo', symbol: '!' });
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
      rval.push(<Mo>{ tag: 'mo', symbol: expr['open symbol'] });
      rval.push(...convertSubexpression(expr.operands![0]));
      rval.push(<Mo>{ tag: 'mo', symbol: expr['close symbol'] });
      break;
    }
    case 'fraction': {
      rval.push(<Mfrac>{
        tag: 'mfrac',
        numerator: convertMrowWrapped(expr.operands![0]),
        denominator: convertMrowWrapped(expr.operands![1]),
      })
      break;
    }
    case 'group': {
      for (const operand of expr.operands!) {
        rval.push(...convertSubexpression(operand));
      }
      break;
    }

    // Subscripts and superscripts

    case 'subscript': {
      rval.push(<Msub>{
        tag: 'msub',
        base: convertMrowWrapped(expr.operands![0]),
        subscript: convertMrowWrapped(expr.operands![1]),
      });
      break;
    }
    case 'superscript': {
      rval.push(<Msup>{
        tag: 'msup',
        base: convertMrowWrapped(expr.operands![0]),
        superscript: convertMrowWrapped(expr.operands![1]),
      });
      break;
    }
    case 'subsuperscript': {
      rval.push(<Msubsup>{
        tag: 'msubsup',
        base: convertMrowWrapped(expr.operands![0]),
        subscript: convertMrowWrapped(expr.operands![1]),
        superscript: convertMrowWrapped(expr.operands![2]),
      });
      break;
    }
    case 'underscript': {
      rval.push(<Munder>{
        tag: 'munder',
        base: convertMrowWrapped(expr.operands![0]),
        underscript: convertMrowWrapped(expr.operands![1]),
      });
      break;
    }
    case 'overscript': {
      rval.push(<Mover>{
        tag: 'mover',
        base: convertMrowWrapped(expr.operands![0]),
        overscript: convertMrowWrapped(expr.operands![1]),
      });
      break;
    }
    case 'underoverscript': {
      rval.push(<Munderover>{
        tag: 'munderover',
        base: convertMrowWrapped(expr.operands![0]),
        underscript: convertMrowWrapped(expr.operands![1]),
        overscript: convertMrowWrapped(expr.operands![2]),
      });
      break;
    }

    // Matrices

    case 'matrix': {
      const rows: Mtr[] = expr.rows!.map(r=>{
        const cells: Mtd[] = r.cells.map(c=>{
          const children = convertSubexpression(c);
          return <Mtd>{ tag: 'mtd', children };
        });
        return <Mtr>{ tag: 'mtr', cells };
      });

      rval.push(<Mrow>{
        tag: 'mrow',
        children: [
          <Mo>{ tag: 'mo', symbol: '[' },
          <Mtable>{ tag: 'mtable', rows },
          <Mo>{ tag: 'mo', symbol: ']' },
        ]
      })
      break;
    }
    default: assertFalse(`Unknown JIIX math node type: ${(<any>expr).type}`);
  }
  return rval;
}

function convertMrowWrapped(expr: MathNode): PresentationMathMlNode {
  const children = convertSubexpression(expr);
  assert(children.length>=0);
  if (children.length == 1) {
    return children[0];
  } else {
    return <Mrow>{ tag: 'mrow', children };
  }
}

function convertOperatorExpression(expr: MathNode): PresentationMathMlNode[] {
  const operands = expr.operands!;
  const rval: PresentationMathMlNode[] = [];
  for (let i=0; i<operands.length-1; i++) {
    // REVIEW: May not need to wrap in mrow depending on relative operator precedence levels.
    rval.push(convertMrowWrapped(operands[i]));
    rval.push(<Mo>{ tag: 'mo', symbol: entityForSymbol(expr.type) });
  }
  rval.push(convertMrowWrapped(operands[operands.length-1]));
  return rval;
}

function convertRelationExpression(expr: MathNode): PresentationMathMlNode[] {
  const [ lhs, rhs ] = expr.operands!;
  // REVIEW: May not need to wrap in mrow depending on relative operator precedence levels.
  return [
    convertMrowWrapped(lhs),
    <Mo>{ tag: 'mo', symbol: entityForSymbol(expr.type) },
    convertMrowWrapped(rhs),
  ];
}

function entityForSymbol(symbol: string): string {
  assert(symbol.length == 1);
  const charCode = symbol.charCodeAt(0);
  if (charCode >= 0x20 && charCode < 0x80) { return symbol; }
  else { return `&#x${zeroPad(charCode.toString(16), 4)};`}
}
