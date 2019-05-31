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

import { NotebookChange, StyleObject, StyleProperties, RelationshipObject,
         ThoughtId,  ToolInfo, StyleSource, ToolMenu } from '../../client/math-tablet-api';
import { TDoc } from '../tdoc';
import { execute, constructSubstitution } from './wolframscript';
import { runAsync } from '../common';
import { Config } from '../config';
// import * as uuid from 'uuid-js';
// import uuid = require('uuid');
import { v4 as uuid } from 'uuid';

// Exports

export async function initialize(_config: Config): Promise<void> {
  debug(`initializing`);
  TDoc.on('open', (tDoc: TDoc)=>{
    tDoc.on('change', function(this: TDoc, change: NotebookChange){ onChange(this, change); });

    tDoc.on('useTool', function(this: TDoc, thoughtId: ThoughtId, source: StyleSource, info: ToolInfo){
      debug("RESPONDING UNTIL USETOOL");
      onUseTool(this, thoughtId, source, info);
    });

    tDoc.on('close', function(this: TDoc){ onClose(this); });
    onOpen(tDoc);
  });
}

// Private Functions

function onChange(tDoc: TDoc, change: NotebookChange): void {
  switch (change.type) {
  case 'styleInserted':
      runAsync(subtrivariateClassifierRule(tDoc, change.style), MODULE, 'subtrivariateClassifierRule');
    break;
  case 'relationshipInserted':
    runAsync(subTrivariateClassifierChangedRule(tDoc, change.relationship), MODULE, 'subTrivariateClassifierChangedRule');
    break;
  case 'relationshipDeleted':
    runAsync(subTrivariateClassifierChangedRule(tDoc, change.relationship), MODULE, 'subTrivariateClassifierChangedRule');
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

// Return "null" if it does not seem to be an expression , and the name
// of the variable (which must be unique to pass this test) if it is.
async function isExpressionSubTrivariate(expr : string,
                                              usedSymbols: StyleObject[])
: Promise<string[]|null> {
  const subtrivariate_function_script = `With[{v = Variables[#]},If[(Length[v] == 1) || (Length[v] == 2), v, False]]`;
  ;
  const sub_expr =
        constructSubstitution(expr,
                              usedSymbols.map(
                                s => ({ name: s.data.name,
                                        value: s.data.value})));

  const unwrapped_script = subtrivariate_function_script+" &[" + sub_expr + "]";
  const script = "runPrivate[" + unwrapped_script + "]";
  debug("EXPRESSION FOR CLASSIFIFYING: ",script );
  let result : string = await execute(script);
  if (result == "False") {
    return null;
  } else {
    let trimmed = result.replace(/\{|\}/g,"").split(",");
    trimmed = trimmed.map(s => s.trim());
    return trimmed;
  }
}



export async function subtrivariateClassifierRule(tdoc: TDoc, style: StyleObject): Promise<StyleObject[]> {
  if (style.type != 'MATHEMATICA' || style.meaning != 'EVALUATION') { return []; }
  // debug("INSIDE QUAD CLASSIFIER :",style);

  var isSubTrivariate;
  try {
    // here I attempt to find the dependency relationships....
    const rs = tdoc.getSymbolStylesIDependOn(style);
    debug("RS ",rs);
    // Now each member of rs should have a name and a value
    // that we should use in our quadratic classification....
    isSubTrivariate = await isExpressionSubTrivariate(style.data,rs);
    debug("SUBTRIVARIATE CLASSIFER SAYS:",isSubTrivariate);
  } catch (e) {
    debug("MATHEMATICA EVALUATION FAILED :",e);
    return [];
  }

  var styles = [];
  if (isSubTrivariate) {
    var classification = tdoc.insertStyle(style, { type: 'CLASSIFICATION',
                                                   data: isSubTrivariate,
                                                   meaning: 'SUBTRIVARIATE',
                                                   source: 'MATHEMATICA' });

    styles.push(classification);
    debug("STYLE ADDED XXX",style.id);
    const toolMenu: ToolMenu = [
      { name: 'plot',
        html: "Plot Subtrivariate (draft)",
        data: { styleId: classification.id }
      }
    ]
    const styleProps: StyleProperties = {
      type: 'TOOL-MENU',
      meaning: 'ATTRIBUTE',
      source: 'MATHEMATICA',
      data: toolMenu,
    }
    tdoc.insertStyle(style, styleProps);
  }
  return styles;
}

export async function subTrivariateClassifierChangedRule(tdoc: TDoc, relationship: RelationshipObject): Promise<void> {

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

  const beforeChangeClassifiedAsSubTrivariate = tdoc.stylableHasChildOfType(candidate_styles[0],'CLASSIFICATION','SUBTRIVARIATE');
  debug(beforeChangeClassifiedAsSubTrivariate);

  // Now it is possible that any classifications need to be removed;
  // it is also possible that that a new classification should be added.

  // A simple thing would be to rmove all classifications and regenerate.
  // However, we want to be as minimal as possible. I think we shold distinguish
  // the case: Either we are adding a UNIVARIATE-QUADRATIC, or disqalifying one.
  // So we should just check if this EVALAUTION is plottable. If so, we
  // should make sure one exists, by adding a CLASSIFICATION if it does not.
  // if one does exist, we whold remove it if we are not.
  const unique_style = candidate_styles[0];

  var isSubTrivariate;
  try {
    // here I attempt to find the dependency relationships....
    const rs = tdoc.getSymbolStylesIDependOn(unique_style);
    debug("RS ",rs);
    // Now each member of rs should have a name and a value
    // that we should use in our quadratic classification....
    isSubTrivariate = await isExpressionSubTrivariate(unique_style.data,rs);
    debug("SUBTRI CLASSIFER SAYS:",isSubTrivariate);
  } catch (e) {
    debug("MATHEMATICA EVALUATION FAILED :",e);
  }
  debug("IS PLOTTABLE",isSubTrivariate);
  debug("IS BEFOREQUDRATIC",beforeChangeClassifiedAsSubTrivariate);
  if (isSubTrivariate && !beforeChangeClassifiedAsSubTrivariate) {
    tdoc.insertStyle(unique_style, { type: 'CLASSIFICATION',
                                           data: isSubTrivariate,
                                           meaning: 'SUBTRIVARIATE',
                                           source: 'MATHEMATICA' });

  }
  if (!isSubTrivariate && beforeChangeClassifiedAsSubTrivariate) {
    debug("CHOOSING DELETION");
    const classifcations =
      tdoc.findChildStyleOfType(target_ancestor.id,'CLASSIFICATION','SUBTRIVARIATE');
    tdoc.deleteStyle(classifcations[0].id);
  }
}
async function plotSubtrivariate(expr : string, variables: string[], filename : string) : Promise<boolean> {
  debug("VARIABLES",variables);
  let plot_script =
   (variables.length == 1) ?
    `Export["${filename}",Plot[${expr},{${variables[0]},0,6 Pi}]]`
    :
    `Export["${filename}",Plot3D[${expr},{${variables[0]},0,6 Pi},{${variables[1]},0,6 Pi}]]`;
  debug("PLOT COMMAND SENT TO WOLFRAM",plot_script);
  await execute(plot_script);
  return true;
}


async function onUseTool(tDoc: TDoc, _thoughtId: ThoughtId, _source: StyleSource, info: ToolInfo):  Promise<void> {
  if (info.name != 'plot') return;
  debug("INSIDE onUSE AAA :");
  debug(`INSIDE onUSE AAA name : ${info.name}`);
  debug(`INSIDE onUSE AAA html : ${info.html}`);
  debug(`INSIDE onUSE AAA html : ${info.data.styleId}`);
  // I think this ID is the classification, which will be SUBTRIVARIATE.
  // Its data will hold hold the varialbes.
  debug("INSIDE onUSE quad-classifier PLOTTER :",info.data.styleId);

  const style = tDoc.getStyleById(info.data.styleId);

  // We neeed to find the SUBTRIVARIATE Style here in order
  // to get the variables list


  const targetPath = "./public/tmp";
  const urlPath = "/tmp";
  var uuid4 = uuid();
  debug(uuid4);
  const fn = "quadplot" + style.id + '-' + uuid4 + ".gif";
  const full_filename = targetPath + "/" + fn;

  // The parent of this style will be the MATHETMATICA/ EVALUATION
  const parent = tDoc.getStyleById(style.stylableId);

  // We are only plottable if we make the normal substitutions...
  const rs = tDoc.getSymbolStylesIDependOn(parent);
  debug("RS",rs);
  debug("STYLE DATA",style.data);
  var createdPlotSuccessfully;
  try {
    // Now style.data contains the variables in the expression "parent.data",
    // but the rs map may have allowed some to be defined, and these must
    // be removed.
    let variables: string[] = [];
    for(var s in style.data) {
      variables.push(style.data[s]);
    }

    debug("variables, pre-process",variables);
    const sub_expr =
          constructSubstitution(parent.data,
                                rs.map(
                                  s => {
                                    variables = variables.filter(ele => (
                                      ele != s.data.name));
                                    return { name: s.data.name,
                                             value: s.data.value};
                                  }
                                ));
    debug("variables, post-process",variables);

    createdPlotSuccessfully = await plotSubtrivariate(sub_expr,variables,full_filename);
    debug("PLOTTER SUCCESS SAYS:",createdPlotSuccessfully);
  } catch (e) {
    debug("MATHEMATICA QUAD PLOT FAILED :",e);
    return;
  }

  var styles = [];
  if (createdPlotSuccessfully) {
    // NOTE: I'm create a new thought here, which makes sense with
    // our current (5/29/2019) manifestationo of the GUI, which
    // does not elegantly render styles.  Making this independent
    // will look nice in the short term, but loses an important connection
    // between the systems.
    const th = tDoc.insertThought({}, -1);
    var imageStyle =
        tDoc.insertStyle(th,{ type: 'IMAGE',
                                 data: urlPath+"/"+fn,
                                 meaning: 'PLOT',
                                 source: 'MATHEMATICA' })
    styles.push(imageStyle);
  }
  return;

}
