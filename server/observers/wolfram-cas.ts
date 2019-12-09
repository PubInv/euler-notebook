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

import { BaseObserver, Rules } from './base-observer';
import { execute, findTeXForm } from './wolframscript';
import { ServerNotebook } from '../server-notebook';
import { WolframData, LatexData, isEmptyOrSpaces } from '../../client/math-tablet-api';

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// Constants

// Exported Class

export class WolframObserver extends BaseObserver {

  // --- OVERRIDES ---

  protected get rules(): Rules {
    return WolframObserver.RULES;
  }

  // --- PUBLIC ---

  public static async onOpen(notebook: ServerNotebook): Promise<WolframObserver> {
    debug(`Opening Wolfram CAS observer for ${notebook._path}.`);
    return new this(notebook);
  }

  // --- PRIVATE ---

  // Private Class Constants

  private static RULES: Rules = [
    {
      name: "wolfram-to-tex",
      parentStylePattern: { meaning: 'INPUT', type: 'WOLFRAM' },
      meaning: 'INPUT-ALT',
      type: 'LATEX',
      computeAsync: WolframObserver.ruleConvertWolframToTex,
    },
    {
      name: "evaluate-wolfram",
      parentStylePattern: { meaning: /^(INPUT|INPUT-ALT)$/, type: 'WOLFRAM' },
      // parentStylePattern: { meaning: 'INPUT', type: 'WOLFRAM' },
      meaning: 'EVALUATION',
      type: 'WOLFRAM',
      computeAsync: WolframObserver.ruleEvaluateWolframExpr,
    },
  ];

  // Private Class Methods

  private static async ruleConvertWolframToTex(data: WolframData): Promise<LatexData|undefined> {
    return data ? await findTeXForm(data) : undefined;
  }

  private static async ruleEvaluateWolframExpr(expr: WolframData) : Promise<WolframData|undefined> {
    debug(`Evaluating: "${expr}".`);
    let rval: WolframData|undefined;
    if (isEmptyOrSpaces(expr)) {
      rval = undefined;
    } else {
      rval = await execute(`InputForm[runPrivate[${expr}]]`);
    }
    debug("Evaluated to: ", rval);
    return rval;
  }

  // Private Constructor

  protected constructor(notebook: ServerNotebook) { super(notebook); }

}
