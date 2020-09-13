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

import { Html } from "./shared/common";
import { StyleRole, StyleSubrole, StyleType } from "./shared/notebook";

// Constants

export const ROLE_OPTIONS = new Map<StyleRole,Html>([
  [ 'UNKNOWN', <Html>"Choose&hellip;" ],
  [ 'FORMULA', <Html>"Formula" ],
  [ 'HINT', <Html>"Hint" ],
  [ 'TEXT', <Html>"Text" ],
  //[ 'FIGURE', <Html>"Figure" ],
]);

const FIGURE_SUBROLE_OPTIONS = new Map<StyleSubrole,Html>([
  [ 'UNKNOWN', <Html>"Choose&hellip;" ],
  [ 'SKETCH', <Html>"Sketch" ],
  [ 'DRAWING', <Html>"Drawing" ],
]);

const FORMULA_SUBROLE_OPTIONS = new Map<StyleSubrole,Html>([
  // IMPORTANT: Keep in sync with FORMULA_SUBROLE_PREFIX
  [ 'UNKNOWN', <Html>"Choose&hellip;" ],
  [ 'ASSUME', <Html>"Assume" ],
  [ 'DEFINITION', <Html>"Definition" ],
  [ 'PROVE', <Html>"Prove" ],
  [ 'OTHER', <Html>"Other" ],
]);

export const FORMULA_SUBROLE_PREFIX = new Map<StyleSubrole,Html>([
  // IMPORTANT: Keep in sync with FORMULA_SUBROLE_OPTIONS
  [ 'UNKNOWN', <Html>"<i>Unknown</i>&nbsp;" ],
  [ 'ASSUME', <Html>"<i>Assume</i>&nbsp;" ],
  [ 'DEFINITION', <Html>"<i>Definition</i>&nbsp;" ],
  [ 'PROVE', <Html>"<i>Prove </i>&nbsp;" ],
  [ 'OTHER', <Html>"<i>Other </i>&nbsp;" ],
]);

const HINT_SUBROLE_OPTIONS = new Map<StyleSubrole,Html>();

const PLOT_SUBROLE_OPTIONS = new Map<StyleSubrole,Html>();

const TEXT_SUBROLE_OPTIONS = new Map<StyleSubrole,Html>([
  [ 'UNKNOWN', <Html>"Choose&hellip;" ],
  [ 'HEADING1', <Html>"Heading 1" ],
  [ 'HEADING2', <Html>"Heading 2" ],
  [ 'NORMAL', <Html>"Normal" ],
]);

const UNKNOWN_SUBROLE_OPTIONS = new Map<StyleSubrole,Html>();

export const SUBROLE_OPTIONS = new Map<StyleRole,Map<StyleSubrole,Html>>([
  [ 'FIGURE', FIGURE_SUBROLE_OPTIONS ],
  [ 'FORMULA', FORMULA_SUBROLE_OPTIONS ],
  [ 'HINT', HINT_SUBROLE_OPTIONS ],
  [ 'PLOT', PLOT_SUBROLE_OPTIONS ],
  [ 'TEXT', TEXT_SUBROLE_OPTIONS ],
  [ 'UNKNOWN', UNKNOWN_SUBROLE_OPTIONS ],
]);

const UNKNOWN_TYPE_OPTIONS = new Map<StyleType,Html>();

const FIGURE_TYPE_OPTIONS = new Map<StyleType,Html>();

const FORMULA_TYPE_OPTIONS = new Map<StyleType,Html>([
  [ 'WOLFRAM-EXPRESSION', <Html>"Wolfram" ],
  [ 'TEX-EXPRESSION', <Html>"LaTeX" ],
]);

const HINT_TYPE_OPTIONS = new Map<StyleType,Html>([
  [ 'PLAIN-TEXT', <Html>"Plain Text" ],
]);

const PLOT_TYPE_OPTIONS = new Map<StyleType,Html>();

const TEXT_TYPE_OPTIONS = new Map<StyleType,Html>([
  [ 'PLAIN-TEXT', <Html>"Plain Text" ],
  [ 'HTML', <Html>"HTML" ],
]);

export const TYPE_OPTIONS = new Map<StyleRole,Map<StyleType,Html>>([
  [ 'FIGURE', FIGURE_TYPE_OPTIONS ],
  [ 'FORMULA', FORMULA_TYPE_OPTIONS ],
  [ 'HINT', HINT_TYPE_OPTIONS ],
  [ 'PLOT', PLOT_TYPE_OPTIONS ],
  [ 'TEXT', TEXT_TYPE_OPTIONS ],
  [ 'UNKNOWN', UNKNOWN_TYPE_OPTIONS ],
]);
