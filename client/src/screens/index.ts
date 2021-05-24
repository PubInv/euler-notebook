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

import { Html } from "../shared/common";

import { $all, HtmlElementSpecification } from "../dom";
import { errorMessageForUser } from "../error-messages";
import { HtmlElement } from "../html-element";
import { logErrorIfUnexpected } from "../error-handler";

// Requirements

// Exported Class

export abstract class Screen extends HtmlElement<'div'>{

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

  protected clearErrorMessages(): void {
    const errorMessages = $all(this.$elt, '.errorMessage');
    for (const $errorMessage of errorMessages) {
      $errorMessage.remove();
    }

  }

  protected displayError(err: Error, prefixHtml?: Html): void {
    logErrorIfUnexpected(err);
    let html = errorMessageForUser(err);
    if (prefixHtml) {
      html = <Html>`${prefixHtml}:<br/>${html}`;
    }
    this.displayErrorMessage(html);
  }

  protected displayErrorMessage(html: Html): void {
    // Replaces the contents of the screen with an error message.

    // LATER: Better way to display to display a closed message.
    // LATER: Give user helpful instructions, e.g. "refresh the page, go to the parent folder, or go to the home folder."
    this.$elt.innerHTML = `<div class="errorMessage">${html}</div>`;
  }

}
