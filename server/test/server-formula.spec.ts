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
// import { ServerFormula } from "../src/models/server-formula";

import { requireWolframScript } from "./require-wolframscript";

requireWolframScript();

// Test Data

// Unit Tests

describe("ServerFormula", function(){

  it.skip("Creates a formula from an object", function(){
    throw new Error("Not implemented.");
  });

  it.skip("Creates a formula from a presentation MathML tree", function(){
    throw new Error("Not implemented.");
  });

})
