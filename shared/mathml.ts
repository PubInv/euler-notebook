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

import { assertFalse } from "./common";

// Requirements

// Types

export type MathMlMarkup = '{MathMlMarkup}';

export type MathMlTree = Math | Mfrac | Mi | Mn | Mo | Mover | Mrow | Msqrt | Msub | Msubsup | Msup | Munder | Munderover;

export interface Math {
  type: 'math';
  children: MathMlTree[];
}

export interface Mfrac {
  type: 'mfrac',
  numerator: MathMlTree;
  denominator: MathMlTree;
}

export interface Mi {
  type: 'mi';
  identifier: string;
}

export interface Mn {
  type: 'mn';
  value: number;
}

export interface Mo {
  type: 'mo';
  symbol: string;
}

export interface Mrow {
  type: 'mrow';
  children: MathMlTree[];
}

export interface Msqrt {
  type: 'msqrt';
  operand: MathMlTree;
}

export interface Msub {
  type: 'msub';
  base: MathMlTree;
  subscript: MathMlTree;
}

export interface Msubsup {
  type: 'msubsup';
  base: MathMlTree;
  subscript: MathMlTree;
  superscript: MathMlTree;
}

export interface Msup {
  type: 'msup';
  base: MathMlTree;
  superscript: MathMlTree;
}

export interface Munder {
  type: 'munder';
  base: MathMlTree;
  underscript: MathMlTree;
}

export interface Munderover {
  type: 'munderover';
  base: MathMlTree;
  underscript: MathMlTree;
  overscript: MathMlTree;
}

export interface Mover {
  type: 'mover';
  base: MathMlTree;
  overscript: MathMlTree;
}


// Constants

export const EMPTY_MML_TREE: Math = { type: 'math', children: [] };

// Exported Functions

export function serializeTreeToMathMlMarkup(mathMlTree: MathMlTree): MathMlMarkup {
  return exp2xml(mathMlTree);
}

// Helper Functions

function exp2xml(node: MathMlTree): MathMlMarkup {
  let rval: string;
  switch (node.type) {
    case 'math':       rval = `<math xmlns='http://www.w3.org/1998/Math/MathML'>${exps2xml(node.children, true)}</math>`; break;
    case 'mfrac':      rval = `<mfrac>${exp2xml(node.numerator)}${exp2xml(node.denominator)}</mfrac>`; break;
    case 'mi':         rval = `<mi>${node.identifier}</mi>`; break;
    case 'mn':         rval = `<mn>${node.value}</mn>`; break;
    case 'mo':         rval = `<mo>${node.symbol}</mo>`; break;
    case 'mrow':       rval = `<mrow>${exps2xml(node.children)}</mrow>`; break;
    case 'msqrt':      rval = `<msqrt>${exps2xml([node.operand], true)}</msqrt>`; break;
    case 'msub':       rval = `<msub>${exp2xml(node.base)}${exp2xml(node.subscript)}</msub>`; break;
    case 'msubsup':    rval = `<msubsup>${exp2xml(node.base)}${exp2xml(node.subscript)}${exp2xml(node.superscript)}</msubsup>`; break;
    case 'msup':       rval = `<msup>${exp2xml(node.base)}${exp2xml(node.superscript)}</msup>`; break;
    case 'munder':     rval = `<munder>${exp2xml(node.base)}${exp2xml(node.underscript)}</munder>`; break;
    case 'munderover': rval = `<munderover>${exp2xml(node.base)}${exp2xml(node.underscript)}${exp2xml(node.overscript)}</munderover>`; break;
    case 'mover':      rval = `<mover>${exp2xml(node.base)}${exp2xml(node.overscript)}</msup>`; break;
    default: assertFalse(`Unknown MathML node type: ${(<any>node).type}`);
  }
  return <MathMlMarkup>rval;
}

function exps2xml(nodes: MathMlTree[], impliedMrow?: boolean): MathMlMarkup {
  if (impliedMrow && nodes.length == 1 && nodes[0].type == 'mrow') {
    nodes = nodes[0].children;
  }
  return <MathMlMarkup>nodes.map(expression=>exp2xml(expression)).join('');
}
