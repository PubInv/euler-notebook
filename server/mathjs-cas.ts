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

import * as math from 'mathjs';

import { LatexMath, MathJsText } from '../client/math-tablet-api';
import { Change as TDocChange, TDoc, Style }  from './tdoc';

// Types

type StyleRule = (tdoc: TDoc, style: Style)=>Style[];

export interface ParseResults {
  latexMath: LatexMath;
  mathJsText: MathJsText;
}

// Exported Functions

export async function initialize(): Promise<void> {
  TDoc.on('open', (tDoc: TDoc)=>{
    tDoc.on('change', function(this: TDoc, change: TDocChange){ onChange(this, change); });
    // tDoc.on('close', function(this: TDoc){ onClose(this); });
    // onOpen(tDoc);
  });
}

export function parseMathJsExpression(s: string): ParseResults {
  const node = math.parse(s);
  return { mathJsText: node.toString(), latexMath: node.toTex() };
}

// Event Handler Functions

function onChange(tDoc: TDoc, change: TDocChange): void {
  switch (change.type) {
  case 'styleInserted':
    console.log(`MathJs tDoc ${tDoc._name}/${change.type} change: `);
    mathExtractVariablesRule(tDoc, change.style);
    mathEvaluateRule(tDoc, change.style);
    mathSimplifyRule(tDoc, change.style);
      break;
  default:
    console.log(`MathJs tDoc ignored change: ${tDoc._name} ${(<any>change).type}`);
    break;
  }
}

// Helper Functions
// (Some are exported for unit testing)

// Traverses the MathJS expression tree, finds any symbol nodes,
// and returns an array of all of the symbols found.
function collectSymbols(node: math.MathNode) : string[] {
  var symbols: string[] = [];
  node.traverse(function (node, _path, _parent) {
    if (node.type == 'SymbolNode') {
      symbols.push(node.name || "Unknown node");
    }
  });
  return symbols;
}

// the evaluator actually has a very complex type which I will
// not attempt to type. To use this rule, create a thunk that supplies the
// evaluator. This allows the evaluator to retain state. The fact that
// the rules are not applied in any order or repetitively makes the operation
// of this haphazard at present; that will create mysterious errors if we
// don't fix it. -- rlr

export function mathEvaluateRule(tdoc: TDoc, style: Style): Style[] {
  // This provides a terrible lack of control over the parser;
  // we cannot, for example, sensibly clear the parser. This should
  // probably be rethought.

  // I need to add clientData to the deserialization, I guess.
  if (!tdoc._clientData) tdoc._clientData = {};
  if (!tdoc._clientData.mathEvaluateRule) {
    tdoc._clientData.mathEvaluateRule = math.parser();
  }
  const parser = tdoc._clientData.mathEvaluateRule;

  // We only evaluate MathJS expressions that are user input.
  if (style.type != 'MATHJS' || style.meaning != 'INPUT') {
    return [];
  }

  // Do not evaluate more than once.
  if ((tdoc.stylableHasChildOfType(style, 'MATHJS', "EVALUATION")) ||
      (tdoc.stylableHasChildOfType(style, 'TEXT', "EVALUATION-ERROR"))) {
    return [];
  }

  let e;
  try {
    e = (parser) ? parser.eval(style.data) : math.eval(style.data);
  } catch (err) {
    console.log("error in eval", style.data, err.messsage);
    const firstLine = err.message;
    let st = tdoc.insertTextStyle(style, firstLine, "EVALUATION-ERROR", 'MATHJS');
    return [st];
  }

  if (typeof e != 'number') return [];

  // REVIEW: Should we introduce a number style?
  let eString = ""+ e;
  let st = tdoc.insertMathJsStyle(style, eString, "EVALUATION", 'MATHJS');

  return [st];
}

export function mathExtractVariablesRule(tdoc: TDoc, style: Style): Style[] {
  // We only extract symbols from MathJS expressions that are user input.
  if (style.type != 'MATHJS' || style.meaning != 'INPUT') { return []; }

  // Do not extract symbols more than once.
  if (tdoc.stylableHasChildOfType(style, 'MATHJS', 'SYMBOL')) { return []; }

  const parse = math.parse(style.data);
  if (!parse) return [];

  const symbolNodes = collectSymbols(parse);
  const styles =  symbolNodes.map(s => tdoc.insertMathJsStyle(style, s, 'SYMBOL', 'MATHJS'));
  return styles;
}

// Attempt math.js-based simplification
export function mathSimplifyRule(tdoc: TDoc, style: Style): Style[] {
  // We only apply MathJS simplifications so MathJS styles that are user input.
  if (style.type != 'MATHJS' || style.meaning != 'INPUT') { return []; }

  // Do not apply simplification more than once.
  if (tdoc.stylableHasChildOfType(style, 'MATHJS', 'SIMPLIFICATION')) { return []; }

  let simpler;
  try {
    simpler = math.simplify(style.data);
  } catch {
    // This is useful for debugging, but it is not error to fail to
    // be able to simplify something.
    //    console.log("math.simplify failed on", style.data);
    return [];
  }
  if (!simpler) { return []; }

  // If the simplification hasn't changed anything then don't add it.
  const simplerText = simpler.toString();
  if (simplerText == style.data) { return []; }

  const s1 = tdoc.insertMathJsStyle(style, simplerText, 'SIMPLIFICATION','MATHJS');
  const s2 = tdoc.insertLatexStyle(s1, simpler.toTex(), 'PRETTY','MATHJS');
  return [ s1, s2 ];
}


// NOTE: David and Rob suggested moving this out of this file.
// However, it is more general than someting to go int mathjs-cas.ts.
// Possibly it should be in its own class.  I intened to move
// it when I figure that out.
// Applies each rule to each style of the TDoc
// and returns an array of any new styles that were generated.
export function applyCasRules(tdoc: TDoc, rules: StyleRule[]): Style[] {
  let rval: Style[] = [];
  // IMPORTANT: The rules may add new styles. So capture the current
  //            length of the styles array, and only iterate over
  //            the existing styles. Otherwise, we could get into
  //            an infinite loop.
  let origStyles = tdoc.getStyles().slice();
  for (const style of origStyles) {
    for (const rule of rules) {
      const newStyles = rule(tdoc, style);
      rval = rval.concat(newStyles);
    }
  }
  return rval;
}
