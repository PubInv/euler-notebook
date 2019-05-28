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

// import * as debug1 from 'debug';
// const MODULE = __filename.split('/').slice(-1)[0].slice(0,-3);
// const debug = debug1(`server:${MODULE}`);
import { assert } from 'chai';
import 'mocha';

import { initialize as initializeMathJsCas } from '../observers/mathjs-cas';

import { assertHasStyles, getSubstylesGeneratedForStyle } from './common';

// Tests

describe('mathjs-cas', function(){

  before(async function(): Promise<void>{
    await initializeMathJsCas({});
  });

  it("Adds appropriate substyles to MATHJS INPUT for '2+2'", function(){
    const substyles = getSubstylesGeneratedForStyle({ type: 'MATHJS', meaning: 'INPUT', source: 'USER', data: "2+2" });
    // console.dir(substyles);
    assert(substyles.length==3);
    assertHasStyles(substyles, 'LATEX', 'INPUT-ALT', 'USER', ["2+2"]);
    assertHasStyles(substyles, 'MATHJS', 'EVALUATION', 'MATHJS', ["4"]);
    assertHasStyles(substyles, 'MATHJS', 'SIMPLIFICATION', 'MATHJS', ["4"]);
  });

  it("Adds appropriate substyles to MATHJS INPUT for 'x^2 + y^2 == r'", function(){
    const substyles = getSubstylesGeneratedForStyle({ type: 'MATHJS', meaning: 'INPUT', source: 'USER', data: "x^2 + y^2 == r" });
    // console.dir(substyles);
    assert(substyles.length==6);
    assertHasStyles(substyles, 'LATEX', 'INPUT-ALT', 'USER', ["{ x}^{2}+{ y}^{2}= r"]);
    assertHasStyles(substyles, 'TEXT', 'EVALUATION-ERROR', 'MATHJS', ["Undefined symbol x"]);
    assertHasStyles(substyles, 'MATHJS', 'SIMPLIFICATION', 'MATHJS', ["x ^ 2 + y ^ 2 == r"]);
    assertHasStyles(substyles, 'MATHJS', 'SYMBOL', 'MATHJS', ["x", "y", "r"]);
  });
});

// Helper Functions

