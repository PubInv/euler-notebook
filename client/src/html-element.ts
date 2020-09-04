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

import { $new, HtmlElementSpecification } from "./dom";

// Types

// Constants

// Global Variables

// Exported Class

export class HtmlElement<K extends keyof HTMLElementTagNameMap> {

  // Public Class Methods

  // Public Instance Properties

  public $elt: HTMLElementTagNameMap[K];

  // Public Instance Methods

  public destroy(): void {
    this.$elt.remove();
    this.destroyed = true;
  }

  public hide(): void {
    this.$elt.style.display = 'none';
  }

  public show(): void {
    // TODO: display style could be 'inline' or something else.
    this.$elt.style.display = 'block';
  }

  // -- PRIVATE --

  // Constructor

  protected constructor(options: HtmlElementSpecification<K>) {
    this.$elt = $new(options);
  }

  // Private Instance Properties

  protected destroyed?: boolean;

  // Private Instance Methods
}
