
// Requirements

import * as math from 'mathjs';

import { LatexMath, MathJsText } from '../client/math-tablet-api';
import { TDoc, Style, Thought }  from './tdoc';
import { Cas } from './open-tdoc';

// Types

export interface ParseResults {
  latexMath: LatexMath;
  mathJsText: MathJsText;
}

// Exported Interface

export const mathJsCas: Cas = {
  onTDocOpened,
  onThoughtInserted,
  onStyleInserted,
}

// "Exported" Functions

async function onTDocOpened(_tDoc: TDoc): Promise<void> {
  // console.log("MathJS onTDocOpened");
}

async function onThoughtInserted(_tDoc: TDoc, _thought: Thought): Promise<void> {
  // console.log(`MathJS onThoughtInserted ${thought.id}`);
}

async function onStyleInserted(tDoc: TDoc, style: Style): Promise<void> {
  // console.log(`MathJS onStyleInserted ${style.id} ${style.stylableId} ${style.type} ${style.meaning}`);
  mathExtractVariablesRule(tDoc, style);
  mathEvaluateRule(tDoc, style);
  mathSimplifyRule(tDoc, style);
}

export function parseMathJsExpression(s: string): ParseResults {
  const node = math.parse(s);
  return { mathJsText: node.toString(), latexMath: node.toTex() };
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
  if (!tdoc.clientData) tdoc.clientData = {};
  if (!tdoc.clientData.mathEvaluateRule) {
    tdoc.clientData.mathEvaluateRule = math.parser();
  }
  const parser = tdoc.clientData.mathEvaluateRule;

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
    let st = tdoc.insertTextStyle(style, firstLine, "EVALUATION-ERROR");
    return [st];
  }

  if (typeof e != 'number') return [];

  // REVIEW: Should we introduce a number style?
  let eString = ""+ e;
  let st = tdoc.insertMathJsStyle(style, eString, "EVALUATION");

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
  const styles =  symbolNodes.map(s => tdoc.insertMathJsStyle(style, s, 'SYMBOL'));
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
    console.log("math.simplify failed on", style.data);
    return [];
  }
  if (!simpler) { return []; }

  // If the simplification hasn't changed anything then don't add it.
  const simplerText = simpler.toString();
  if (simplerText == style.data) { return []; }

  const s1 = tdoc.insertMathJsStyle(style, simplerText, 'SIMPLIFICATION');
  const s2 = tdoc.insertLatexStyle(s1, simpler.toTex(), 'PRETTY');
  return [ s1, s2 ];
}

