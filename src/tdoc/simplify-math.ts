
import * as math from 'mathjs';

import { TDoc, Style, LatexStyle, MathJsPlainStyle }  from './tdoc-class';

// Attempt math.js-based simplification
export function mathSimplifyRule(tdoc: TDoc, style: Style): Style[]
{
  if (!((style instanceof LatexStyle) ||
        (style instanceof MathJsPlainStyle)))
  {
    return [];
  }

  // Although this might not be true of every simplification, it
  // only makes sense to have one mathjs simplification on a
  // stylable. So if we there is already a simplication stylable
  // attached to this stylable, we will punt.
  if (tdoc.stylableHasChildOfType(style,"MATHJSSIMPLIFICATION") ||
      tdoc.stylableHasChildOfType(style,"MATHJS-PLAIN","EVALUATION") ||
      tdoc.stylableHasChildOfType(style,"MATHJS-PLAIN","BAD EVALUATION"))
    {
      return [];
    }

  if ((style.meaning == "EVALUATION") || (style.meaning == "BAD EVALUATION"))
    {
      return [];
    }
  let simpler;
  try {
    simpler = math.simplify(style.data);
  } catch {
    console.log("math.simplify failed on",style.data);
    return [];
  }
  if (!simpler) { return []; }
  // TODO: This creates math styles with mathjs node data,
  //       whereas math style data elsewhere is a LaTeX string.
  return [tdoc.createMathJsSimplificationStyle(style, simpler)];
  }

function collectSymbols(node: math.MathNode) : string[] {
  var symbols: string[] = [];
  node.traverse(function (node, _path, _parent) {
    if (node.type == 'SymbolNode') {
      symbols.push(node.name || "Unknown node");
    }
  });
  return symbols;
}

export function mathExtractVariablesRule(tdoc: TDoc, style: Style): Style[]
{
  if (!((style instanceof LatexStyle) ||
        (style instanceof MathJsPlainStyle)))
  {
    return [];
  }
  if ((style.meaning == "EVALUATION") || (style.meaning == "BAD EVALUATION"))
    {
      return [];
    }

  // This is a little fragile...right now, we
  // get any number of symbols from math.parse in a fell swoop.
  // So having a single one reliably suggest that all are present.
  // If we changed the way symbols were extracted, we would need to
  // change this test to test for all symbols by doing an equality
  // test against existing symbols attached to the style. Since
  // we don't even want to do that processing right now, I'm leaving
  // this as is.
  if (tdoc.stylableHasChildOfType(style,"SYMBOL")) {
    return [];
  }
  const parse = math.parse(style.data);

  if (!parse) return [];

  let symbolNodes = collectSymbols(parse);
  let styles =  symbolNodes.map(
    s => tdoc.createSymbolStyle(style,s));
  return styles;
}

// the evaluator actually has a very complex type which I will
// not attempt to type. To use this rule, create a thunk that supplies the
// evaluator. This allows the evaluator to retain state. The fact that
// the rules are not applied in any order or repetitively makes the operation
// of this haphazard at present; that will create mysterious errors if we
// don't fix it. -- rlr

export function mathEvaluateRule(tdoc: TDoc, style: Style): Style[]
{
  // This provides a terrible lack of control over the parser;
  // we cannot, for example, sensibly clear the parser. This should
  // probably be rethought.

  // I need to add clientData to the deserialization, I guess.
  if (!tdoc.clientData) tdoc.clientData = {};
  if (!tdoc.clientData.mathEvaluateRule) {
    tdoc.clientData.mathEvaluateRule = math.parser();
  }
  const parser =
        tdoc.clientData.mathEvaluateRule;

  if (!((style instanceof LatexStyle) ||
        (style instanceof MathJsPlainStyle)))
  {
    return [];
  }
  if ((style.meaning == "EVALUATION") || (style.meaning == "BAD EVALUATION"))
    {
      return [];
    }
  if ((tdoc.stylableHasChildOfType(style,"MATHJS-PLAIN","EVALUATION")) ||
      (tdoc.stylableHasChildOfType(style,"MATHJS-PLAIN","BAD EVALUATION"))) {
    return [];
  }
  var e;
  try {
    e = (parser) ?
      parser.eval(style.data) :
      math.eval(style.data);
  } catch (err) {
    console.log("error in eval",style.data,err.messsage);
    const firstLine = err.message;
    let st = tdoc.createMathJsPlainStyle(style,firstLine,"BAD EVALUATION");
    return [st];
  }

  if (typeof e != 'number') return [];

  // We don't currently have a style that supports numbers...
  let eString = ""+ e;
  let st = tdoc.createMathJsPlainStyle(style,eString,"EVALUATION");

  return [st];
}
