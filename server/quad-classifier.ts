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

import * as debug1 from 'debug';
const debug = debug1('server:quad-classifier');

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
  debug(`QuadClassifier tDoc close: ${tDoc._path}`);
}

function onOpen(tDoc: TDoc): void {
  debug(`QuadClassifier: tDoc open: ${tDoc._path}`);
}

// Return "null" if it does not seem to be a quadratic, and the name
// of the variable (which must be unique to pass this test) if it is.
async function isExpressionPlottableQuadratic(expr : string,
                                              usedSymbols: StyleObject[])
: Promise<string|null> {

  const quadratic_function_script = `With[{v = Variables[#]},If[Exponent[#, v[[1]]] == 2 && Length[v] == 1, v[[1]], False]]`;

  // now we construct the expr to include known
  // substitutions of symbols....
  const rules = usedSymbols.map(s => `{ ${s.data.name} -> ${s.data.value}}`);
  debug("SUBSTITUIONS RULES",rules);
  var sub_expr;
  if (rules.length > 0) {
    const rulestring = rules.join(",");
    debug("RULESTRING",rulestring);
    sub_expr = expr + " /. " + "{ " + rulestring + " }";
  } else {
    sub_expr = expr;
  }
  debug("EXPRESSION TO CLASSIFY: ",sub_expr );
  const script = quadratic_function_script+" &[" + sub_expr + "]";
  let result : string = await execute(script);
  return (result == "False") ? null : result;
}

// Return all StyleObjects which are Symbols for which
// the is a Symbol Dependency relationship with this
// object as the the target
// Note: The defintion is the "source" of the relationship
// and the "use" is "target" of the relationship.
function getSymbolStylesIDependOn(tdoc: TDoc, style:StyleObject): StyleObject[] {
  // simplest way to do this is to iterate over all relationships,
  // computing the source and target thoughts. If the target thought
  // is the same as our ancestor thought, then we return the
  // source style, which should be of type Symbol and meaning Definition.
  const rs = tdoc.getRelationships();
  var symbolStyles: StyleObject[] = [];
  const mp = tdoc.getAncestorThought(style.id);
  if (!mp) {
    console.error("INTERNAL ERROR: did not produce ancenstor: ",style.id);
    throw new Error("INTERNAL ERROR: did not produce ancenstor: ");
  }
  rs.forEach(r => {
    const rp = tdoc.getAncestorThought(r.targetId);
    if (!rp) {
      console.error("INTERNAL ERROR: did not produce ancenstor: ",style.id);
      throw new Error("INTERNAL ERROR: did not produce ancenstor: ");
    }
    if (rp.id == mp.id) {
      // We are a user of this definition...
      symbolStyles.push(<StyleObject>tdoc.getStylable(r.sourceId));
    }
  });
  return symbolStyles;
}

export async function quadClassifierRule(tdoc: TDoc, style: StyleObject): Promise<StyleObject[]> {
  if (style.type != 'MATHEMATICA' || style.meaning != 'EVALUATION') { return []; }
  // debug("INSIDE QUAD CLASSIFIER :",style);

  var isPlottableQuadratic;
  try {
    // here I attempt to find the dependency relationships....
    const rs = getSymbolStylesIDependOn(tdoc,style);
    debug("RS ",rs);
    // Now each member of rs should have a name and a value
    // that we should use in our quadratic classification....
    isPlottableQuadratic = await isExpressionPlottableQuadratic(style.data,rs);
    // debug("QUAD CLASSIFER SAYS:",isPlottableQuadratic);
  } catch (e) {
    debug("MATHEMATICA EVALUATION FAILED :",e);
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
