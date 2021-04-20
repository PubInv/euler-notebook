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

import { assert, BoundingBox } from "../shared/common";
import { CssLength, CssLengthMetrics, LengthInPixels, unroundedPixelsFromCssLength } from "../shared/css";
import { parseViewBoxAttribute, SvgMarkup, ViewBoxAttribute } from "../shared/svg";
import { MathMlMarkup, MathMlTree, serializeTreeToMathMlMarkup } from "../shared/mathml";
import { FormulaTypesetter, TypesettingResults } from "../shared/formula";

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

const EM_IN_PIXELS = 16;
const EX_IN_PIXELS = 8;

const CSS_LENGTH_METRICS: CssLengthMetrics = {
  em: EM_IN_PIXELS,
  ex: EX_IN_PIXELS,
}

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

    const widthAttr = <CssLength>$svg.getAttribute('width')!;
    assert(widthAttr);
    const width = unroundedPixelsFromCssLength(widthAttr, CSS_LENGTH_METRICS)
    const heightAttr = <CssLength>$svg.getAttribute('height')!;
    assert(heightAttr);
    const height = unroundedPixelsFromCssLength(heightAttr, CSS_LENGTH_METRICS);
    const viewBoxAttr = <ViewBoxAttribute>$svg.getAttribute('viewBox');
    const viewBox = parseViewBoxAttribute(viewBoxAttr);
    console.dir($svg);
    console.dir({ width, height });
    console.dir(viewBox);
    console.log(`SVG aspect ratio: ${width/height}`);
    console.log(`VB aspect ratio: ${viewBox.width/viewBox.height}`);
    const scale = width/viewBox.width;
    // REVIEW: Not sure why we can't put both transforms onto one <g> element.
    //         But to get this to work we need to nest them.
    const transform1 = `translate(${-viewBox.x} ${-viewBox.y})`;
    const transform2 = `scale(${scale})`;
    const svgMarkup = <SvgMarkup>`<g transform="${transform2}"><g transform="${transform1}">${$svg.innerHTML}</g></g>`;

    // REVIEW: Can we get the bounding box more directly from $svg?
    const boundingBox: BoundingBox = { x: 0, y: 0, width, height };

    const rval: TypesettingResults = {
      svgMarkup,
      boundingBox,
    }
    return rval;
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
