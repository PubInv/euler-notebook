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

import debug1 from 'debug';

import { WolframData, LatexData } from '../../client/math-tablet-api';
import { FormulaData } from '../../client/notebook';

import { ServerNotebook } from '../server-notebook';
import { convertTeXtoWolfram, convertWolframToTeX } from '../wolframscript';

import { BaseObserver, Rules, StyleRelation } from './base-observer';

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// Constants

// Exported Class

export class FormulaObserver extends BaseObserver {

  // --- OVERRIDES ---

  protected get rules(): Rules { return FormulaObserver.RULES; }

  // --- PUBLIC ---

  public static async onOpen(notebook: ServerNotebook): Promise<FormulaObserver> {
    debug(`Opening FormulaObserver for ${notebook._path}.`);
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
      computeAsync: FormulaObserver.parseTexInput,
    },
    {
      name: "parseWolframInput",
      styleRelation: StyleRelation.ChildToParent,
      styleTest: { role: 'INPUT', source: 'USER', type: 'WOLFRAM-EXPRESSION' },
      // REVIEW: Are props necessary in ChildToParent relations? Validate that parent has expected props?
      props: { role: 'FORMULA', type: 'FORMULA-DATA' },
      computeSync: FormulaObserver.parseWolframInput,
    },
    {
      name: "renderFormulaToTex",
      styleRelation: StyleRelation.ParentToChild,
      styleTest: { role: 'FORMULA', type: 'FORMULA-DATA' },
      props: { role: 'REPRESENTATION', type: 'TEX-EXPRESSION' },
      exclusiveChildTypeAndRole: true,
      computeAsync: FormulaObserver.renderFormulaToTexRepresentation,
    },
    {
      name: "renderFormulaToWolfram",
      styleRelation: StyleRelation.ParentToChild,
      styleTest: { role: 'FORMULA', type: 'FORMULA-DATA' },
      props: { role: 'REPRESENTATION', type: 'WOLFRAM-EXPRESSION' },
      computeSync: FormulaObserver.renderFormulaToWolframRepresentation,
    },
  ];

  // Private Class Methods

  private static parseWolframInput(wolframData: WolframData): FormulaData|undefined {
    // TODO: Make this async, pass the string to WolframScript to normalize.
    return { wolframData };
  }

  private static renderFormulaToWolframRepresentation(formulaData: FormulaData): WolframData|undefined {
    return formulaData.wolframData;
  }

  private static async parseTexInput(data: LatexData): Promise<FormulaData|undefined> {
    // REVIEW: If conversion fails?
    const wolframData = await convertTeXtoWolfram(data);
    return { wolframData };
  }

  private static async renderFormulaToTexRepresentation(formulaData: FormulaData): Promise<LatexData|undefined> {
    // REVIEW: If conversion fails?
    return await convertWolframToTeX(formulaData.wolframData);
  }


  // Private Constructor

  protected constructor(notebook: ServerNotebook) { super(notebook); }

}

// HELPER FUNCTIONS
