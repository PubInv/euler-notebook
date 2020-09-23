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

// TODO: Merge into wolfram-observer (however this extends DataflowObserver and that extends BaseObserver).

// Requirements

import debug1 from "debug";

import { DataflowObserver, Rules, DataflowValue, DataflowStatus } from "./dataflow-observer";
import { ServerNotebook } from "../server-notebook";
import { execute } from "../adapters/wolframscript";

import { RelationshipObject, HintData, HintRelationship, HintStatus } from "../shared/notebook";

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// Constants

// Exported Class

export class AlgebraicDataflowObserver extends DataflowObserver {

  // --- OVERRIDES ---

  protected get rules(): Rules { return AlgebraicDataflowObserver.RULES; }

  // --- PUBLIC ---

  public static async onOpen(notebook: ServerNotebook): Promise<DataflowObserver> {
    debug(`Opening AlgebraicDataflowObserver for ${notebook.path}.`);
    return new this(notebook);
  }

  // --- PRIVATE ---

  // Private Class Constants

  private static RULES: Rules = [
    {
      name: "algebraic-transformation",
      relationshipRole: 'TRANSFORMATION',
      computeAsync: AlgebraicDataflowObserver.prototype.algebraicTransformationRule,
    },
  ];

  // Private Constructor

  protected constructor(notebook: ServerNotebook) { super(notebook); }

  // Private Instance Methods

  private async algebraicTransformationRule(relationship: RelationshipObject, inputValues: DataflowValue[]): Promise<DataflowValue[]> {
    debug(`algebraicTransformationRule`);

    var dfvs: DataflowValue[] = [];
    if (relationship.role != 'TRANSFORMATION') return dfvs;
    // In this case (that of ALGEBRAIC-TOOLS),
    // The outputs are only FORMULA and HINT in that order

    const changedData = inputValues[0].value;

    // TODO: need input styles so we can search for substyles with necessary data.
    var substituted = relationship.data.replace('${expr}', changedData.wolframData);

    var hdata : HintData = {
      relationship: HintRelationship.Equivalent,
      status: HintStatus.Correct,
      idOfRelationshipDecorated: relationship.id,
    };

    try {
      debug(`Executing: ${substituted}`);
      const transformed = await execute(substituted);

      dfvs.push({
        status: DataflowStatus.Changed,
        value: { wolframData: transformed },
      });
      dfvs.push({
        status: DataflowStatus.Changed,
        value: hdata,
      });
    } catch (e) {
      debug("error in wolfram execution: "+substituted);
      console.error("error in wolfram execution: "+substituted);
      dfvs[0] = {
        status: DataflowStatus.Invalid,
        message: 'TODO: Reason why output value is invalid.',
      }
      dfvs[1] = {
        status: DataflowStatus.Invalid,
        message: 'TODO: Reason why output value is invalid.',
      }
    }

    return dfvs;
  }
}

// HELPER FUNCTIONS
