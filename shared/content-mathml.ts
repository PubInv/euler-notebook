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
export type ContentMathMlNode = Apply | Ci | Cn | Csym | Eq | Math | Plus | Power | Times;
export type ContentMathMlTree = Math;

export interface Apply {
  type: 'apply';
  operator: ContentMathMlNode;
  operands: ContentMathMlNode[];
}

export interface Ci {
  type: 'ci';
  identifier: string;
}

export interface Cn {
  type: 'cn';
  value: number;
}

export interface Csym {
  type: 'csym';
  symbol: string;
}

export interface Eq {
  type: 'eq';
  // Applied to a LHS and RHS.
}

export interface Math {
  type: 'math';
  child?: ContentMathMlNode;
}

export interface Plus {
  type: 'plus';
}

export interface Power {
  type: 'power';
  // Applied to a 'base' and an 'exponent'.
}

export interface Times {
  type: 'times';
}
