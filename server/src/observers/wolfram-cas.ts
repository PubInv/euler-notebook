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

import debug1 from "debug"


import { WolframExpression } from "../shared/notebook"
import { isEmptyOrSpaces } from "../shared/math-tablet-api"

import { BaseObserver, Rules, StyleRelation } from "./base-observer"
import { convertMathTabletLanguageToWolfram, execute } from "../wolframscript"
import { ServerNotebook } from "../server-notebook"

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// Constants

// Exported Class

export class WolframObserver extends BaseObserver {

  // --- OVERRIDES ---

  protected get rules(): Rules { return WolframObserver.RULES; }

  // --- PUBLIC ---

  public static async onOpen(notebook: ServerNotebook): Promise<WolframObserver> {
    debug(`Opening Wolfram CAS observer for ${notebook.path}.`);
    return new this(notebook);
  }

  // --- PRIVATE ---

  // Private Class Constants

  private static RULES: Rules = [
    {
      name: "evaluate-wolfram",
      // REVIEW: Should evaluation be attached to FORMULA, rather than REPRESENTATION?
      styleTest: { role: 'REPRESENTATION', type: 'WOLFRAM-EXPRESSION' },
      styleRelation: StyleRelation.ParentToChild,
      props: { role: 'EVALUATION', type: 'WOLFRAM-EXPRESSION' },
      computeAsync: WolframObserver.ruleEvaluateWolframExpr,
    },
  ];

  // Private Class Methods

  // One problem here is that we are not rewriting the single equal, which is the "math-tablet input" language,
  // to the double equal, which is essentially the wolfram language (thought not a one-to-one correspondence.)
  private static async ruleEvaluateWolframExpr(expr: WolframExpression) : Promise<WolframExpression|undefined> {
    // REVIEW: If evaluation fails?
    debug(`Evaluating: "${expr}".`);
    let rval: WolframExpression|undefined;
    if (isEmptyOrSpaces(expr)) {
      rval = undefined;
    } else {
      const converted = convertMathTabletLanguageToWolfram(expr);
      rval = await execute(`InputForm[runPrivate[${converted}]]`);
    }
    debug("Evaluated to: ", rval);
    return rval;
  }

  // Private Constructor

  protected constructor(notebook: ServerNotebook) { super(notebook); }

}
