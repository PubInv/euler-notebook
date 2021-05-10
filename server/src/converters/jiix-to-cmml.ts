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
import { ApplyOperators, Cerror, Ci, Cn, ContentMathMlNode, ContentMathMlTree, Matrix, MatrixRow } from "../shared/content-mathml";

import {
  MathNode, MathNodeType,
  UNICODE_DIVISION_SIGN, UNICODE_GREATER_THAN_OR_EQUAL_TO_SIGN,
  UNICODE_MIDDLE_DOT, UNICODE_MULTIPLICATION_SIGN,
  UNICODE_NOT_EQUAL_TO_SIGN, UNICODE_LESS_THAN_OR_EQUAL_TO_SIGN,
} from "../adapters/myscript-math";

// Exported Functions

export function convertJiixExpressionToContentMathMlTree(jiixExpression: MathNode): ContentMathMlTree {
  return { tag: 'math', child: convertSubexpression(jiixExpression) };
}

// Helper Functions

const APPLY_MAP = new Map<MathNodeType, ApplyOperators>([
  [ '!', 'factorial' ],
  [ '-', 'minus' ],
  [ '/', 'quotient' ],
  [ '+', 'plus' ],
  [ '<', 'lt' ],
  [ '=', 'eq'],
  [ '>', 'gt' ],
  [ 'fraction', 'quotient' ],
  [ 'group', 'times' ],
  [ 'square root', 'root' ],
  [ 'superscript', 'power' ],
  [ UNICODE_DIVISION_SIGN, 'quotient' ],
  [ UNICODE_GREATER_THAN_OR_EQUAL_TO_SIGN, 'geq' ],
  [ UNICODE_LESS_THAN_OR_EQUAL_TO_SIGN, 'leq' ],
  [ UNICODE_MIDDLE_DOT, 'times' ],
  [ UNICODE_MULTIPLICATION_SIGN, 'times' ],
  [ UNICODE_NOT_EQUAL_TO_SIGN, 'neq' ],
]);

function convertSubexpression(expr: MathNode): ContentMathMlNode {
  let rval: ContentMathMlNode;
  switch(expr.type) {

    case 'fence': {
      const operands = expr.operands!;
      assert(operands && operands.length==1);
      rval = convertSubexpression(operands[0]);
      break;
    }

    case 'matrix': {
      const rows = expr.rows!.map(r=>{
        const cells = r.cells.map(convertSubexpression);
        return <MatrixRow>{ tag: 'matrixrow', cells };
      })
      rval = <Matrix>{ tag: 'matrix', rows };
      break;
    }

    case 'number': {

      if (!expr.error && expr.label != '?' && !expr.generated) {
        rval = <Cn>{ tag: 'cn', value: expr.value };
      } else {
        // Missing operand will generate:
        // { type: 'number', label: '?', generated: true, error: 'Unsolved' }
        assert(expr.label == '?');
        assert(expr.error == 'Unsolved');
        assert(expr.generated);
        rval = <Cerror>{ tag: 'cerror', code: 'MissingSubexpression'};
      }
      break;
    }

    case 'symbol': {
      const identifier = expr.label;
      assert(identifier != '\u2264', "Less-than-or-equal-to not implemented.");
      rval = <Ci>{ tag: 'ci', identifier };
      break;
    }

    default: {
      const tag = APPLY_MAP.get(expr.type);
      if (tag) {
        const operator = { tag };
        assert(expr.operands)
        const operands = expr.operands!.map(operand=>convertSubexpression(operand));
        rval = { tag: 'apply', operator, operands };
      } else {
        assertFalse(`Unknown JIIX math node type: ${(<any>expr).type}`);      }
      break;
    }

    // case 'square root':
    //   rval = <Msqrt>{ tag: 'msqrt', operand: convertSubexpression(expr.operands[0]) };
    //   break;
    // case '!':
    //   rval = convertSubexpression(expr.operands[0]);
    //   rval = (<Mo>{ tag: 'mo', symbol: '!' });
    //   break;

    // Relations
    // case '\u2243':
    // case '\u2248':
    // case '\u2260':
    // case '\u2261':
    // case '\u2262':
    // case '\u2264':
    // case '\u226A':
    // case '\u226B':
    // case '\u21D0':
    // case '\u21D2':
    // case '\u21D4':
    // case '\u2225':

    // // Grouping

    // // Subscripts and superscripts
    // case 'subscript': {
    //   rval = (<Msub>{
    //     tag: 'msub',
    //     base: convertSubexpression(expr.operands![0]),
    //     subscript: convertSubexpression(expr.operands![1]),
    //   });
    //   break;
    // }
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

  }
  return rval;
}
