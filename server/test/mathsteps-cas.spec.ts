
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

import { initialize as initializeMathstepsCas } from '../observers/math-steps-cas';

import { getStylesGeneratedForInputStyle, hasStyles } from './common';

// Constants

const EXPR1 = "x+x"
const EXPR1_SIMPLIFICATION = `ADD_POLYNOMIAL_TERMS
FROM: x + x
  TO: 2 x
  ADD_COEFFICIENT_OF_ONE
  FROM: x + x
    TO: 1 x + 1 x
  GROUP_COEFFICIENTS
  FROM: 1 x + 1 x
    TO: (1 + 1) x
  SIMPLIFY_ARITHMETIC
  FROM: (1 + 1) x
    TO: 2 x
`;

const EQUA1 = "2(x+3)=5x";
const EQUA1_SIMPLIFICATION = `DISTRIBUTE
FROM: 2 * (x + 3) = 5x
  TO: 2x + 6 = 5x
  DISTRIBUTE
  FROM: 2 * (x + 3) = 5x
    TO: 2x + 2 * 3 = 5x
  SIMPLIFY_TERMS
  FROM: 2x + 2 * 3 = 5x
    TO: 2x + 6 = 5x
    SIMPLIFY_ARITHMETIC
    FROM: 2x + 2 * 3 = 5x
      TO: 2x + 6 = 5x
SUBTRACT_FROM_BOTH_SIDES
FROM: 2x + 6 = 5x
  TO: (2x + 6) - 5x = (5x) - 5x
COLLECT_AND_COMBINE_LIKE_TERMS
FROM: 2x + 6 - 5x = (5x) - 5x
  TO: -3x + 6 = (5x) - 5x
  COLLECT_LIKE_TERMS
  FROM: 2x + 6 - 5x = (5x) - 5x
    TO: (2x - 5x) + 6 = (5x) - 5x
  ADD_POLYNOMIAL_TERMS
  FROM: 2x - 5x + 6 = (5x) - 5x
    TO: -3x + 6 = (5x) - 5x
    GROUP_COEFFICIENTS
    FROM: 2x - 5x + 6 = (5x) - 5x
      TO: (2 - 5) * x + 6 = (5x) - 5x
    SIMPLIFY_ARITHMETIC
    FROM: (2 - 5) * x + 6 = (5x) - 5x
      TO: -3x + 6 = (5x) - 5x
SIMPLIFY_RIGHT_SIDE
FROM: -3x + 6 = (5x) - 5x
  TO: -3x + 6 = 0
  ADD_POLYNOMIAL_TERMS
  FROM: -3x + 6 = 5x - 5x
    TO: -3x + 6 = 0x
    GROUP_COEFFICIENTS
    FROM: -3x + 6 = 5x - 5x
      TO: -3x + 6 = (5 - 5) * x
    SIMPLIFY_ARITHMETIC
    FROM: -3x + 6 = (5 - 5) * x
      TO: -3x + 6 = 0x
  MULTIPLY_BY_ZERO
  FROM: -3x + 6 = 0x
    TO: -3x + 6 = 0
SUBTRACT_FROM_BOTH_SIDES
FROM: -3x + 6 = 0
  TO: (-3x + 6) - 6 = 0 - 6
SIMPLIFY_LEFT_SIDE
FROM: (-3x + 6) - 6 = 0 - 6
  TO: -3x = 0 - 6
  COLLECT_AND_COMBINE_LIKE_TERMS
  FROM: -3x + 6 - 6 = 0 - 6
    TO: -3x + 0 = 0 - 6
    COLLECT_LIKE_TERMS
    FROM: -3x + 6 - 6 = 0 - 6
      TO: -3x + (6 - 6) = 0 - 6
    SIMPLIFY_ARITHMETIC
    FROM: -3x + 6 - 6 = 0 - 6
      TO: -3x + 0 = 0 - 6
  REMOVE_ADDING_ZERO
  FROM: -3x + 0 = 0 - 6
    TO: -3x = 0 - 6
REMOVE_ADDING_ZERO
FROM: -3x = 0 - 6
  TO: -3x = -6
DIVIDE_FROM_BOTH_SIDES
FROM: -3x = -6
  TO: (-3x) / -3 = -6/-3
SIMPLIFY_LEFT_SIDE
FROM: (-3x) / -3 = -6/-3
  TO: x = -6/-3
  CANCEL_MINUSES
  FROM: -3x / -3 = -6/-3
    TO: 3x / 3 = -6/-3
  SIMPLIFY_FRACTION
  FROM: 3x / 3 = -6/-3
    TO: x = -6/-3
SIMPLIFY_RIGHT_SIDE
FROM: x = -6/-3
  TO: x = 2
  CANCEL_MINUSES
  FROM: x = -6/-3
    TO: x = 6/3
  SIMPLIFY_FRACTION
  FROM: x = 6/3
    TO: x = 2
    FIND_GCD
    FROM: x = 6/3
      TO: x = (2 * 3) / (1 * 3)
    CANCEL_GCD
    FROM: x = (2 * 3) / (1 * 3)
      TO: x = 2
`;

// Tests

describe('mathsteps-cas', function(){

  before(async function(): Promise<void>{
    await initializeMathstepsCas({});
  });

  it(`Gives steps to solve expression '${EXPR1}'`, function(){
    const substyles = getStylesGeneratedForInputStyle(EXPR1);
    // console.dir(substyles);
    assert(substyles.length==1);
    assert(hasStyles(substyles, 'TEXT', 'INDENTED', 'MATHSTEPS', [EXPR1_SIMPLIFICATION]));
  });

  it(`Gives steps to solve equation '${EQUA1}'`, function(){
    const substyles = getStylesGeneratedForInputStyle(EQUA1);
    // console.dir(substyles);
    assert(substyles.length==1);
    assert(hasStyles(substyles, 'TEXT', 'INDENTED', 'MATHSTEPS', [EQUA1_SIMPLIFICATION]));
  });

});
