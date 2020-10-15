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

import { FormulaData } from "../shared/notebook";
import { TexExpression } from "../shared/math-tablet-api";

import { ServerNotebook } from "../server-notebook";
import { convertTeXtoWolfram, convertWolframToTeX, convertMTLToWolfram, convertWolframToMTL } from "../adapters/wolframscript";

import { BaseObserver, Rules, StyleRelation } from "./base-observer";

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// Constants

// Exported Class

export class TexObserver extends BaseObserver {

  // --- OVERRIDES ---

  protected get rules(): Rules { return TexObserver.RULES; }

  // --- PUBLIC ---

  public static async onOpen(notebook: ServerNotebook): Promise<TexObserver> {
    debug(`Opening FormulaObserver for ${notebook.path}.`);
    return new this(notebook);
  }

  // --- PRIVATE ---

  // Private Class Constants

  private static RULES: Rules = [
    {
      name: "parseTexInput",
      styleRelation: StyleRelation.ChildToParent,
      styleTest: { role: 'INPUT', source: 'USER', type: 'TEX-EXPRESSION' },
      props: { role: 'FORMULA', type: 'FORMULA-DATA' },
      computeAsync: TexObserver.parseTexInput,
    },
    {
      name: "renderFormulaToTex",
      styleRelation: StyleRelation.ParentToChild,
      styleTest: { role: 'FORMULA', type: 'FORMULA-DATA' },
      props: { role: 'REPRESENTATION', type: 'TEX-EXPRESSION' },
      exclusiveChildTypeAndRole: true,
      computeAsync: TexObserver.renderFormulaToTexRepresentation,
    },
  ];

  // Private Class Methods

  private static async parseTexInput(data: TexExpression): Promise<FormulaData|undefined> {
    // REVIEW: If conversion fails?
    const wolframData = convertWolframToMTL(await convertTeXtoWolfram(data));
    return { wolframData };
  }

  private static async renderFormulaToTexRepresentation(formulaData: FormulaData): Promise<TexExpression|undefined> {
    // REVIEW: If conversion fails?
    return await convertWolframToTeX(convertMTLToWolfram(formulaData.wolframData));
  }


  // Private Constructor

  protected constructor(notebook: ServerNotebook) { super(notebook); }

}

// HELPER FUNCTIONS