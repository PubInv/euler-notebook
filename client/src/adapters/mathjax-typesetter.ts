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
import { LengthInPixels } from "../shared/css";
import { FormulaTypesetter, TypesettingResults } from "../shared/formula";
import { EM_IN_PIXELS, EX_IN_PIXELS, unwrap } from "../shared/mathjax";
import { MathMlMarkup, MathMlTree, serializeTreeToMathMlMarkup } from "../shared/mathml";
import { SvgMarkup } from "../shared/svg";

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

// Constants

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
    const $svg = this.mathMlTreeToSvgElt(mathMlTree, containerWidth);
    return unwrap(<SvgMarkup>$svg.outerHTML);
  }

  public mathMlTreeToSvgElt(mathMlTree: MathMlTree, containerWidth: LengthInPixels): SVGSVGElement {
    const mathMlMarkup: MathMlMarkup = serializeTreeToMathMlMarkup(mathMlTree);
    debug(`Rendering MathMl to SVG: ${mathMlMarkup}`);
    // This forces a reload: var options = MathJax.getMetricsFor(container);
    // let options2 = MathJax.getMetricsFor(container);
    // c-nsole.dir(options2);
    const options: MathJaxOptions = {
      containerWidth,
      display: true,
      em: EM_IN_PIXELS,
      ex: EX_IN_PIXELS,
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

  // Public Instance Event Handlers

  // --- PRIVATE ---

  // Private Class Properties
  // Private Class Property Functions
  // Private Class Methods
  // Private Class Event Handlers

  // Private Constructor

  private constructor() {}

  // Private Instance Properties
  // Private Instance Property Functions
  // Private Instance Methods
  // Private Instance Event Handlers

}

// Exported Singleton Instance
