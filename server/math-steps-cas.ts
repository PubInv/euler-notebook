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

import * as mathsteps from 'mathsteps';
import * as math from 'mathjs';

import { TDoc, TDocChange, Style }  from './tdoc';

// Types

export interface MathStep {
  changeType: string;
  oldNode: math.MathNode;
  newNode: math.MathNode;
//  oldEquation: mathsteps.Equation;
//  newEquation: mathsteps.Equation;
  substeps: MathStep[];
}

// Exported Functions

export async function initialize(): Promise<void> {
  TDoc.on('open', (tDoc: TDoc)=>{
    tDoc.on('change', function(this: TDoc, change: TDocChange){ onChange(this, change); });
    // tDoc.on('close', function(this: TDoc){ onClose(this); });
    // onOpen(tDoc);
  });
}

// Event Handler Functions

function onChange(tDoc: TDoc, change: TDocChange): void {
  switch (change.type) {
  case 'styleInserted':
    console.log(`MathSteps tDoc ${tDoc._name}/${change.type} change: `);
    onStyleInserted(tDoc, change.style);
    break;
  default:
    console.log(`MathSteps tDoc ignored change: ${tDoc._name} ${(<any>change).type}`);
    break;
  }
}

// Helper Functions

async function onStyleInserted(tDoc: TDoc, style: Style): Promise<void> {
  // console.log(`MathStep onStyleInserted ${style.id} ${style.stylableId} ${style.type} ${style.meaning}`);

  // Only try to simplify/solve MathJS expressions
  if (style.type != 'MATHJS' || style.meaning != 'INPUT') { return; }

  // if (tDoc.stylableHasChildOfType(style, 'MATHJS', 'SIMPLIFICATION-STEPS')) { return; }

  const steps = mathsteps.simplifyExpression(style.data);
  let expressionStringStream = "";
  dumpExpressionSteps((step) => expressionStringStream =
                      expressionStringStream + step + "\n",
                      steps);

  if (steps.length > 0) {
    let expressionStringStream = "";
    dumpExpressionSteps((step) => expressionStringStream =
                      expressionStringStream + step + "\n",
                      steps);

    // should we return the new style here? I suppose not.
    tDoc.insertTextStyle(style, expressionStringStream, 'INDENTED', 'MATHSTEPS');

  }
  // @ts-ignore // TYPESCRIPT:
  const steps2 = mathsteps.solveEquation(style.data);
  if (steps2.length > 0) {
    let equationStringStream = "";
    dumpEquationSteps((step) => equationStringStream =
                      equationStringStream + step + "\n",
                      steps2);

    // should we return the new style here? I suppose not.
    tDoc.insertTextStyle(style, equationStringStream, 'INDENTED', 'MATHSTEPS');
  }
}

// WARNING: Input "a = 3/27","b = 6/27", "c = a + b" appears
// to cause an error here.
export function dumpExpressionSteps(writer: (step: string) => void,
                                    steps: MathStep[],
                                    level: number = 0) {
  const indent = '  '.repeat(level);
  if (steps.length == 0) {
    writer(`${indent}NO STEPS`);
  }
  for (const step of steps) {
    writer(`${indent}${step.changeType}`);
    if (step.oldNode) {
      writer(`${indent}FROM: ${step.oldNode.toString()}`);
    }
    if (step.newNode) {
      writer(`${indent}  TO: ${step.newNode.toString()}`);
    }
    if (step.substeps.length>0) {
      dumpExpressionSteps(writer,step.substeps, level+1);
    }
  }
}
export function dumpEquationSteps(writer: (step: string) => void,
                                  steps: MathStep[],
                                  level: number = 0) {
  const indent = '  '.repeat(level);
  if (steps.length == 0) {
    writer(`${indent}NO STEPS`);
  }
  for (const step of steps) {
    writer(`${indent}${step.changeType}`);
    // @ts-ignore // TYPESCRIPT:
    if (step.oldEquation) {
    // @ts-ignore // TYPESCRIPT:
      writer(`${indent}FROM: ${step.oldEquation.ascii()}`);
    }
    // @ts-ignore // TYPESCRIPT:
    if (step.newEquation) {
    // @ts-ignore // TYPESCRIPT:
      writer(`${indent}  TO: ${step.newEquation.ascii()}`);
    }
    if (step.substeps.length>0) {
      dumpEquationSteps(writer,step.substeps, level+1);
    }
  }
}
