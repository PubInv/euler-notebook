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

import { execute, start, stop } from '../wolframscript';

// import { expect } from 'chai';
import { assert } from 'chai';
import 'mocha';

const TEST_CASES = [
  ['N[Sqrt[3]]', 
   '1.73205'],

  // Determining if an expression is a quadratic
  ['With[{v = Variables[#]}, Exponent[#, v[[1]]] == 2 && Length[v] == 1] &[x^2 + x]', 
   'True'],

  // Converting MathML to Wolfram expression.
  ['InputForm[ToExpression[ImportString["<math xmlns=\'http://www.w3.org/1998/Math/MathML\'><msup><mrow><mi>x</mi></mrow><mrow><mn>2</mn></mrow></msup><mo>+</mo><mn>3</mn><mi>x</mi><mo>+</mo><mn>5</mn></math>", "MathML"]]]',
   '5 + 3*x + x^2'],

  ['InputForm[x^3 + 3]',
   '3 + x^3'],
];

// TODO: Error test cases. e.g. 'InputForm[x^3 + 3' (Missing right bracket);

let gWolframStarted: boolean = false;

describe("wolframscript", function(){
    this.timeout(10*1000);

    before("starting", async function(){
      await start();
      gWolframStarted = true;
    });

    // it.only("test case", async function(){
    //   //throw new Error("CRASH");
    //   try {
    //     const [ expr, expected ] = TEST_CASES[3];
    //     const results = await execute(expr);
    //     assert.equal(results, expected);
    //   } catch(err) {
    //     console.error(`EXCEPTION: ${err.message}`);
    //     // throw err;
    //     throw new Error("CRASH2");
    //   }
    // });

    for (const [expr, expected] of TEST_CASES) {

      const label = (expr.length<=20 ?
        `evaluates ${expr}` :
        `evaluates ${expr.slice(0,20)}...`
      )
      it(label, async function(){
        const results = await execute(expr);
        assert.equal(results, expected);
      });
  
    }

    after("stopping", async function(){
      if (gWolframStarted) {
        await stop();
      }
    });
});