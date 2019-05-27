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
import * as mathsteps from 'mathsteps';
import * as math from 'mathjs';

import { StyleObject, NotebookChange } from '../../client/math-tablet-api';
import { TDoc }  from '../tdoc';
import { Config } from '../config';

// Types

export interface ExpressionStep {
  changeType: string;
  oldNode: math.MathNode;
  newNode: math.MathNode;
  substeps: ExpressionStep[];
}

export interface EquationStep {
  changeType: string;
  oldEquation: any; // TYPESCRIPT: mathsteps.Equation;
  newEquation: any; // TYPESCRIPT: mathsteps.Equation;
  substeps: EquationStep[];
}

// Exported Functions

export async function initialize(_config: Config): Promise<void> {
  debug(`initializing`);
  TDoc.on('open', (tDoc: TDoc)=>{
    tDoc.on('change', function(this: TDoc, change: NotebookChange){ onChange(this, change); });
    // tDoc.on('close', function(this: TDoc){ onClose(this); });
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

// Change Handlers

async function chStyleInserted(tDoc: TDoc, style: StyleObject): Promise<void> {
  debug(`onStyleInserted ${style.id} ${style.stylableId} ${style.type} ${style.meaning}`);

  // Only try to simplify/solve MathJS expressions
  if (style.type!='MATHJS') { return; }
  if (style.meaning!='INPUT' && style.meaning!='INPUT-ALT') { return; }

  const steps: ExpressionStep[] = mathsteps.simplifyExpression(style.data);
  if (steps.length > 0) {
    const data = formatExpressionSteps(steps);
    // console.dir(data);
    tDoc.insertStyle(style, { type: 'TEXT', data, meaning: 'INDENTED', source: 'MATHSTEPS' });
  }

  const steps2: EquationStep[] = mathsteps.solveEquation(style.data);
  if (steps2.length > 0) {
    const data = formatEquationSteps(steps2);
    // console.dir(data);
    tDoc.insertStyle(style, { type: 'TEXT', data, meaning: 'INDENTED', source: 'MATHSTEPS' });
  }
}

// Helper Functions

// WARNING: Input "a = 3/27","b = 6/27", "c = a + b" appears
// to cause an error here.

function formatExpressionStep(step: ExpressionStep, level: number): string {
  const indent = '  '.repeat(level);
  let rval = `${indent}${step.changeType}\n`;
  if (step.oldNode) {
    rval += `${indent}FROM: ${step.oldNode.toString()}\n`;
  }
  if (step.newNode) {
    rval += `${indent}  TO: ${step.newNode.toString()}\n`;
  }
  if (step.substeps.length>0) {
    rval += formatExpressionSteps(step.substeps, level+1);
  }
  return rval;
}

function formatExpressionSteps(steps: ExpressionStep[], level: number = 0): string {
  const indent = '  '.repeat(level);
  let rval: string;
  if (steps.length == 0) {
    rval = `${indent}NO STEPS`;
  } else {
    rval = '';
    for (const step of steps) {
      rval += formatExpressionStep(step, level);
    }
  }
  return rval;
}

function formatEquationStep(step: EquationStep, level: number): string {
  const indent = '  '.repeat(level);
  let rval:string = `${indent}${step.changeType}\n`;
  if (step.oldEquation) {
    rval += `${indent}FROM: ${step.oldEquation.ascii()}\n`;
  }
  if (step.newEquation) {
    rval += `${indent}  TO: ${step.newEquation.ascii()}\n`;
  }
  if (step.substeps.length>0) {
    rval += formatEquationSteps(step.substeps, level+1);
  }
  return rval;
}

function formatEquationSteps(steps: EquationStep[], level: number = 0): string {
  const indent = '  '.repeat(level);
  let rval: string;
  if (steps.length == 0) {
    rval = `${indent}NO STEPS\n`;
  } else {
    rval = '';
    for (const step of steps) {
      rval += formatEquationStep(step, level);
    }
  }
  return rval;
}
