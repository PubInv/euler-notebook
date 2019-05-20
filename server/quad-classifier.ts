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
const MODULE = __filename.split('/').slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

import { NotebookChange, StyleObject, RelationshipObject } from '../client/math-tablet-api';
import { TDoc } from './tdoc';
import { execute, constructSubstitution } from './wolframscript';
import { runAsync } from './common';
import { Config } from './config';

// Exports

export async function initialize(_config: Config): Promise<void> {
  debug(`initializing`);
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
    runAsync(quadClassifierRule(tDoc, change.style), MODULE, 'quadClassifierRule');
    break;
  case 'relationshipInserted':
    runAsync(quadClassifierChangedRule(tDoc, change.relationship), MODULE, 'quadClassifierChangedRule');
    break;
  default: break;
  }
}

function onClose(tDoc: TDoc): void {
  debug(`tDoc close: ${tDoc._path}`);
}

function onOpen(tDoc: TDoc): void {
  debug(`tDoc open: ${tDoc._path}`);
}


// Return "null" if it does not seem to be a quadratic, and the name
// of the variable (which must be unique to pass this test) if it is.
async function isExpressionPlottableQuadratic(expr : string,
                                              usedSymbols: StyleObject[])
: Promise<string|null> {

  // Note: Int he function below, I don't now why the second
  // [[1]] is needed; it appears that # is treated differently than
  // a literal?
  const quadratic_function_script = `With[{v = Variables[#]},If[(Length[v] == 1) && (Exponent[#, v[[1]]] == 2), v[[1]], False]]`;
  ;
  const sub_expr =
        constructSubstitution(expr,
                              usedSymbols.map(
                                s => ({ name: s.data.name,
                                        value: s.data.value})));
  // // now we construct the expr to include known
  // // substitutions of symbols....
  // const rules = usedSymbols.map(s => ` ${s.data.name} -> ${s.data.value}`);
  // debug("SUBSTITUIONS RULES",rules);
  // var sub_expr;
  // if (rules.length > 0) {
  //   const rulestring = rules.join(",");
  //   debug("RULESTRING",rulestring);
  //   sub_expr = expr + " /. " + "{ " + rulestring + " }";
  // } else {
  //   sub_expr = expr;
  // }
  // //  sub_expr = "runPrivate[" + sub_expr + "]";

  const unwrapped_script = quadratic_function_script+" &[" + sub_expr + "]";
  const script = "runPrivate[" + unwrapped_script + "]";
  debug("EXPRESSION FOR CLASSIFIFYING: ",script );
  let result : string = await execute(script);
  return (result == "False") ? null : result;
}


export async function quadClassifierRule(tdoc: TDoc, style: StyleObject): Promise<StyleObject[]> {
  if (style.type != 'MATHEMATICA' || style.meaning != 'EVALUATION') { return []; }
  // debug("INSIDE QUAD CLASSIFIER :",style);

  var isPlottableQuadratic;
  try {
    // here I attempt to find the dependency relationships....
    const rs = tdoc.getSymbolStylesIDependOn(style);
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
export async function quadClassifierChangedRule(tdoc: TDoc, relationship: RelationshipObject): Promise<void> {

  if (relationship.meaning != 'SYMBOL-DEPENDENCY') return;

  debug("RELATIONSHIP",relationship);

  const target_ancestor = tdoc.getAncestorThought(relationship.targetId);

  if (target_ancestor == null) {
    throw new Error("Could not find ancestor Thought: "+relationship.targetId);
  }

  // now we want to find any potentially (re)classifiable style on
  // this ancestor thought...

  const candidate_styles =
        tdoc.findChildStyleOfType(target_ancestor.id,'MATHEMATICA','EVALUATION');
  debug("candidate styles",candidate_styles);
  // Not really sure what to do here if there is more than one!!!

  const beforeChangeClassifiedAsQuadratic = tdoc.stylableHasChildOfType(candidate_styles[0],'CLASSIFICATION','QUADRATIC');
  debug(beforeChangeClassifiedAsQuadratic);

  // Now it is possible that any classifications need to be removed;
  // it is also possible that that a new classification should be added.

  // A simple thing would be to rmove all classifications and regenerate.
  // However, we want to be as minimal as possible. I think we shold distinguish
  // the case: Either we are adding a QUADRATIC, or disqalifying one.
  // So we should just check if this EVALAUTION is plottable. If so, we
  // should make sure one exists, by adding a CLASSIFICATION if it does not.
  // if one does exist, we whold remove it if we are not.
  const unique_style = candidate_styles[0];

  var isPlottableQuadratic;
  try {
    // here I attempt to find the dependency relationships....
    const rs = tdoc.getSymbolStylesIDependOn(unique_style);
    debug("RS ",rs);
    // Now each member of rs should have a name and a value
    // that we should use in our quadratic classification....
    isPlottableQuadratic = await isExpressionPlottableQuadratic(unique_style.data,rs);
     debug("QUAD CLASSIFER SAYS:",isPlottableQuadratic);
  } catch (e) {
    debug("MATHEMATICA EVALUATION FAILED :",e);
  }
  if (isPlottableQuadratic && !beforeChangeClassifiedAsQuadratic) {
    tdoc.insertStyle(unique_style, { type: 'CLASSIFICATION',
                                           data: isPlottableQuadratic,
                                           meaning: 'QUADRATIC',
                                           source: 'MATHEMATICA' });

  }
  if (!isPlottableQuadratic && beforeChangeClassifiedAsQuadratic) {
    const classifcations =
          tdoc.findChildStyleOfType(target_ancestor.id,'CLASSIFICATION','QUADRATIC');
    tdoc.deleteStyle(classifcations[0].id);
  }
}
