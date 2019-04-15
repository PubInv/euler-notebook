
// Requirements

import * as mathsteps from 'mathsteps';
import * as math from 'mathjs';

import { TDoc, Style, Thought }  from './tdoc';
import { Cas } from './open-tdoc';

// Types

interface MathStep {
  changeType: string;
  oldNode: math.MathNode;
  newNode: math.MathNode;
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

async function onStyleInserted(_tDoc: TDoc, style: Style): Promise<void> {
  // console.log(`MathStep onStyleInserted ${style.id} ${style.stylableId} ${style.type} ${style.meaning}`);

  // Only try to simplify/solve MathJS expressions
  if (style.type != 'MATHJS' || style.meaning != 'INPUT') { return; }

  // if (tDoc.stylableHasChildOfType(style, 'MATHJS', 'SIMPLIFICATION-STEPS')) { return; }

  console.log("MATHSTEPS SIMPLIFY");
  const steps = mathsteps.simplifyExpression(style.data);
  dumpMathSteps(steps);

  console.log("MATHSTEPS SOLVE");
  const steps2 = mathsteps.solveEquation(style.data);
  dumpMathSteps(steps2);
}

function dumpMathSteps(steps: MathStep[], level: number = 0) {
  const indent = '  '.repeat(level);
  if (steps.length == 0) { console.log(`${indent}NO STEPS`); }
  for (const step of steps) {
    console.log(`${indent}${step.changeType}`);
    // if (step.oldNode) {
      console.log(`${indent}FROM: ${step.oldNode.toString()}`);
    // }
    // if (step.newNode) {
      console.log(`${indent}  TO: ${step.newNode.toString()}`);
    // }
    console.log();
    if (step.substeps.length>0) { dumpMathSteps(step.substeps, level+1); }
  }
}