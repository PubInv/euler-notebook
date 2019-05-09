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

import { StyleObject } from '../client/math-tablet-api';
import { TDoc, TDocChange } from './tdoc';
import { execute } from './wolframscript';

// Exports

export async function initialize(): Promise<void> {
  TDoc.on('open', (tDoc: TDoc)=>{
    tDoc.on('change', function(this: TDoc, change: TDocChange){ onChange(this, change); });
    tDoc.on('close', function(this: TDoc){ onClose(this); });
    onOpen(tDoc);
  });
}

// Private Functions

function onChange(tDoc: TDoc, change: TDocChange): void {
  switch (change.type) {
  case 'styleDeleted':
    console.log(`QuadClassifier tDoc ${tDoc._path}/${change.type} change: `);
    break;
  case 'styleInserted':
    console.log(`QuadClassifier tDoc ${tDoc._path}/${change.type} change: `);
    quadClassifierRule(tDoc, change.style);
    break;
  case 'thoughtDeleted':
    console.log(`QuadClassifier tDoc ${tDoc._path}/${change.type} change: `);
    break;
  case 'thoughtInserted':
    console.log(`QuadClassifier tDoc ${tDoc._path}/${change.type} change: `);
    break;
  default:
    console.log(`QuadClassifier tDoc unknown change: ${tDoc._path} ${(<any>change).type}`);
    break;
  }
}

function onClose(tDoc: TDoc): void {
  console.log(`QuadClassifier tDoc close: ${tDoc._path}`);
}

function onOpen(tDoc: TDoc): void {
  console.log(`QuadClassifier: tDoc open: ${tDoc._path}`);
}

async function isExpressionPlottableQuadratic(expr : string) : Promise<boolean> {
  // Mathematica offers various ways to deal with this:
  // https://reference.wolfram.com/language/tutorial/FindingTheStructureOfAPolynomial.html
  // I believe this is a good invocation of an anonymous function
  /*
With[{v = Variables[#]},
 Exponent[#, v[[1]]] == 2 && Length[v] == 1] &[x^2+x]
  */
  const quadratic_function_script = `With[{v = Variables[#]},
 Exponent[#, v[[1]]] == 2 && Length[v] == 1]`;
  let result : string = await execute(quadratic_function_script+"&[" + expr + "]");
  console.log("EXECUTE RESULTS",expr, result);
  return result == "True";
}

export async function quadClassifierRule(tdoc: TDoc, style: StyleObject): Promise<StyleObject[]> {
  if (style.type != 'MATHEMATICA' || style.meaning != 'EVALUATION') { return []; }
  console.log("INSIDE QUAD CLASSIFIER :",style);


  var isPlottableQuadratic;
  try {
    isPlottableQuadratic = await isExpressionPlottableQuadratic(style.data);
    console.log("QUAD CLASSIFER SAYS:",isPlottableQuadratic);
  } catch (e) {
    console.log("MATHEMATICA EVALUATION FAILED :",e);
    return [];
  }

  var styles = [];
  if (isPlottableQuadratic) {
    var classification = tdoc.insertStyle(style, { type: 'CLASSIFICATION',
                                           data: true,
                                           meaning: 'QUADRATIC',
                                           source: 'MATHEMATICA' });

    styles.push(classification);
  }
  return styles;
}
