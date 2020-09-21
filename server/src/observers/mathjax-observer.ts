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

import debug1 from "debug";

import { TexExpression } from "../shared/math-tablet-api";
import { SvgMarkup } from "../shared/common";

import { convertTexToSvg } from "../mathjax";
import { ServerNotebook } from "../server-notebook";

import { BaseObserver, Rules, StyleRelation } from "./base-observer";

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// Constants

// Exported Class

export class MathJaxObserver extends BaseObserver {

  // --- OVERRIDES ---

  protected get rules(): Rules { return MathJaxObserver.RULES; }

  // --- PUBLIC ---

  public static async onOpen(notebook: ServerNotebook): Promise<MathJaxObserver> {
    debug(`Opening: ${notebook.path}.`);
    return new this(notebook);
  }

  // --- PRIVATE ---

  // Private Class Constants

  private static RULES: Rules = [
    {
      name: "tex-to-svg",
      styleTest: { role: 'REPRESENTATION', type: 'TEX-EXPRESSION' },
      styleRelation: StyleRelation.PeerToPeer,
      props: { role: 'REPRESENTATION', type: 'SVG-MARKUP' },
      computeSync: MathJaxObserver.convertTexToSvg,
    },
  ];

  // Private Class Methods

  private static convertTexToSvg(tex: TexExpression): SvgMarkup {
    debug(`convertTexToSvg rule on: ${tex}`);
    return convertTexToSvg(tex);
  }

  // Private Constructor

  protected constructor(notebook: ServerNotebook) { super(notebook); }

}

// HELPER FUNCTIONS
