/*
Math Tablet
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

import { errorMessageForUser, Html } from "../shared/common";
import { HtmlElementSpecification } from "../dom";
import { HtmlElement } from "../html-element";
import { logErrorIfUnexpected } from "../error-handler";

// Requirements

// Exported Class

export abstract class ScreenBase extends HtmlElement<'div'>{

  // Public Instance Properties

  // Public Instance Methods

  // Public Event Handlers

  public abstract onResize(window: Window, event: UIEvent): void;

  // --- PRIVATE ---

  protected constructor(spec: HtmlElementSpecification<'div'>|HTMLElementTagNameMap['div']) {
    super(spec);
  }

  // Private Properties

  // Private Instance Methods

  protected displayError(err: Error, html: Html) {
    logErrorIfUnexpected(err);
    this.displayErrorMessage(<Html>`${html}: ${errorMessageForUser(err)}`);
  }

  protected displayErrorMessage(html: Html) {
    // Replaces the contents of the screen with an error message.

    // LATER: Better way to display to display a closed message.
    // LATER: Give user helpful instructions, e.g. "refresh the page, go to the parent folder, or go to the home folder."
    this.$elt.innerHTML = `<div class="errorMessage">${html}</div>`;
  }

}
