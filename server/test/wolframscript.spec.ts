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

/*

TODO: Additional Test cases
  * Error test cases. e.g. 'InputForm[x^3 + 3' (Missing right bracket);
  * Start multiple times should fail.
  * Execute before start should fail.
  * Stop multiple times should fail.
  * Execute during stopping should fail.
  * Execute after stop should fail.
  * Can start, then stop, then start, then stop the server.

*/

// Requirements

import { execute, start, stop, defineRunPrivate } from '../wolframscript';

// import { expect } from 'chai';
import { assert } from 'chai';
import 'mocha';

const TEST_CASES = [
  // ['FullForm[Hold[y = 13]]',
  //  'Hold[Set[y, 13]]'],

  // ['N[Sqrt[3]]',
  //  '1.73205'],

  // // Determining if an expression is a quadratic
  // ['With[{v = Variables[#]}, Exponent[#, v[[1]]] == 2 && Length[v] == 1] &[x^2 + x]',
  //  'True'],

  // // Converting MathML to Wolfram expression.
  // ['InputForm[ToExpression[ImportString["<math xmlns=\'http://www.w3.org/1998/Math/MathML\'><msup><mrow><mi>x</mi></mrow><mrow><mn>2</mn></mrow></msup><mo>+</mo><mn>3</mn><mi>x</mi><mo>+</mo><mn>5</mn></math>", "MathML"]]]',
  //  '5 + 3*x + x^2'],

  // ['InputForm[x^3 + 3]',
  //  '3 + x^3'],

  // Here Rob attempts to test some of the runPrivate functionality
//  ['runPrivate[InputForm[x^3 + 3]]',
//   '3 + x^3'],
  // ['15 + 13',
  //  '28'],
  // ['runPrivate[15 + 13]',
  //  '28'],
  // ['InputForm[runPrivate[x^3 + x]]',
  //  'x + x^3'],
  // ['runPrivate[With[{ v = Variables[#]},If[(Length[v] == 1) && (Exponent[#,v[[1]]] ==2),v[[1]],False]]]  &[x^2 + 5]',
  //  'x'],
  // ['runPrivate[With[{ v = Variables[#]},If[(Length[v] == 1) && (Exponent[#,v[[1]]] ==2),v[[1]],False]]]  &[x^2 + y + 5]',
  //  'False'],
  // ['runPrivate[With[{ v = Variables[#]},If[(Length[v] == 1) && (Exponent[#,v[[1]]] ==2),v[[1]],False]]]  &[x^2 + y * 3]',
  //  'False'],
  // ['runPrivate[With[{v = Variables[#]},If[(Length[v] == 1) && (Exponent[#, v[[1]]] == 2), v[[1]], False]] &[y /. { { y -> 4} }]]',
  //  'False'],
  ['runPrivate[With[{v = Variables[#]},If[(Length[v] == 1) && (Exponent[#, v[[1]]] == 2), v[[1]], False]] &[x^2 + 3*y /.  { y -> 4} ]]',
   'x']
];

describe("wolframscript", function(){

    let gWolframStarted: boolean = false;
    this.timeout(10*1000);

    before("starting", async function(){
      await start();

      await defineRunPrivate();
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

    it("serializes execution", async function(){
      const p1 = await execute('Pause[2]; "Hello,"');
      const p2 = await execute('Pause[2]; "World!"');
      const [ r1, r2 ] = await Promise.all([p1, p2]);
      assert.equal(r1, 'Hello,');
      assert.equal(r2, 'World!');
    });

    after("stopping", async function(){
      if (gWolframStarted) {
        await stop();
      }
    });
});
