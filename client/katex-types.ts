
// TYPESCRIPT: Can we get this from the katex library?

import { LatexMath } from './math-tablet-api.js'

// Types

export type Latex = string;

interface KatexGlobal {
  render(latex: LatexMath, $elt: HTMLElement, options: KatexOptions): void;
}

interface KatexOptions {
  throwOnError?: boolean;
}

// Exported functions

export function getKatex(): KatexGlobal {
  return (<any>window).katex;
}
