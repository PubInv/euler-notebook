/*
Euler Notebook
Copyright (C) 2019-21 Public Invention
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

// TODO: Switch to only use 'notebook' functionality, not 'server-notebook' functionality.
// Requirements

// import * as debug1 from "debug";
// const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
// const debug = debug1(`tests:${MODULE}`);

// Requirements

// import { assert } from "chai";
import 'mocha';
import { ServerFormula } from "../src/models/server-formula";
import { PlainTextFormula } from "../src/shared/formula";

import { requireWolframScript } from "./require-wolframscript";
import { JIIX_FORMULA_TABLE } from "./jiix-data";
import { assert } from '../src/shared/common';

requireWolframScript();

// Test Data

// Unit Tests

describe("ServerFormula", function(){

  it("Creates a formula", async function(){
    const plainText = <PlainTextFormula>"x^2";
    const serverFormula = await ServerFormula.createFromPlainText(plainText);
    console.dir(serverFormula);
  });

  for (const jiixFormulaEntry of JIIX_FORMULA_TABLE) {
    const { plain, jiix, tex, wolfram } = jiixFormulaEntry;
    it(`Creates formula from JIIX for: ${plain}`, function(){
      const serverFormula = ServerFormula.createFromJiix(jiix);
      assert(serverFormula.plain == plain);
      assert(serverFormula.tex == tex);
      assert(serverFormula.wolfram == wolfram);
    });
  }
})
