import { CssClass, SvgMarkup } from "../shared/common";
/*
Math Tablet
Copyright (C) 2019 Public Invention
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

// LATER: Use svgo package to minimize the SVG markup? https://www.npmjs.com/package/svgo

// Requirements

import debug1 from "debug";
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

import { mathjax } from "mathjax-full/js/mathjax.js";
import { MathDocument } from "mathjax-full/js/core/MathDocument.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";
import { LiteAdaptor, liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";

import { assert } from "../shared/common";
import { TexExpression } from "../shared/formula";

// Types

interface ConvertOptions {
  class?: CssClass;
}

// Constants

// const MJX_HEADER = '<mjx-container class="MathJax" jax="SVG">';
// const MJX_FOOTER = '</mjx-container>';

// Global Variables

let gAdaptor: LiteAdaptor;
let gHtml: MathDocument<any,any,any>; // TYPESCRIPT: Specific type parameters?

// Exported Functions

export function initialize(): void {
  debug("Initializing");
  gAdaptor = liteAdaptor();
  /* const handler = */ RegisterHTMLHandler(gAdaptor);

  // TeX input processor options are described at:
  // http://docs.mathjax.org/en/latest/options/input/tex.html
  const tex = new TeX({ packages: AllPackages });

  // MathJax SVG output processor options are described at:
  // http://docs.mathjax.org/en/latest/options/output/svg.html
  const svg = new SVG({
    // REVIEW: Why doesn't this work?: displayAlign: 'left',
    fontCache: 'local', // REVIEW: Could we save space using 'global'?
  });
  gHtml = mathjax.document('', { InputJax: tex, OutputJax: svg });
}

export function convertTexToSvg(tex: TexExpression, options?: ConvertOptions): SvgMarkup {
  options = options || {};
  debug(`Converting TeX: "${tex}"`);
  const node = gHtml.convert(tex, { display: false, em: 16, ex: 8, containerWidth: 80*16 });
  // Returns HTML of a 'mjx-container' element enclosing an "svg" element.
  // const html = <Html>gAdaptor.outerHTML(node);
  // assert(html.startsWith(MJX_HEADER));
  // assert(html.endsWith(MJX_FOOTER));
  // let svgMarkup = <SvgMarkup>html.slice(MJX_HEADER.length, -MJX_FOOTER.length);
  let svgMarkup = <SvgMarkup>gAdaptor.innerHTML(node);
  assert(svgMarkup.startsWith('<svg '));
  assert(svgMarkup.endsWith('</svg>'));
  if (options.class) {
    svgMarkup = <SvgMarkup>svgMarkup.replace(/^<svg /, `<svg class="${options.class}" `);
  }
  return svgMarkup;
}
