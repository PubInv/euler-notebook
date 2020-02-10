/*
Math Tablet
Copyright (C) 2019 Public Invention
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

import { Html } from './dom.js';
import { StyleRole, StyleSubrole, StyleType } from './notebook.js';

// Constants

export const ROLE_OPTIONS = new Map<StyleRole,Html>([
  [ 'UNKNOWN', "Choose..." ],
  [ 'FORMULA', "Formula" ],
  [ 'TEXT', "Text" ],
  //[ 'FIGURE', "Figure" ],
]);

// const FIGURE_SUBROLE_OPTIONS = new Map([
//   [ 'UNKNOWN', "Choose..." ],
//   [ 'SKETCH', "Sketch" ],
//   [ 'DRAWING', "Drawing" ],
// ]);

const FORMULA_SUBROLE_OPTIONS = new Map<StyleSubrole,string>([
  // IMPORTANT: Keep in sync with FORMULA_SUBROLE_PREFIX
  [ 'UNKNOWN', "Choose..." ],
  [ 'ASSUME', "Assume" ],
  [ 'DEFINITION', "Definition" ],
  [ 'PROVE', "Prove" ],
  [ 'OTHER', "Other" ],
]);

export const FORMULA_SUBROLE_PREFIX = new Map<StyleSubrole,string>([
  // IMPORTANT: Keep in sync with FORMULA_SUBROLE_OPTIONS
  [ 'UNKNOWN', "<i>Unknown</i>&nbsp;" ],
  [ 'ASSUME', "<i>Assume</i>&nbsp;" ],
  [ 'DEFINITION', "<i>Definition</i>&nbsp;" ],
  [ 'PROVE', "<i>Prove </i>&nbsp;" ],
  [ 'OTHER', "<i>Other </i>&nbsp;" ],
]);


const TEXT_SUBROLE_OPTIONS = new Map([
  [ 'UNKNOWN', "Choose..." ],
  [ 'HEADING1', "Heading 1" ],
  [ 'HEADING2', "Heading 2" ],
  [ 'NORMAL', "Normal" ],
]);

const UNKNOWN_SUBROLE_OPTIONS = new Map();

export const SUBROLE_OPTIONS = new Map<StyleRole,Map<StyleSubrole,string>>([
  [ 'UNKNOWN', UNKNOWN_SUBROLE_OPTIONS ],
  [ 'FORMULA', FORMULA_SUBROLE_OPTIONS ],
  [ 'TEXT', TEXT_SUBROLE_OPTIONS ],
  // [ 'FIGURE', FIGURE_SUBROLE_OPTIONS ],
]);

const UNKNOWN_TYPE_OPTIONS = new Map<StyleType,string>();

// const FIGURE_TYPE_OPTIONS = new Map<StyleType,string>();

const FORMULA_TYPE_OPTIONS = new Map<StyleType,string>([
  [ 'WOLFRAM', "Wolfram" ],
  [ 'LATEX', "LaTeX" ],
  [ 'MATHML', "MathML" ],
]);

const TEXT_TYPE_OPTIONS = new Map<StyleType,string>([
  [ 'TEXT', "Plain Text" ],
  [ 'HTML', "HTML" ],
]);

export const TYPE_OPTIONS = new Map<StyleRole,Map<StyleType,string>>([
  [ 'UNKNOWN', UNKNOWN_TYPE_OPTIONS ],
  [ 'FORMULA', FORMULA_TYPE_OPTIONS ],
  [ 'TEXT', TEXT_TYPE_OPTIONS ],
  // [ 'FIGURE', FIGURE_TYPE_OPTIONS ],

]);
