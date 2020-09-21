import { Html, SvgMarkup } from "./shared/common";
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

import { mathjax } from "mathjax-full/js/mathjax.js";
import { MathDocument } from "mathjax-full/js/core/MathDocument.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";
import { LiteAdaptor, liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";

import { assert } from "./shared/common";
import { TexExpression } from "./shared/math-tablet-api";

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// Global Variables

let gAdaptor: LiteAdaptor;
let gHtml: MathDocument<any,any,any>; // TYPESCRIPT: Specific type parameters?

// Exported Functions

export function initialize(): void {
  debug("Initializing.");
  gAdaptor = liteAdaptor();
  /* const handler = */ RegisterHTMLHandler(gAdaptor);

  const tex = new TeX({ packages: AllPackages });
  const svg = new SVG({ fontCache: 'none' }); // REVIEW: Do we want 'local'?
  gHtml = mathjax.document('', {InputJax: tex, OutputJax: svg});
}

export function convertTexToSvg(tex: TexExpression): SvgMarkup {
  const node = gHtml.convert(tex, { display: false, em: 16, ex: 8, containerWidth: 80*16 });
  // Returns HTML of a 'mjx-container' element enclosing an "svg" element.
  const html = <Html>gAdaptor.outerHTML(node);
  // Remove "<mjx-container class="MathJax" jax="SVG">" from the beginning and "</mjx-container>" from the end.
  const svg = <SvgMarkup>html.slice(41,-16);
  return fixupSvgMarkup(svg);
}

// Helper Functions

function fixupSvgMarkup(markup: SvgMarkup): SvgMarkup {
  assert(markup.startsWith('<svg '));
  assert(markup.endsWith('</svg>'));
  markup = <SvgMarkup>markup.replace(/^<svg /, '<svg class="formulaPanel" ');
  console.dir(markup);
  return <SvgMarkup>markup;
}