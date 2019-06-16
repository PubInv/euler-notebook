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
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);
import * as mathsteps from 'mathsteps';
import * as math from 'mathjs';

import { StyleObject, NotebookChange, ToolMenu, StyleProperties, StyleId, StyleSource, ToolInfo } from '../../client/math-tablet-api';
import { TDoc }  from '../tdoc';
import { Config } from '../config';

// Types

export interface Step {
  changeType: string;
  newEquation?: any; // TYPESCRIPT: mathsteps.Equation;
  newNode?: math.MathNode;
  oldEquation?: any; // TYPESCRIPT: mathsteps.Equation;
  oldNode?: math.MathNode;
  substeps: Step[];
}

// Constants

// Exported Functions

export async function initialize(_config: Config): Promise<void> {
  debug(`initializing`);
  TDoc.on('open', (tDoc: TDoc)=>{
    tDoc.on('change', function(this: TDoc, change: NotebookChange){ onChange(this, change); });
    // tDoc.on('close', function(this: TDoc){ onClose(this); });
    tDoc.on('useTool', function(this: TDoc, styleId: StyleId, source: StyleSource, info: ToolInfo){
      onUseTool(this, styleId, source, info);
    });
    // onOpen(tDoc);
  });
}

// Event Handler Functions

function onChange(tDoc: TDoc, change: NotebookChange): void {
  switch (change.type) {
  case 'styleInserted': chStyleInserted(tDoc, change.style); break;
  default: break;
  }
}

function onUseTool(tDoc: TDoc, _styleId: StyleId, _source: StyleSource, info: ToolInfo): void {
  // DAVID: I think we may want to refactor this so that
  // we attache a "thunk" to the tool. In any case it is a little weired
  // to use an emmitter, because it means "onUseTool" is called for
  // Tools that were not created in this file.  I have therefore added
  // the line below, which essentially says "If I am not a 'steps' tool, do nothing.
  if (info.name != 'steps') return;
  const style = tDoc.getStyleById(info.data.styleId);
  const steps: Step[] = (info.data.expr ?
                          mathsteps.simplifyExpression(style.data) :
                          mathsteps.solveEquation(style.data));
  const data: string = `<pre>\n${formatSteps(steps)}</pre>`;
  tDoc.insertStyle(undefined, { type: 'HTML', meaning: 'EXPOSITION', source: 'MATHSTEPS', data }, -1);
  // TODO: Add a relationship between this thought and the original thought.
  // TODO: If original thought changes, then remove/update this simplification.
}

// Change Handlers

async function chStyleInserted(tDoc: TDoc, style: StyleObject): Promise<void> {
  debug(`onStyleInserted ${style.id} ${style.parentId} ${style.type} ${style.meaning}`);

  // Only try to simplify/solve MathJS expressions
  if (style.type!='MATHJS') { return; }
  if (style.meaning!='INPUT' && style.meaning!='INPUT-ALT') { return; }

  // Try to simplify it as an expression
  const steps: Step[] = mathsteps.simplifyExpression(style.data);
  if (steps.length > 0) {

    const parentStyle = (style.meaning == 'INPUT' ? style : tDoc.getStyleById(style.parentId));
    const toolMenu: ToolMenu = [
      { name: 'steps', html: 'Steps', data: { expr: true, styleId: style.id }}
    ];
    const styleProps: StyleProperties = {
      type: 'TOOL-MENU',
      meaning: 'ATTRIBUTE',
      source: 'MATHSTEPS',
      data: toolMenu,
    };
    tDoc.insertStyle(parentStyle, styleProps);
  } else {

    // Doesn't simplify as expression. Try to solve it as an equation.
    const steps2: Step[] = mathsteps.solveEquation(style.data);
    if (steps2.length > 0) {
      const parentStyle = (style.meaning == 'INPUT' ? style : tDoc.getStyleById(style.parentId));
      const toolMenu: ToolMenu = [
        { name: 'steps', html: 'Steps', data: { expr: false, styleId: style.id }}
      ];
      const styleProps: StyleProperties = {
        type: 'TOOL-MENU',
        meaning: 'ATTRIBUTE',
        source: 'MATHSTEPS',
        data: toolMenu,
      };
      tDoc.insertStyle(parentStyle, styleProps);
    }
  }
}

// Helper Functions

// WARNING: Input "a = 3/27","b = 6/27", "c = a + b" appears
// to cause an error here.

function formatStep(step: Step, level: number): string {
  const indent = '  '.repeat(level);
  let rval = `${indent}${step.changeType}\n`;
  if (step.oldNode) {
    rval += `${indent}FROM: ${step.oldNode.toString()}\n`;
  }
  if (step.oldEquation) {
    rval += `${indent}FROM: ${step.oldEquation.ascii()}\n`;
  }
  if (step.newNode) {
    rval += `${indent}  TO: ${step.newNode.toString()}\n`;
  }
  if (step.newEquation) {
    rval += `${indent}  TO: ${step.newEquation.ascii()}\n`;
  }
  if (step.substeps.length>0) {
    rval += formatSteps(step.substeps, level+1);
  }
  return rval;
}

function formatSteps(steps: Step[], level: number = 0): string {
  const indent = '  '.repeat(level);
  let rval: string;
  if (steps.length == 0) {
    rval = `${indent}NO STEPS`;
  } else {
    rval = '';
    for (const step of steps) {
      rval += formatStep(step, level);
    }
  }
  return rval;
}
