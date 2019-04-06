
import * as math from 'mathjs';

import { TDoc, Style, MathStyle }  from './tdoc-class';

// Attempt math.js-based simplification
export function mathSimplifyRule(tdoc: TDoc, style: Style): Style[]
{
  if (!(style instanceof MathStyle)) { return []; }
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
    return [];
  }
  if (!simpler) { return []; }
  // TODO: This creates math styles with mathjs node data,
  //       whereas math style data elsewhere is a LaTeX string.
  return [tdoc.createMathJsSimplificationStyle(style, simpler)];
}

function collectSymbols(node) : string[] {
  var symbols: string[] = [];
  node.traverse(function (node, _path, _parent) {
    if (node.type == 'SymbolNode') {
      symbols.push(node.name);
    }
  });
  return symbols;
}

export function mathExtractVariablesRule(tdoc: TDoc, style: Style): Style[]
{
  if (!(style instanceof MathStyle)) {
    return [];
  }
  const parse = math.parse(style.data);

  if (!parse) return [];

  let symbolNodes = collectSymbols(parse);
  let styles =  symbolNodes.map(
    s => tdoc.createSymbolStyle(style,s));
  return styles;
}
