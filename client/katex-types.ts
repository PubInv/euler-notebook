
// NOTE: This is not a complete set of types for the library.
//       Just the stuff that we have used.

// TYPESCRIPT: Can we get this from the katex library?

import { LatexMath } from './math-tablet-api.js'

// Types

interface KatexGlobal {
  render(latex: LatexMath, $elt: HTMLElement, options: KatexOptions): void;
  renderToString(latex: LatexMath, options: KatexOptions): /* TYPESCRIPT: Html */ string;
}

interface KatexOptions {
  throwOnError?: boolean;
}

// Exported functions

export function getKatex(): KatexGlobal {
  return (<any>window).katex;
}
