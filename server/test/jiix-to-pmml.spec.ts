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

import { assert } from "chai";

import { convertJiixExpressionToPresentationMathMlTree } from "../src/converters/jiix-to-pmml";

import { FORMULA_TABLE } from "./formula-table";

// Constants

// Unit Tests

describe("convertJiixExpressionToPresentationMathMlTree", function(){
  this.timeout(10*1000);
  for (const entry of FORMULA_TABLE) {
    const title = `converts ${entry.plain} correctly.`;
    if (entry.skip) {
      it.skip(title);
      continue;
    }
    it(title, function(){
      const presentationMathMlTree = convertJiixExpressionToPresentationMathMlTree(entry.jiixExpression);
      assert.deepEqual(presentationMathMlTree, entry.presentationMathMlTree);
    });
  }
});
