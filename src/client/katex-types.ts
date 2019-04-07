
// TYPESCRIPT: Can we get this from the katex library?

// Types

interface KatexGlobal {
  render(latex: string, $elt: HTMLElement, options: KatexOptions): void;
}

interface KatexOptions {
  throwOnError?: boolean;
}

// Exported functions

export function getKatex(): KatexGlobal {
  return (<any>window).katex;
}
