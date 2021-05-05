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

import { assert, assertFalse } from "../shared/common";
import { Apply, Ci, Cn, ContentMathMlNode, ContentMathMlTree } from "../shared/content-mathml";

import {
  FractionNode, GroupNode, MathNode, OperatorNode, SuperscriptNode,
  UNICODE_DIVISION_SIGN, UNICODE_MIDDLE_DOT, UNICODE_MULTIPLICATION_SIGN
} from "../adapters/myscript-math";

// Exported Functions

export function convertJiixExpressionToContentMathMlTree(jiixExpression: MathNode): ContentMathMlTree {
  return { tag: 'math', child: convertSubexpression(jiixExpression) };
}

// Helper Functions

function convertSubexpression(expr: MathNode): ContentMathMlNode {
  let rval: ContentMathMlNode;
  switch(expr.type) {

    // Tokens
    case 'number': {
      assert(!expr.generated);
      rval = <Cn>{ tag: 'cn', value: expr.value };
      break;
    }
    case 'symbol':
      rval = <Ci>{ tag: 'ci', identifier: expr.label };
      break;

    // Operators
    case '+':
    case '-':
    case '/':
    case UNICODE_MIDDLE_DOT:
    case UNICODE_MULTIPLICATION_SIGN:
    case UNICODE_DIVISION_SIGN:
      rval = convertOperatorExpression(expr);
      break;
    // case 'square root':
    //   rval = <Msqrt>{ tag: 'msqrt', operand: convertSubexpression(expr.operands[0]) };
    //   break;
    // case '!':
    //   rval = convertSubexpression(expr.operands[0]);
    //   rval = (<Mo>{ tag: 'mo', symbol: '!' });
    //   break;

    // // Relations
    // case '=':
    // case '<':
    // case '>':
    // case '\u2243':
    // case '\u2248':
    // case '\u2260':
    // case '\u2261':
    // case '\u2262':
    // case '\u2264':
    // case '\u2265':
    // case '\u226A':
    // case '\u226B':
    // case '\u21D0':
    // case '\u21D2':
    // case '\u21D4':
    // case '\u2225':
    //   rval = convertRelationExpression(expr);
    //   break;

    // // Grouping

    case 'fence': {
      assert(expr.operands.length==1);
      rval = convertSubexpression(expr.operands[0]);
      break;
    }
    case 'fraction': {
      rval = convertOperatorExpression(expr);
      break;
    }
    case 'group': {
      // REVIEW: Safe to assume it is multiplication?
      rval = convertOperatorExpression(expr);
      break;
    }

    // // Subscripts and superscripts
    // case 'subscript': {
    //   rval = (<Msub>{
    //     tag: 'msub',
    //     base: convertSubexpression(expr.operands![0]),
    //     subscript: convertSubexpression(expr.operands![1]),
    //   });
    //   break;
    // }
    case 'superscript': {
      rval = convertOperatorExpression(expr);
      break;
    }
    // case 'subsuperscript': {
    //   rval = (<Msubsup>{
    //     tag: 'msubsup',
    //     base: convertSubexpression(expr.operands![0]),
    //     subscript: convertSubexpression(expr.operands![1]),
    //     superscript: convertSubexpression(expr.operands![2]),
    //   });
    //   break;
    // }
    // case 'underscript': {
    //   rval = (<Munder>{
    //     tag: 'munder',
    //     base: convertSubexpression(expr.operands![0]),
    //     underscript: convertSubexpression(expr.operands![1]),
    //   });
    //   break;
    // }
    // case 'overscript': {
    //   rval = (<Mover>{
    //     tag: 'mover',
    //     base: convertSubexpression(expr.operands![0]),
    //     overscript: convertSubexpression(expr.operands![1]),
    //   });
    //   break;
    // }
    // case 'underoverscript': {
    //   rval = (<Munderover>{
    //     tag: 'munderover',
    //     base: convertSubexpression(expr.operands![0]),
    //     underscript: convertSubexpression(expr.operands![1]),
    //     overscript: convertSubexpression(expr.operands![2]),
    //   });
    //   break;
    // }

    default: assertFalse(`Unknown JIIX math node type: ${(<any>expr).type}`);
  }
  return rval;
}

function convertOperatorExpression(expr: GroupNode|FractionNode|OperatorNode|SuperscriptNode): Apply {
  let operator: ContentMathMlNode;
  switch(expr.type) {
    case '+': operator = { tag: 'plus'}; break;
    case '-': {
      assert(expr.operands.length==2);
      operator = { tag: 'minus'};
      break;
    }
    case UNICODE_MIDDLE_DOT:
    case UNICODE_MULTIPLICATION_SIGN:
    case 'group':
      operator = { tag: 'times'};
      break;

    case '/':
    case UNICODE_DIVISION_SIGN:
    case 'fraction':
      assert(expr.operands.length==2);
      operator = { tag: 'quotient' };
      break;

    case 'superscript':
      assert(expr.operands.length==2);
      operator = { tag: 'power' };
      break;

  }
  const operands = expr.operands.map(operand=>convertSubexpression(operand));
  const rval: Apply = { tag: 'apply', operator, operands };
  return rval;
}

// function convertRelationExpression(expr: RelationNode): ContentMathMlNode[] {
//   const [ lhs, rhs ] = expr.operands;
//   // REVIEW: May not need to wrap in mrow depending on relative operator precedence levels.
//   return [
//     convertSubexpression(lhs),
//     <Mo>{ tag: 'mo', symbol: entityForSymbol(expr.type) },
//     convertSubexpression(rhs),
//   ];
// }

// function entityForSymbol(symbol: string): string {
//   assert(symbol.length == 1);
//   const charCode = symbol.charCodeAt(0);
//   if (charCode >= 0x20 && charCode < 0x80) { return symbol; }
//   else { return `&#x${zeroPad(charCode.toString(16), 4)};`}
// }
