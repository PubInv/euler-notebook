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

// LATER: Use svgo package to minimize the SVG markup? https://www.npmjs.com/package/svgo

// Requirements

import debug1 from "debug";
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

import { SvgMarkup } from "../shared/svg";
import { serializeTreeToMathMlMarkup, MathMlTree } from "../shared/mathml";
import { mathjax } from "mathjax-full/js/mathjax.js";
import { MathDocument } from "mathjax-full/js/core/MathDocument.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";
import { LiteAdaptor, liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { LengthInPixels } from "../shared/css";
import { FormulaTypesetter, TypesettingResults } from "../shared/formula";
import { BoundingBox } from "../shared/common";

// Types

// Constants

// const MJX_HEADER = '<mjx-container class="MathJax" jax="SVG">';
// const MJX_FOOTER = '</mjx-container>';

// Global Variables

// Exported Class

export class MathJaxTypesetter implements FormulaTypesetter {

  // Public Class Properties

  public static singleton: MathJaxTypesetter;

  // Public Class Property Functions

  // Public Class Methods

  public static initialize(): void {
    this.singleton = new this();
  }

  // Public Class Event Handlers
  // Public Constructor
  // Public Instance Properties
  // Public Instance Property Functions

  // Public Instance Methods

  public mathMlTreeToSvg(mathMlTree: MathMlTree, containerWidth: LengthInPixels): TypesettingResults {
    const mathMlMarkup = serializeTreeToMathMlMarkup(mathMlTree)
    debug(`Converting MathML to SVG: ${mathMlMarkup}`);
    const node = this.mathDocument.convert(mathMlMarkup, { display: false, em: 16, ex: 8, containerWidth });
    // Returns a 'mjx-container' element enclosing an 'svg' element.
    // We only want the svg element.
    const svgMarkup = <SvgMarkup>this.adaptor.innerHTML(node);
    debug(`SVG Markup is: ${svgMarkup}`);

    // const enclosingTagInfo = parseEnclosingSvgTag(formulaMarkup);
    // console.dir(enclosingTagInfo);
    // assert(enclosingTagInfo.viewBox);
    // const viewBox = parseViewBox(enclosingTagInfo.viewBox!);
    // console.dir(viewBox);
    // assert(enclosingTagInfo.width);
    // const width = pixelsFromCssLength(enclosingTagInfo.width!, metrics);
    // assert(enclosingTagInfo.height);
    // const height = pixelsFromCssLength(enclosingTagInfo.height!, metrics);
    // console.dir({ width, height });


    throw new Error("Not implemented");
    const boundingBox: BoundingBox = {
      x: 0,
      y: 0,
      width: 0, /* TODO! */
      height: 0, /* TODO! */
    }
    const rval: TypesettingResults = { boundingBox, svgMarkup };
    return rval;
  }

  // Public Instance Event Handlers

  // --- PRIVATE ---

  // Private Class Properties
  // Private Class Property Functions
  // Private Class Methods
  // Private Class Event Handlers

  // Private Constructor

  private constructor() {
    debug("Initializing");
    this.adaptor = liteAdaptor();
    /* const handler = */ RegisterHTMLHandler(this.adaptor);

    // TeX input processor options are described at:
    // http://docs.mathjax.org/en/latest/options/input/tex.html
    const tex = new TeX({ packages: AllPackages });

    // MathJax SVG output processor options are described at:
    // http://docs.mathjax.org/en/latest/options/output/svg.html
    const svg = new SVG({
      // REVIEW: Why doesn't this work?: displayAlign: 'left',
      fontCache: 'local', // REVIEW: Could we save space using 'global'?
    });
    this.mathDocument = mathjax.document('', { InputJax: tex, OutputJax: svg });
  }

  // Private Instance Properties

  private adaptor: LiteAdaptor;
  private mathDocument: MathDocument<any,any,any>; // TYPESCRIPT: Specific type parameters?

  // Private Instance Property Functions
  // Private Instance Methods
  // Private Instance Event Handlers


}
