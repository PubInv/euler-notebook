/*
Euler Notebook
Copyright (C) 2019-21 Public Invention
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

import { assert } from "../shared/common";
import { TexExpression } from "../shared/formula";

// Requirements

declare var MathJax: MathJax;

// Types

interface MathJax {
  texReset(): void;
  getMetricsFor(output: Node): MathJaxOptions;
  startup: MathJaxStartup;
  tex2svgPromise(texExpression: TexExpression, options: MathJaxOptions): Promise<HTMLElement>;
}

interface MathJaxDocument {
  clear(): void;
  updateDocument(): void;
}

interface MathJaxOptions {
  display?: boolean;
}

interface MathJaxStartup {
  document: MathJaxDocument;
}

// Exported Functions

export async function appendSvgFromTex(container: Node, texExpression: TexExpression): Promise<void> {
  MathJax.texReset();
  var options = MathJax.getMetricsFor(container);
  options.display = true;
  const $elt = await MathJax.tex2svgPromise(texExpression, options);
  console.dir($elt);
  assert($elt instanceof HTMLElement && $elt.tagName == 'MJX-CONTAINER');
  const $svg = $elt.firstElementChild!;
  console.dir($svg);
  assert($svg && $svg instanceof SVGSVGElement);
  container.appendChild($svg);
  // MathJax.startup.document.clear();
  // MathJax.startup.document.updateDocument();
}