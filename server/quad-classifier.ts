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

import { NotebookChange, StyleObject } from '../client/math-tablet-api';
import { TDoc } from './tdoc';
import { execute } from './wolframscript';

// Exports

export async function initialize(): Promise<void> {
  TDoc.on('open', (tDoc: TDoc)=>{
    tDoc.on('change', function(this: TDoc, change: NotebookChange){ onChange(this, change); });
    tDoc.on('close', function(this: TDoc){ onClose(this); });
    onOpen(tDoc);
  });
}

// Private Functions

function onChange(tDoc: TDoc, change: NotebookChange): void {
  switch (change.type) {
  case 'styleInserted':
    quadClassifierRule(tDoc, change.style);
    break;
  default: break;
  }
}

function onClose(tDoc: TDoc): void {
  // console.log(`QuadClassifier tDoc close: ${tDoc._path}`);
}

function onOpen(tDoc: TDoc): void {
  // console.log(`QuadClassifier: tDoc open: ${tDoc._path}`);
}


// Return "null" if it does not seem to be a quadratic, and the name
// of the variable (which must be unique to pass this test) if it is.
async function isExpressionPlottableQuadratic(expr : string) : Promise<string|null> {
  // Mathematica offers various ways to deal with this:
  // https://reference.wolfram.com/language/tutorial/FindingTheStructureOfAPolynomial.html
  // I believe this is a good invocation of an anonymous function
  /*
With[{v = Variables[3 + x^2]},
   Print[Exponent[3 + x^2, x]];
    if[Exponent[3 + x^2, v[[1]]] == 2 && Length[v] == 1, v[[1]],
     False]]] &[3 + x^2]
  */
  const quadratic_function_script = `With[{v = Variables[#]},If[Exponent[#, v[[1]]] == 2 && Length[v] == 1, v[[1]], False]]`;
  const script = quadratic_function_script+" &[" + expr + "]";
  // console.log("EXPRESSION TO CLASSIFY: ",script );
  let result : string = await execute(script);
  // console.log("EXECUTE RESULTS",expr, result);
  return (result == "False") ? null : result;
}

export async function quadClassifierRule(tdoc: TDoc, style: StyleObject): Promise<StyleObject[]> {
  if (style.type != 'MATHEMATICA' || style.meaning != 'EVALUATION') { return []; }
  // console.log("INSIDE QUAD CLASSIFIER :",style);

  var isPlottableQuadratic;
  try {
    isPlottableQuadratic = await isExpressionPlottableQuadratic(style.data);
    // console.log("QUAD CLASSIFER SAYS:",isPlottableQuadratic);
  } catch (e) {
    console.error("MATHEMATICA EVALUATION FAILED :",e);
    return [];
  }

  var styles = [];
  if (isPlottableQuadratic) {
    var classification = tdoc.insertStyle(style, { type: 'CLASSIFICATION',
                                           data: isPlottableQuadratic,
                                           meaning: 'QUADRATIC',
                                           source: 'MATHEMATICA' });

    styles.push(classification);
  }
  return styles;
}
