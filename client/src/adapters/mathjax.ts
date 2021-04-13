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

import * as debug1 from "debug";
const debug = debug1('client:mathjax');

import { assert } from "../shared/common";
import { MathMlMarkup, MathMlTree, serializeTreeToMathMlMarkup } from "../shared/mathml";

// Requirements

declare var MathJax: MathJax;

// Types

interface MathJax {
  texReset(): void;
  getMetricsFor(output: Node): MathJaxOptions;
  mathml2svg(mml: MathMlMarkup, options: MathJaxOptions): HTMLElement;
  startup: MathJaxStartup;
  // tex2svgPromise(texExpression: TexExpression, options: MathJaxOptions): Promise<HTMLElement>;
}

interface MathJaxDocument {
  clear(): void;
  updateDocument(): void;
}

interface MathJaxOptions {
  containerWidth: number,
  display?: boolean;
  em: number,
  ex: number,
  family: string,
  format: string,
  lineWidth: number,
  scale: number,
}

interface MathJaxStartup {
  document: MathJaxDocument;
}

// Exported Functions

export function renderMathMlTreeToSvgElement(mathMlTree: MathMlTree): SVGSVGElement {
  const mathMlMarkup: MathMlMarkup = serializeTreeToMathMlMarkup(mathMlTree);
  debug(`Rendering MathMl to SVG: ${mathMlMarkup}`);
  // This forces a reload: var options = MathJax.getMetricsFor(container);
  // let options2 = MathJax.getMetricsFor(container);
  // console.dir(options2);
  const options: MathJaxOptions = {
    containerWidth: -2,
    display: true,
    em: 16,
    ex: 8,
    family: "",
    format: "MathML",
    lineWidth: 1000000,
    scale: 1.1312217194570136,
  }
  const $elt = MathJax.mathml2svg(mathMlMarkup, options);
  assert($elt instanceof HTMLElement && $elt.tagName == 'MJX-CONTAINER');
  const $svg = <SVGSVGElement>$elt.firstElementChild!;
  assert($svg && $svg instanceof SVGSVGElement);
  // MathJax.startup.document.clear();
  // MathJax.startup.document.updateDocument();
  return $svg;
}
