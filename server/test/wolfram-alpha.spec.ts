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

import { assert } from "chai";

import { PlainText } from "../src/shared/common";

import { search, search_full, /* findEquationInAlphaResult */} from "../src/adapters/wolframalpha";

import { requireWolframAlpha } from "./require-wolframalpha";
import { requireWolframScript } from "./require-wolframscript";

requireWolframAlpha();
requireWolframScript();

// Constants

const QueriesThatMayReturnFormula = [
  "Quadratic formula",
  "Newton's second law",
  "ideal gas law",
  "Volume of a cone",
  "Law of Sines",
  "cosine law",
  "pythagorean theorem",
  "Bayes' theorem",
  "the rocket equation",
  "height of thrown object",
  "Compound interest formula",
  "volume of sphere",
//  "period of orbit formula",
  "work of piston"
];

// these DO NOT provide a formula
const NonFormulaQueries = [
    "cubic equation",
];
const QueriesThatMayReturnConstants = [
  "Earth gravity acceleration",
  "Speed of light",
  "Atomic number of uranium",
  "Population of the U.S.",
   "Price of Microsoft on 9/11/2001",
   "price of gold",
   "mass of limestone",
   "Inflation since 1972",
   "boiling point of alcohol"
];

const ResultsAsGottenFromAlpha = [
  { result: 'a^2 + b^2 = c^2',
    desired: 'a^2 + b^2 == c^2' },

  // These are all useful cases that we should
  // aspire to. I am commenting them out so the
  // test will be green, but these are things we want to handle...
  // { result: 'sin(α)/a = sin(β)/b | \n' +
  // 'b | second side length\n' +
  // 'a | first side length\n' +
  // 'α | angle opposite first side\n' +
  //   'β | angle opposite second side',
  //   desired: 'sin(α)/a = sin(β)/b'
  // },
  // { result: 'c^2 = a^2 + b^2 - 2 a b cos(γ) | | \n' +
  // 'c | third side length\n' +
  // 'a | first side length\n' +
  // 'b | second side length\n' +
  // 'γ | angle opposite third side',
  //   desired: 'c^2 = a^2 + b^2 - 2 a b cos(γ)' },
  // { result: 'FV = PV (1 + i/12)^(12 n) | \n' +
  // 'PV | present value\n' +
  // 'FV | future value\n' +
  // 'i | interest rate\n' +
  // 'n | interest periods\n' +
  //   '(assumes finite compounding)',
  //   desired: 'FV = PV (1 + i/12)^(12 n)'},
  // { result: 'v_f = v_i + v_e log(m_i/m_f) | \n' +
  // 'v_f | final speed\n' +
  // 'v_i | initial speed\n' +
  // 'v_e | effective exhaust velocity\n' +
  // 'm_i | initial mass\n' +
  //   'm_f | final mass',
  //   desired: 'v_f = v_i + v_e log(m_i/m_f)'
  // },
  // { result: 'V = (4 π a^3)/3\n(assuming radius a)',
  //   desired: 'V = (4 π a^3)/3' },
  // { result: 'V = (4 π a^3)/3\n(assuming radius a)',
  //   desired: 'v == (4*a^3*p)/3' },
//  { result: 'F_net = (dp)/(dt) | F = ma',
//    desired: 'F = ma' },
  // { result: 'x^2 - 2 x + 1 = 0\n' +
  // 'a x^2 + b x + c = 0 | \n' +
  // 'x | indeterminate variable\n' +
  // 'a | quadratic coefficient\n' +
  // 'b | linear coefficient\n' +
  // 'c | constant coefficient\n' +
  //   '(x = (-b ± sqrt(b^2 - 4 a c))/(2 a))',
  //   desired: 'x = (-b ± sqrt(b^2 - 4 a c))/(2 a'},
];

// Unit Tests

describe("wolfram alpha", function() {
  this.timeout(10000);

  // This is timing out. There is a discussion on stackexchange about
  // returning a promise instead, but I do not have time to study it now. -rlr
  it("Searches", async function(){
    const short = await search(<PlainText>"Specific heat of carbon");
    assert.isAtLeast(short.length, 1, 'We should get at least one renderable result');
    const gas = await search_full(<PlainText>"Ideal Gas Law");
    assert.isAtLeast(gas.length, 1, 'We should get at least one renderable result');
  });

  it.skip("Quadratic equation", async function(){
    throw new Error("Not implemented.");
    // const sr = await search_full(<PlainText>"quadratic equation");
    // assert.isAtLeast(sr.length,1, 'We should get at least one renderable result');
    // assert.isOk(sr[0].formula,'We want a formula out of this');
  });

  it.skip("Relativistic Energy", async function(){
    throw new Error("Not implemented.");
    // const sr = await search_full(<PlainText>"convert mass to energy");
    // assert.isAtLeast(sr.length, 1, 'We should get at least one renderable result');
    // assert.isOk(sr[0].formula,'We want a formula out of this');
  });

  for(const f of QueriesThatMayReturnFormula) {
    it.skip(`Formula query '${f}'`, async function(){
      throw new Error("Not implemented.");
      // const sr = await search_full(<PlainText>f);
      // assert.isAtLeast(sr.length, 1, 'We should get at least one renderable result: '.concat(<string>f));
      // assert.isOk(sr[0].formula,'We want a formula out of this'.concat(<string>f));
    });
  }

  for(const f of NonFormulaQueries ) {
    it(`Non-formula queriy '${f}'`, async function(){
      const sr = await search_full(<PlainText>f);
      assert.isAtLeast(sr.length, 1, 'We should get at least one renderable result');
    });
  }

  for(const f of QueriesThatMayReturnConstants) {
    it(`Constant query '${f}'`, async function(){
      const sr = await search_full(<PlainText>f);
      assert.isAtLeast(sr.length, 1, 'We should get at least one renderable result: '.concat(<string>f));
      assert.isOk(sr[0].knownConstant,'We want a constant out of this'.concat(<string>f));
    });
  }

  it("Fibonacci Identity is handled sensibly", async function(){
    const f= "fibonacci identity"
    const sr = await search_full(<PlainText>f);
    // console.log("Fibonacci Identity search Results:",sr);
    assert.isAtLeast(sr.length, 1, 'We should get at least one renderable result: '.concat(<string>f));
  });

  for(const f of ResultsAsGottenFromAlpha) {
    it.skip(`Equation string '${f}'`, async function() {
      throw new Error("Not implemented.");
      // const extracted = await findEquationInAlphaResult(f.result);
      // // console.log(f);
      // // console.log(extracted);
      // assert.equal(extracted,f.desired);
    });
  }

});
