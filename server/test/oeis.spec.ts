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

// Requirements

// import * as debug1 from "debug";
// const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
// const debug = debug1(`tests:${MODULE}`);

import { search } from "../src/adapters/oeis";
import { PlainText,} from "../src/shared/common";
import { assert } from "chai";

// Constants

const QueriesThatMayReturnFormula = [
  "fibonacci",
  "A1", // Number of groups of order n.
];

// these DO NOT provide a formula
const NonFormulaQueries = [
    "bullfrog",
];

// Unit Tests

describe("oeis", function() {
  this.timeout(5000);

  for(const f of NonFormulaQueries ) {
    it(`Non-formula query '${f}' doesn't crash`, async function(){
      const sr = await search(<PlainText>f);
      assert.isAtLeast(sr.length, 0);
    });
  }

  for(const f of QueriesThatMayReturnFormula) {
    it(`Formula query ${f}`, async function(){
      const sr = await search(<PlainText>f);
      assert.isAtLeast(sr.length, 1);
      assert.isOk(sr[0].wolframExpr);
    });
  }

});
