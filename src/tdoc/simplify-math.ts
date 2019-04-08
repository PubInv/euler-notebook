
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
  if (tdoc.stylableHasChildOfType(style,"MATHJSSIMPLIFICATION"))
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
