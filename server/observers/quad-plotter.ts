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

import { NotebookChange, StyleObject } from '../../client/math-tablet-api';
import { TDoc  } from '../tdoc';
import { execute, constructSubstitution } from './wolframscript';
import { runAsync } from '../common';
import { Config } from '../config';

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
      tDoc;
      runAsync;
//      runAsync(quadPlotterRule(tDoc, change.style), MODULE, 'quadPlotterRule');
//      runAsync(plotterRule(tDoc, change.style), MODULE, 'quadPlotterRule');
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


async function plotQuadratic(expr : string, variable: string, filename : string) : Promise<boolean> {
  const univariate_plot_script =
        `Export["${filename}",Plot[${expr},{${variable},0,6 Pi}]]`;
  debug("PLOT COMMAND SENT TO WOLFRAM",univariate_plot_script);
  await execute(univariate_plot_script);
  return true;
}

export async function quadPlotterRule(tdoc: TDoc, style: StyleObject): Promise<StyleObject[]> {
  if (style.type != 'CLASSIFICATION' || style.meaning != 'UNIVARIATE-QUADRATIC') { return []; }
  debug("INSIDE QUAD PLOTTER :",style);
  const targetPath = "./public/tmp";
  const urlPath = "/tmp";
  const fn = "quadplot" + style.id + ".gif";
  const full_filename = targetPath + "/" + fn;

  const parent = <StyleObject>tdoc.getStylable(style.stylableId);

  // We are only plottable if we make the normal substitutions...
  const rs = tdoc.getSymbolStylesIDependOn(parent);
  var createdPlotSuccessfully;
  try {
    // In this case, the style.data is the variable name...

    const sub_expr =
          constructSubstitution(parent.data,
                                rs.map(
                                  s => ({ name: s.data.name,
                                          value: s.data.value})));

    createdPlotSuccessfully = await plotQuadratic(sub_expr,style.data,full_filename);
    debug("PLOTTER SUCCESS SAYS:",createdPlotSuccessfully);
  } catch (e) {
    debug("MATHEMATICA QUAD PLOT FAILED :",e);
    return [];
  }

  var styles = [];
  if (createdPlotSuccessfully) {
    var imageStyle =
        tdoc.insertStyle(style,{ type: 'IMAGE',
                                 data: urlPath+"/"+fn,
                                 meaning: 'PLOT',
                                 source: 'MATHEMATICA' })
    styles.push(imageStyle);
  }
  return styles;
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


export async function plotterRule(tdoc: TDoc, style: StyleObject): Promise<StyleObject[]> {
  if (style.type != 'CLASSIFICATION' || style.meaning != 'SUBTRIVARIATE') { return []; }
  debug("INSIDE PLOTTER :",style);
  const targetPath = "./public/tmp";
  const urlPath = "/tmp";
  const fn = "quadplot" + style.id + ".gif";
  const full_filename = targetPath + "/" + fn;

  const parent = <StyleObject>tdoc.getStylable(style.stylableId);

  // We are only plottable if we make the normal substitutions...
  const rs = tdoc.getSymbolStylesIDependOn(parent);
  var createdPlotSuccessfully;
  try {
    // In this case, the style.data is the variable name...

    const sub_expr =
          constructSubstitution(parent.data,
                                rs.map(
                                  s => ({ name: s.data.name,
                                          value: s.data.value})));

    createdPlotSuccessfully = await plotSubtrivariate(sub_expr,style.data,full_filename);
    debug("PLOTTER SUCCESS SAYS:",createdPlotSuccessfully);
  } catch (e) {
    debug("MATHEMATICA QUAD PLOT FAILED :",e);
    return [];
  }

  var styles = [];
  if (createdPlotSuccessfully) {
    var imageStyle =
        tdoc.insertStyle(style,{ type: 'IMAGE',
                                 data: urlPath+"/"+fn,
                                 meaning: 'PLOT',
                                 source: 'MATHEMATICA' })
    styles.push(imageStyle);
  }
  return styles;
}
