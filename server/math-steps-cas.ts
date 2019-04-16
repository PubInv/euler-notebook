
// Requirements

import * as mathsteps from 'mathsteps';
import * as math from 'mathjs';

import { TDoc, Style, Thought }  from './tdoc';
import { Cas } from './open-tdoc';

// Types

export interface MathStep {
  changeType: string;
  oldNode: math.MathNode;
  newNode: math.MathNode;
//  oldEquation: mathsteps.Equation;
//  newEquation: mathsteps.Equation;
  substeps: MathStep[];
}

// Exported Interface

export const mathStepsCas: Cas = {
  onTDocOpened,
  onThoughtInserted,
  onStyleInserted,
}

async function onTDocOpened(_tDoc: TDoc): Promise<void> {
  // console.log("MathSteps onTDocOpened");
}

async function onThoughtInserted(_tDoc: TDoc, _thought: Thought): Promise<void> {
  // console.log(`MathSteps onThoughtInserted ${thought.id}`);
}

async function onStyleInserted(tDoc: TDoc, style: Style): Promise<void> {
  // console.log(`MathStep onStyleInserted ${style.id} ${style.stylableId} ${style.type} ${style.meaning}`);

  // Only try to simplify/solve MathJS expressions
  if (style.type != 'MATHJS' || style.meaning != 'INPUT') { return; }

  // if (tDoc.stylableHasChildOfType(style, 'MATHJS', 'SIMPLIFICATION-STEPS')) { return; }

  console.log("MATHSTEPS SIMPLIFY");
  const steps = mathsteps.simplifyExpression(style.data);
  dumpExpressionSteps(steps);

  console.log("MATHSTEPS SOLVE");
  // @ts-ignore // TYPESCRIPT:
  const steps2 = mathsteps.solveEquation(style.data);
  let equationStringStream = "";
  dumpEquationSteps((step) => equationStringStream =
                     equationStringStream + step + "\n",
                    steps2);
  // should we return the new style here? I suppose not.
//  const s1 =
  tDoc.insertTextStyle(style,equationStringStream,
                       'INDENTED',
                       'MATHSTEPS');
}

// WARNING: Input "a = 3/27","b = 6/27", "c = a + b" appears
// to cause an error here.
function dumpExpressionSteps(steps: MathStep[], level: number = 0) {
  const indent = '  '.repeat(level);
  if (steps.length == 0) { console.log(`${indent}NO STEPS`); }
  for (const step of steps) {
//    console.log("expression steps",step);
    console.log(`${indent}${step.changeType}`);
    if (step.oldNode) {
      console.log(`${indent}FROM: ${step.oldNode.toString()}`);
    }
    if (step.newNode) {
      console.log(`${indent}  TO: ${step.newNode.toString()}`);
    }
    console.log();
    if (step.substeps.length>0) { dumpExpressionSteps(step.substeps, level+1); }
  }
}
export function dumpEquationSteps(writer: (step: string) => void, steps: MathStep[], level: number = 0) {
  const indent = '  '.repeat(level);
  if (steps.length == 0) { console.log(`${indent}NO STEPS`); }
  for (const step of steps) {
//    console.log("Equational steps",step);
    console.log(`${indent}${step.changeType}`);
    writer(`${indent}${step.changeType}`);
    // @ts-ignore // TYPESCRIPT:
    if (step.oldEquation) {
    // @ts-ignore // TYPESCRIPT:
      console.log(`${indent}FROM: ${step.oldEquation.ascii()}`);
    // @ts-ignore // TYPESCRIPT:
      writer(`${indent}FROM: ${step.oldEquation.ascii()}`);
    }
    // @ts-ignore // TYPESCRIPT:
    if (step.newEquation) {
    // @ts-ignore // TYPESCRIPT:
      console.log(`${indent}  TO: ${step.newEquation.ascii()}`);
    // @ts-ignore // TYPESCRIPT:
      writer(`${indent}  TO: ${step.newEquation.ascii()}`);
    }
    console.log();
    if (step.substeps.length>0) { dumpEquationSteps(writer,step.substeps, level+1); }
  }
}
