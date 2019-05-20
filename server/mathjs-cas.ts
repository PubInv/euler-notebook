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
import * as math from 'mathjs';

import { LatexData, MathJsData, NotebookChange, StyleObject } from '../client/math-tablet-api';
import { TDoc }  from './tdoc';
import { Config } from './config';

// Types

type StyleRule = (tdoc: TDoc, session: SessionData, style: StyleObject)=>StyleObject[];

export interface ParseResults {
  latexMath: LatexData;
  mathJsText: MathJsData;
}

interface SessionData {
  // The "parser" allows the evaluator to retain state. The fact that
  // the rules are not applied in any order or repetitively makes the operation
  // of this haphazard at present; that will create mysterious errors if we
  // don't fix it.
  // This provides a terrible lack of control over the parser;
  // we cannot, for example, sensibly clear the parser. This should
  // probably be rethought.  -- rlr
  parser: math.Parser;
}

// Global Variables

const gTDocSessions = new Map<TDoc, SessionData>();

// Exported Functions

export async function initialize(_config: Config): Promise<void> {
  debug(`initializing`);
  TDoc.on('open', (tDoc: TDoc)=>{
    tDoc.on('change', function(this: TDoc, change: NotebookChange){ onChange(this, change); });
    tDoc.on('close', function(this: TDoc){ onClose(this); });
    onOpen(tDoc);
  });
}

export function parseMathJsExpression(s: string): ParseResults {
  const node = math.parse(s);
  return { mathJsText: node.toString(), latexMath: node.toTex() };
}

// Event Handler Functions

function onChange(tDoc: TDoc, change: NotebookChange): void {
  const session = gTDocSessions.get(tDoc);
  if (!session) { throw new Error("TDoc has no session for MathJS."); }
  switch (change.type) {
  case 'styleInserted':
    mathExtractVariablesRule(tDoc, session, change.style);
    mathEvaluateRule(tDoc, session, change.style);
    mathSimplifyRule(tDoc, session, change.style);
    break;
  default: break;
  }
}

function onClose(tDoc: TDoc): void {
  gTDocSessions.delete(tDoc);
}

function onOpen(tDoc: TDoc): void {
  const session: SessionData = { parser: math.parser() };
  gTDocSessions.set(tDoc, session);
  // TODO: Run an evaluation over the entire TDoc so our parser has the full context.
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


export function mathEvaluateRule(tdoc: TDoc, session: SessionData, style: StyleObject): StyleObject[] {

  // We only evaluate MathJS expressions that are user input.
  if (style.type != 'MATHJS' || style.meaning != 'INPUT') {
    return [];
  }

  // Do not evaluate more than once.
  if ((tdoc.stylableHasChildOfType(style, 'MATHJS', 'EVALUATION')) ||
      (tdoc.stylableHasChildOfType(style, 'TEXT', 'EVALUATION-ERROR'))) {
    return [];
  }

  let e;
  try {
    e = session.parser.eval(style.data);
  } catch (err) {
    debug("error in eval", style.data, err.messsage);
    const firstLine = err.message;
    let st = tdoc.insertStyle(style, { type: 'TEXT', data: firstLine, meaning: 'EVALUATION-ERROR', source: 'MATHJS' });
    return [st];
  }

  if (typeof e != 'number') return [];

  // REVIEW: Should we introduce a number style?
  let eString = ""+ e;
  let st = tdoc.insertStyle(style, { type: 'MATHJS', data: eString, meaning: 'EVALUATION', source: 'MATHJS' });

  return [st];
}

export function mathExtractVariablesRule(tdoc: TDoc, _session: SessionData, style: StyleObject): StyleObject[] {
  // We only extract symbols from MathJS expressions that are user input.
  if (style.type != 'MATHJS' || style.meaning != 'INPUT') { return []; }

  // Do not extract symbols more than once.
  if (tdoc.stylableHasChildOfType(style, 'MATHJS', 'SYMBOL')) { return []; }

  const parse = math.parse(style.data);
  if (!parse) return [];

  const symbolNodes = collectSymbols(parse);
  const styles =  symbolNodes.map(s => tdoc.insertStyle(style, { type: 'MATHJS', data: s, meaning: 'SYMBOL', source: 'MATHJS' }));
  return styles;
}

// Attempt math.js-based simplification
export function mathSimplifyRule(tdoc: TDoc, _session: SessionData, style: StyleObject): StyleObject[] {
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
    //    debug("math.simplify failed on", style.data);
    return [];
  }
  if (!simpler) { return []; }

  // If the simplification hasn't changed anything then don't add it.
  const simplerText = simpler.toString();
  if (simplerText == style.data) { return []; }

  const s1 = tdoc.insertStyle(style, { type: 'MATHJS', data: simplerText, meaning: 'SIMPLIFICATION', source: 'MATHJS' });
  const s2 = tdoc.insertStyle(s1, { type: 'LATEX', data: simpler.toTex(), meaning: 'PRETTY', source: 'MATHJS' });
  return [ s1, s2 ];
}

// NOTE: David and Rob suggested moving this out of this file.
// However, it is more general than someting to go int mathjs-cas.ts.
// Possibly it should be in its own class.  I intened to move
// it when I figure that out.
// Applies each rule to each style of the TDoc
// and returns an array of any new styles that were generated.
export function applyCasRules(tdoc: TDoc, rules: StyleRule[]): StyleObject[] {
  let rval: StyleObject[] = [];
  const session: SessionData = { parser: math.parser() };
  // IMPORTANT: The rules may add new styles. So capture the current
  //            length of the styles array, and only iterate over
  //            the existing styles. Otherwise, we could get into
  //            an infinite loop.
  let origStyles = tdoc.getStyles().slice();
  for (const style of origStyles) {
    for (const rule of rules) {
      const newStyles = rule(tdoc, session, style);
      rval = rval.concat(newStyles);
    }
  }
  return rval;
}
