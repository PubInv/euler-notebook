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
import { TDoc  } from './tdoc';
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
    console.log(`QuadPlotter tDoc ${tDoc._path}/${change.type} change: `);
    quadPlotterRule(tDoc, change.style).catch(
      (err)=>{ console.error(`Error applying mathMathematicaRule: ${err.message}`); });
    break;
  default: break;
  }
}

function onClose(tDoc: TDoc): void {
  console.log(`QuadPlotter tDoc close: ${tDoc._path}`);
}

function onOpen(tDoc: TDoc): void {
  console.log(`QuadPlotter: tDoc open: ${tDoc._path}`);
}

async function plotQuadratic(expr : string, variable: string, filename : string) : Promise<boolean> {
  // Mathematica offers various ways to deal with this:
  // https://reference.wolfram.com/language/tutorial/FindingTheStructureOfAPolynomial.html
  // I believe this is a good invocation of an anonymous function
  /*
With[{v = Variables[#]},
 Exponent[#, v[[1]]] == 2 && Length[v] == 1] &[x^2+x]
With[{v = Variables[#1]},
 Export[#2,Plot[#1,{v[[1]],0,6 Pi}]]]
  */
  const univariate_plot_script =
        `Export["${filename}",Plot[${expr},{${variable},0,6 Pi}]]`;
  console.log("PLOT COMMAND SENT TO WOLFRAM",univariate_plot_script);
  await execute(univariate_plot_script);
  return true;
}

export async function quadPlotterRule(tdoc: TDoc, style: StyleObject): Promise<StyleObject[]> {
  if (style.type != 'CLASSIFICATION' || style.meaning != 'QUADRATIC') { return []; }
  console.log("INSIDE QUAD PLOTTER :",style);
  const targetPath = "./public/tmp";
  const urlPath = "/tmp";
  const fn = "quadplot" + style.id + ".gif";
  const full_filename = targetPath + "/" + fn;

  const parent = <StyleObject>tdoc.getStylable(style.stylableId);

  var createdPlotSuccessfully;
  try {
    // In this case, the style.data is the variable name...
    createdPlotSuccessfully = await plotQuadratic(parent.data,style.data,full_filename);
    console.log("PLOTTER SUCCESS SAYS:",createdPlotSuccessfully);
  } catch (e) {
    console.log("MATHEMATICA QUAD PLOT FAILED :",e);
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
