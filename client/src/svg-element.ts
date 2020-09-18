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

// Requirements

import { $newSvg, SvgElementSpecification } from "./dom";

// Types

// Constants

// Global Variables

// Exported Class

export class SvgElement<K extends keyof SVGElementTagNameMap> {

  // Public Class Methods

  // Public Instance Properties

  public $elt: SVGElementTagNameMap[K];

  // Public Instance Methods

  public destroy(): void {
    this.$elt.remove();
    this.destroyed = true;
  }

  public hide(): void {
    this.$elt.style.display = 'none';
  }

  public show(): void {
    // rather than style attribute display:none on the element itself.
    // Per MDN: "A style declaration is reset by setting it to null or an empty string, ....
    //           Internet Explorer requires setting it to an empty string,..."
    // https://developer.mozilla.org/en-US/docs/Web/API/ElementCSSInlineStyle/style
    // Note that this will not work if the element is hidden by a declaration in a stylesheet,
    this.$elt.style.display = '';
  }

  // -- PRIVATE --

  // Constructor

  protected constructor(options: SvgElementSpecification<K>) {
    this.$elt = $newSvg(options);
  }

  // Private Instance Properties

  protected destroyed?: boolean;

  // Private Instance Methods
}
