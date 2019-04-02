


import { TDoc,Style,MathStyle }  from './tdoc-class.js';

declare var math: /* TYPESCRIPT: mathjs types? */ any;

var math = require("./math-5.8.0.js");

// Attempt math.js-based simplification
// TODO: math.js works on ascii math, whereas the
export function mathSimplifyRule(tdoc: TDoc, style: Style): Style|undefined {
  if (!(style instanceof MathStyle)) { return undefined; }
  const simpler = math.simplify(style.data);
  if (!simpler) { return undefined; }
  // TODO: This creates math styles with mathjs node data,
  //       whereas math style data elsewhere is a LaTeX string.
  return tdoc.createMathStyle(style, simpler);
}

