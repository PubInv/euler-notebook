
import * as math from 'mathjs';

import { TDoc, Style, MathStyle }  from './tdoc-class';

// Attempt math.js-based simplification
export function mathSimplifyRule(tdoc: TDoc, style: Style): Style[]
{
  if (!(style instanceof MathStyle)) { return []; }
  let simpler;
  try {
    simpler = math.simplify(style.data);
  } catch {
    console.log("failed to simplify :",style.data);
    return [];
  }
    console.log("return",simpler);
    if (!simpler) { return []; }
    // TODO: This creates math styles with mathjs node data,
    //       whereas math style data elsewhere is a LaTeX string.
    return [tdoc.createMathStyle(style, simpler)];
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
  if (!(style instanceof MathStyle)) { return undefined; }
  const parse = math.parse(style.data);

  if (!parse) return undefined;

  let symbolNodes = collectSymbols(parse);
  let styles =  symbolNodes.map(
    s => tdoc.createSymbolStyle(style,s));
  return styles;
}
