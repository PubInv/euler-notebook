/*
Math Tablet
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

import { execute, checkEquiv, convertTeXtoWolfram } from "../adapters/wolframscript";

// import { expect } from "chai";
import { assert } from "chai";
import 'mocha';

import { ensureGlobalLoaded } from "./global";
import { WolframExpression } from "../shared/notebook";
ensureGlobalLoaded();

// Constants

const TEST_CASES: [WolframExpression,WolframExpression][] = [
  [<WolframExpression>'FullForm[Hold[y = 13]]',
  <WolframExpression>'Hold[Set[y, 13]]'],

  [<WolframExpression>'N[Sqrt[3]]',
  <WolframExpression>'1.73205'],

  // Determining if an expression is a quadratic
  [<WolframExpression>'With[{v = Variables[#]}, Exponent[#, v[[1]]] == 2 && Length[v] == 1] &[x^2 + x]',
  <WolframExpression>'True'],

  [<WolframExpression>'InputForm[x^3 + 3]',
  <WolframExpression>'3 + x^3'],

//  Here Rob attempts to test some of the runPrivate functionality
// EXPECTED TO FAIL: ['runPrivate[InputForm[x^3 + 3]]',
//  '3 + x^3'],
  [<WolframExpression>'15 + 13',
  <WolframExpression>'28'],
  [<WolframExpression>'runPrivate[15 + 13]',
  <WolframExpression>'28'],
  [<WolframExpression>'InputForm[runPrivate[x^3 + x]]',
  <WolframExpression>'x + x^3'],
  [<WolframExpression>'runPrivate[With[{ v = Variables[#]},If[(Length[v] == 1) && (Exponent[#,v[[1]]] ==2),v[[1]],False]]]  &[x^2 + 5]',
  <WolframExpression>'x'],
  [<WolframExpression>'runPrivate[With[{ v = Variables[#]},If[(Length[v] == 1) && (Exponent[#,v[[1]]] ==2),v[[1]],False]]]  &[x^2 + y + 5]',
  <WolframExpression>'False'],
  [<WolframExpression>'runPrivate[With[{ v = Variables[#]},If[(Length[v] == 1) && (Exponent[#,v[[1]]] ==2),v[[1]],False]]]  &[x^2 + y * 3]',
  <WolframExpression>'False'],
  [<WolframExpression>'runPrivate[With[{v = Variables[#]},If[(Length[v] == 1) && (Exponent[#, v[[1]]] == 2), v[[1]], False]] &[y /. { { y -> 4} }]]',
  <WolframExpression>'False'],
  [<WolframExpression>'runPrivate[With[{v = Variables[#]},If[(Length[v] == 1) && (Exponent[#, v[[1]]] == 2), v[[1]], False]] &[x^2 + 3*y /.  { y -> 4} ]]',
  <WolframExpression>'x']
];

// This is an attempt to make a simple boolean test
// of whether two expressions are the same or not.
const EQUIVALENCE_TEST_CASES = [
  ['x',
   'x',
   'true'],
  ['x',
   'y',
   'false'],
  ['x^2 + x^2',
   '2x^2',
   'true'],
];

const TEX_TEST_CASES = [
  ['x',
   'x'],
  ['\\frac{(x+y)^2}{\\sqrt{x y}}',
   '(x + y)^2/Sqrt[xy]'
  ],
];

// Unit Tests

describe("wolframscript", function(){
  this.timeout(10*1000);

  // it("test case", async function(){
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
    const p1 = await execute(<WolframExpression>'Pause[2]; "Hello,"');
    const p2 = await execute(<WolframExpression>'Pause[2]; "World!"');
    const [ r1, r2 ] = await Promise.all([p1, p2]);
    assert.equal(r1, 'Hello,');
    assert.equal(r2, 'World!');
  });

});


describe("wolframscript other", function(){
  this.timeout(10*1000);

    it("serializes execution", async function(){
      // REVIEW: What exactly is this testing?
      const p1 = await execute(<WolframExpression>'Pause[2]; "Hello,"');
      const p2 = await execute(<WolframExpression>'Pause[2]; "World!"');
      const [ r1, r2 ] = await Promise.all([p1, p2]);
      assert.equal(r1, 'Hello,');
      assert.equal(r2, 'World!');
    });

});

describe("wolframscriptequivalence", function(){
  this.timeout(10*1000);

  for (const [a,b, expected] of EQUIVALENCE_TEST_CASES) {
      const label = (a.length<=20 ?
        `checks equivalence ${a} ${b}` :
        `checks equivalend ${a.slice(0,20)} ${b.slice(0,20)}...`
      )
      it(label, async function(){
        const results = await checkEquiv(a,b);
        assert.equal(results, expected == 'true');
      });
    }

});

describe("wolframTeXConversion", function(){
  this.timeout(10*1000);

  it("simple TeX works (x)", async function(){
    const expr = TEX_TEST_CASES[0][0];
    const r = TEX_TEST_CASES[0][1];
    const result = await convertTeXtoWolfram(expr);
    console.log("result",result);
    assert.equal(result, r);
  });

  it("more complex TeX works (x)", async function(){
    const expr = TEX_TEST_CASES[1][0];
    const r = TEX_TEST_CASES[1][1];
    const result = await convertTeXtoWolfram(expr);
    console.log("result",result);
    assert.equal(result, r);
  });

});
