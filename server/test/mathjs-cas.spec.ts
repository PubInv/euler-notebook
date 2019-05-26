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

import { TDoc }  from '../tdoc';
// import { Config } from '../config';
import { initialize as initializeMathJsCas } from '../observers/mathjs-cas';

import { assert } from 'chai';
import 'mocha';
import { StyleType, StyleMeaning, StyleSource, StyleObject, StyleProperties, MathJsData } from '../../client/math-tablet-api';

// Tests

describe('mathjs-cas', function(){

  before(async function(): Promise<void>{
    await initializeMathJsCas({});
  });

  it("Adds appropriate substyles to MATHJS INPUT for '2+2'", function(){
    const substyles = getStylesGeneratedForInputStyle("2+2");
    // console.dir(substyles);
    assert(substyles.length==3);
    assert(hasStyles(substyles, 'LATEX', 'INPUT-ALT', 'USER', ["2+2"]));
    assert(hasStyles(substyles, 'MATHJS', 'EVALUATION', 'MATHJS', ["4"]));
    assert(hasStyles(substyles, 'MATHJS', 'SIMPLIFICATION', 'MATHJS', ["4"]));
  });

  it("Adds appropriate substyles to MATHJS INPUT for 'x^2 + y^2 == r'", function(){
    const substyles = getStylesGeneratedForInputStyle("x^2 + y^2 == r");
    // console.dir(substyles);
    assert(substyles.length==6);
    assert(hasStyles(substyles, 'LATEX', 'INPUT-ALT', 'USER', ["{ x}^{2}+{ y}^{2}= r"]));
    assert(hasStyles(substyles, 'TEXT', 'EVALUATION-ERROR', 'MATHJS', ["Undefined symbol x"]));
    assert(hasStyles(substyles, 'MATHJS', 'SIMPLIFICATION', 'MATHJS', ["x ^ 2 + y ^ 2 == r"]));
    assert(hasStyles(substyles, 'MATHJS', 'SYMBOL', 'MATHJS', ["x", "y", "r"]));
  });
});

// Helper Functions

function findStyles(
  styles: StyleObject[],
  type: StyleType,
  meaning: StyleMeaning,
  source: StyleSource
): StyleObject[]|undefined {
  return styles.filter(s=>(s.type==type && s.meaning==meaning && s.source==source))
}

function getStylesGeneratedForInputStyle(data: MathJsData): StyleObject[] {
  const styleProps: StyleProperties = { type: 'MATHJS', meaning: 'INPUT', source: 'USER', data };
  return getStylesGeneratedForStyle(styleProps);
}

function getStylesGeneratedForStyle(styleProps: StyleProperties): StyleObject[] {
  const tDoc = TDoc.createAnonymous();
  const thought = tDoc.insertThought({});
  const style = tDoc.insertStyle(thought, styleProps);
  const substyles = tDoc.getStyles(style.id);
  return substyles;
}

function hasStyles(
  styles: StyleObject[],
  type: StyleType,
  meaning: StyleMeaning,
  source: StyleSource,
  datas: string[]
): boolean {
  const as1 = findStyles(styles, type, meaning, source);
  if (!as1) { return false; }
  if (as1.length != datas.length) { return false; }
  for (const data of datas) {
    if (!styles.find(s=>(s.data==data))) { return false; }
  }
  return true;
}
