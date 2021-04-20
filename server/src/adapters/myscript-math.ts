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

import { BoundingBox } from "../shared/common";
// Types

type MathNodeErrorString = 'Unsolved';

export type MathNode =
    FactoralNode |
    FenceNode |
    FractionNode |
    GroupNode |
    NumberNode |
    OperatorNode |
    OverscriptNode |
    RelationNode |
    SquareRootNode |
    SubscriptNode |
    SubsuperscriptNode |
    SuperscriptNode |
    SymbolNode |
    UnderoverscriptNode |
    UnderscriptNode;

export interface MathNodeBase {
  // type: string;
  id: string;
  'bounding-box'?: BoundingBox;
  error: MathNodeErrorString;
  items?: MathNodeItem[]; // If export.jiix.strokes or export.jiix.glyphs are true.

  // Inherited interfaces may have:
  // exactValue???
  // label?: string;
  // operands?: MathNodeBlock[];
  // value?: number;
}

interface MathNodeItem {
  F: number[];
  id: string;
  T: number[];
  timestamp: /* TYPESCRIPT: TimestampString */string;
  type: 'stroke';
  X: number[];
  Y: number[];
}

// Specific Math Nodes

interface FactoralNode extends MathNodeBase {
  type: '!';
  operands: [ MathNode ],
}

interface FenceNode extends MathNodeBase {
  type: 'fence';
  'open symbol': string;
  'close symbol': string;
  operands: [ MathNode ],
}

interface FractionNode extends MathNodeBase {
  type: 'fraction';
  operands: [ /* numerator */MathNode, /* denominator */MathNode ],
}

interface GroupNode extends MathNodeBase {
  type: 'group';
  operands: MathNode[],
}

interface NumberNode extends MathNodeBase {
  type: 'number';
  generated?: boolean,
  label: string,
  value: number,
}

export interface OperatorNode extends MathNodeBase {
  type: '+'|'-'|'\u00D7'|'\u00B7'|'/'|'\u00F7';
  operands: MathNode[],
}

interface OverscriptNode extends MathNodeBase {
  type: 'overscript';
  operands: [/* script */MathNode, /* overscript */MathNode ],
}

export interface RelationNode extends MathNodeBase {
  type: '='|'<'|'>'|'\u2243'|'\u2248'|'\u2260'|'\u2261'|'\u2262'|'\u2264'|'\u2265'|'\u226A'|'\u226B'|'\u21D0'|'\u21D2'|'\u21D4'|'\u2225';
  operands: [ MathNode, MathNode ]
}

interface SquareRootNode extends MathNodeBase {
  type: 'square root';
  operands: [ MathNode ],
}

interface SubscriptNode extends MathNodeBase {
  type: 'subscript';
  operands: [/* base */MathNode, /* subscript */MathNode ],
}

interface SubsuperscriptNode extends MathNodeBase {
  type: 'subsuperscript';
  operands: [/* base */MathNode, /* subscript */MathNode, /* superscript */MathNode ],
}

interface SuperscriptNode extends MathNodeBase {
  type: 'superscript';
  operands: [/* base */MathNode, /* superscript */MathNode ],
}

interface SymbolNode extends MathNodeBase {
  type: 'symbol';
  label: string,
}

interface UnderoverscriptNode extends MathNodeBase {
  type: 'underoverscript';
  operands: [/* script */MathNode, /* underscript */MathNode, /* overscript */MathNode ],
}

interface UnderscriptNode extends MathNodeBase {
  type: 'underscript';
  operands: [/* script */MathNode, /* underscript */MathNode ],
}

// Constants

export const UNICODE_MIDDLE_DOT = '\u00B7';
export const UNICODE_MULTIPLICATION_SIGN = '\u00D7';
export const UNICODE_DIVISION_SIGN = '\u00F7';

