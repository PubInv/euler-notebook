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

// Requirements

import { $configureAll, $all, HtmlElementSpecification } from "../dom";
import { HtmlElement } from "../html-element";

// Class

export class ButtonBar extends HtmlElement<'div'>{


  // --- PRIVATE ---

  // Private Constructor

  protected constructor(options: HtmlElementSpecification<'div'>) {
    super(options);

    // Prevent buttons from taking focus when clicked.
    // REVIEW: Code duplicated in sidebar.ts.
    $configureAll($all(this.$elt, 'button'), {
      // REVIEW: Use pointer event instead? Will this handle touches and stylus taps?
      listeners: { mousedown: (e: MouseEvent)=>{ e.preventDefault(); }},
    });

  }

  // Private Instance Properties

}