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

// import * as debug1 from "debug";
// const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
// const debug = debug1(`tests:${MODULE}`);
import { assert } from "chai";
import 'mocha';
// import * as sinon from "sinon";

import { FormulaCellData, PlainTextFormula } from "../shared/formula";
import { StyleId, CellInserted, WolframExpression } from "../shared/notebook";
import { InsertCellRequest, StyleChangeRequest } from "../shared/math-tablet-api";
import { ServerNotebook }  from "../server-notebook";

import { ensureGlobalLoaded } from "./global";
import { CellType, InputType } from "../shared/cell";
import { EMPTY_SVG, PlainText } from "../shared/common";
ensureGlobalLoaded();

// Unit Tests

describe("test relationships", function() {

  let notebook: ServerNotebook;
  beforeEach(async function(){ notebook = await ServerNotebook.openEphemeral(); });
  afterEach(function(){ notebook.close(); });

  describe("relationships support changes", function(){

    // This is the first unit test of a new understanding of N-ary relationships.
    // The basic approach is to:
    // Create a forumla F1
    // Use a transformation tool on it
    // This creates F2, and a relationship
    // Use the inverse relationship (e.g., apart is the inverse of together) to create F3
    // This creates F3, and a second relationship

    // This structure can be used as the basis of several tests:
    // Can we change F1 and see that F3 changes (if inverse relationships are used, should be F3 == F1)?
    // Can we make a change to F1 that makes the tool inapplicable ( x^2 + x => 4) and see
    // that the forumalae are correctly marked as changed.

    it("Can derive formulae then propagate a change", async function(){

      const OLD_F1 = <PlainTextFormula>"x + x^2";
      const NEW_F1 = <WolframExpression>"2*x + 2*x^2";
      const NEW_F2 = <PlainTextFormula>"2*x*(1 + x)";
      const NEW_F3 = <WolframExpression>"2*x + 2*x^2";

      // Insert "old" formula 1
      const changes = await notebook.requestChange('TEST', wolframFormulaInsertRequest(OLD_F1));
      const insertFormulaChange = changes.find(c=>c.type=='cellInserted' && c.style.role=='FORMULA');
      const formula1Style = (<CellInserted>insertFormulaChange).style;
      // console.log("Old Formula 1:");
      // console.dir(formula1Style);

      // Use the "factor" tool on formula 1
      const F1_algebra_tools = notebook.findStyles({ type: 'TOOL-DATA', source: 'ALGEBRAIC-TOOLS', recursive: true }, formula1Style.id);
      const F1_factor_tool = F1_algebra_tools.find( e => e.data.name == "factor");
      await notebook.useTool(F1_factor_tool!.id);

      // Find formula 2 inserted by the tool.
      const formula2Style = notebook.findStyles({ type: 'FORMULA-DATA', role: 'FORMULA' }).find(w => w.id != formula1Style.id)!;
      // console.log("Old Formula 2:");
      // console.dir(formula2Style);

      // Use the "apart" tool on formula 2
      const F2_algebra_tools = notebook.findStyles({ type: 'TOOL-DATA', source: 'ALGEBRAIC-TOOLS', recursive: true }, formula2Style!.id);
      const F2_apart_tool = F2_algebra_tools.find( e => e.data.name == "apart");
      await notebook.useTool(F2_apart_tool!.id);

      // Find formula 3 inserted by the tool.
      const formula3Style = notebook.findStyles({ type: 'FORMULA-DATA', role: 'FORMULA' }).find(w => (w.id != formula1Style.id && w.id != formula2Style!.id))!;
      // console.log("Old Formula 3:");
      // console.dir(formula3Style);

      // Change formula 1
      await notebook.requestChange('TEST', wolframFormulaChangeRequest(formula1Style.id, NEW_F1));

      // Verify that formula 2 and formula 3 have changed.
      // REVIEW: Is it safe to assume that formula 2 and formula 3 have changed "in-place"?
      // console.log("New Formula 2:");
      // console.dir(formula2Style);
      assert.equal(formula2Style.data.wolframData, NEW_F2);
      // console.log("Old Formula 3:");
      // console.dir(formula3Style);
      assert.equal(formula3Style.data.wolframData, NEW_F3);

    });
  });
});

// Helper Functions
// TODO: This should probably be extended to respect the MTLExpression type
function wolframFormulaInsertRequest(plainTextFormula: PlainTextFormula): InsertCellRequest {
  const data: FormulaCellData = {
    type: CellType.Formula,
    inputType: InputType.None,
    displaySvg: EMPTY_SVG,
    height: 72, // points
    inputText: <PlainText>plainTextFormula,
    plainTextFormula: plainTextFormula,
  };
  const request: InsertCellRequest = {
    type: 'insertCell',
    // styleProps: { role: 'REPRESENTATION', type: 'WOLFRAM-EXPRESSION', data },
    styleProps: { role: 'FORMULA', type: 'FORMULA-DATA', data: data },
  };
  return request;
}

function wolframFormulaChangeRequest(id: StyleId, wolframData: WolframExpression): StyleChangeRequest {
  const request: StyleChangeRequest = { type: 'changeStyle', styleId: id, data: { wolframData } };
  return request;
}

// interface RelationshipStringObject {
//   from: string;
//   to: string;
// }

// // This is likely to be needed, so I am retaining at the early stage of writing this file -rlr
// function constructMapRelations(notebook: ServerNotebook, rs : RelationshipObject[]) :RelationshipStringObject[] {
//   return rs.map(r => {
//     const frS = notebook.getStyle(r.fromId);
//     const frTS = notebook.topLevelStyleOf(frS.id);
//     const toS = notebook.getStyle(r.toId);
//     const toTS = notebook.topLevelStyleOf(toS.id);
//     return { from: frTS.data, to: toTS.data};
//   });
// }

// // This is likely to be needed, so I am retaining at the early stage of writing this file -rlr
// function getThought(notebook : ServerNotebook,n : number) : StyleId {
//   const tls = notebook.topLevelStyleOrder();
//   const thoughtId = tls.slice(n)[0];
//   return thoughtId;
// }

// This is likely to be needed, so I am retaining at the early stage of writing this file -rlr
//const insertRequest:StyleInsertRequest[] = generateInsertRequests(data);
