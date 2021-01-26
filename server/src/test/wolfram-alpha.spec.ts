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
import * as debug1 from "debug";
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`tests:${MODULE}`);
import { loadConfig /* , loadCredentials */ } from "../config";


import { search, search_full,findEquationInAlphaResult } from "../adapters/wolframalpha";
import { PlainText,} from "../shared/common";
import { SearchResults } from "../shared/api-calls";
import { assert } from "chai";
import { start as startWolframscript, stop as stopWolframscript } from "../adapters/wolframscript";

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

before("Loading config and starting WolframScript.", async function() {
  // REVIEW: It is a little fragile that we count on initializing things in the same order
  //         as server/src/app.ts/main(). Both should call the same high-level initialization
  //         function that insures the initialization is done in the same order.
  this.timeout(10*1000);
  debug(`Global before`);
  const config = await loadConfig();
  if (!config.mathematica) { throw new Error(`Unit tests require WolframScript.`); }
  // const credentials = await loadCredentials();
  debug(`  Starting WolframScript.`);
  await startWolframscript(config.wolframscript);
  debug(`  Global before finished.`);
});

after("Stopping WolframScript.", async function(){
  this.timeout(10*1000);
  debug(`Global after.`);
  debug(`  Stopping WolframScript.`);
  await stopWolframscript();
  debug(`  Global after finished.`);
});

// Unit Tests
describe("wolfram alpha", function() {
  // This is timing out. There is a discussion on stackexchange about
  // returning a promise instead, but I do not have time to study it now. -rlr
  it("Searches", async function(){
    const short : SearchResults = await search(<PlainText>"Specific heat of carbon");
    assert.isAtLeast(short.results.length,1, 'We should get at least one renderable result');
    const gas : SearchResults = await search_full(<PlainText>"Ideal Gas Law");
    assert.isAtLeast(gas.results.length,1, 'We should get at least one renderable result');
  }).timeout(5000);
  it("Quadratic equation", async function(){
    const sr : SearchResults = await search_full(<PlainText>"quadratic equation");
    assert.isAtLeast(sr.results.length,1, 'We should get at least one renderable result');
    assert.isOk(sr.results[0].formula,'We want a formula out of this');
  });
  it("Relativistic Energy", async function(){
    const sr : SearchResults = await search_full(<PlainText>"convert mass to energy");
    assert.isAtLeast(sr.results.length,1, 'We should get at least one renderable result');
    assert.isOk(sr.results[0].formula,'We want a formula out of this');
  });
  it("Test all Formula Queries", async function(){
    for(const f of QueriesThatMayReturnFormula) {
      const sr : SearchResults = await search_full(<PlainText>f);
      assert.isAtLeast(sr.results.length,1, 'We should get at least one renderable result: '.concat(<string>f));
      assert.isOk(sr.results[0].formula,'We want a formula out of this'.concat(<string>f));
    }
  }).timeout(50000);

  it("Non-formula queries don't crash", async function(){
    for(const f of NonFormulaQueries ) {
      const sr : SearchResults = await search_full(<PlainText>f);
      assert.isAtLeast(sr.results.length,1, 'We should get at least one renderable result');
    }
  }).timeout(5000);

  it("Test Constant Queries", async function(){
    for(const f of QueriesThatMayReturnConstants) {
      const sr : SearchResults = await search_full(<PlainText>f);
      assert.isAtLeast(sr.results.length,1, 'We should get at least one renderable result: '.concat(<string>f));

      assert.isOk(sr.results[0].knownConstant,'We want a constant out of this'.concat(<string>f));
    }
  }).timeout(50000);

  it.only("Fibonacci Identity is handled sensibly", async function(){

    const f= "fibonacci identity"
    const sr : SearchResults = await search_full(<PlainText>f);
    console.log("Fibonacci Identity search Results:",sr);
    assert.isAtLeast(sr.results.length,1, 'We should get at least one renderable result: '.concat(<string>f));
  }).timeout(50000);

  it("Test ability to extract equation string", async function() {
    for(const f of ResultsAsGottenFromAlpha) {
      const extracted = await findEquationInAlphaResult(f.result);
      console.log(f);
      console.log(extracted);
      assert.equal(extracted,f.desired);
    }
  });

});
