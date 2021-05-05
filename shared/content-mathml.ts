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

// Types

export type ContentMathMlMarkup = '{ContentMathMlMarkup}';
export type ContentMathMlNode = Apply | Ci | Cn | Csym | Eq | Math | Minus | Plus | Power | Quotient | Times;
export type ContentMathMlTree = Math;

// LATER: export type NumberType = "integer" | "real" | "double" | "hexdouble" | "e-notation" | "rational" | "complex-cartesian" | "complex-polar" | "constant";

export interface Apply {
  tag: 'apply';
  operator: ContentMathMlNode;
  operands: ContentMathMlNode[];
}

export interface Ci {
  tag: 'ci';
  identifier: string;
}

export interface Cn {
  tag: 'cn';
  value: number;
  // LATER: type?: NumberType;  // Per spec, defaults is "real"
}

export interface Csym {
  tag: 'csym';
  symbol: string;
}

export interface Eq {
  tag: 'eq';
  // Applied to a LHS and RHS.
}

export interface Math {
  tag: 'math';
  child?: ContentMathMlNode;
}

export interface Minus { tag: 'minus'; }
export interface Plus { tag: 'plus'; }
export interface Power { tag: 'power'; /* Applied to a 'base' and an 'exponent'. */}
export interface Quotient { tag: 'quotient'; }
export interface Times { tag: 'times'; }
