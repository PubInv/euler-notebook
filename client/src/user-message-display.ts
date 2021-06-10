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

// LATER: If more than one message appears, then a "Close all" button should appear.
// LATER: Multiple identical messages should be coalesced with a number showing the number of copies. (Like browser console.)
// LATER: Animate the appearance of new messages.

// Requirements

import { assert } from "./shared/common";
import { CssClass } from "./shared/css";

import { CLOSE_X_ENTITY } from "./dom";
import { HtmlElement } from "./html-element";
import { ELEMENT_ID, EVENT_NAME, Info, Level } from "./user-message-dispatch";

// Types

// Constants

const AUTO_DISMISS_TIMEOUT_MS = 3000;

const LEVEL_CLASS_MAP = new Map<Level, CssClass>([
  [ Level.Error, <CssClass>'error' ],
  [ Level.Warning, <CssClass>'warning' ],
  [ Level.Success, <CssClass>'success' ],
  [ Level.Debug, <CssClass>'debug' ],
]);

// Class

export class UserMessageDisplay extends HtmlElement<'div'> {

  // Public Class Properties

  public static singleton?: UserMessageDisplay;

  // Public Class Methods

  // Public Constructor

  public constructor() {
    assert(!UserMessageDisplay.singleton);
    super({
      tag: 'div',
      id: ELEMENT_ID,
    });
    UserMessageDisplay.singleton = this;

    // Listen for low-level error messages on the body element,
    // and display any in the message ticker.
    // These are dispatched in error-handler.ts.
    this.$elt.addEventListener(EVENT_NAME, (e: Event)=>{
      try {
        const detail = <Info>(<CustomEvent>e).detail;
        const messageElt = new MessageElement(detail);
        this.$elt.append(messageElt.$elt);
      } catch (err) {
        console.error("Error in user-message-display event listener.");
        console.dir(err);
      }
    });

  }

  // Public Instance Methods

  // --- PRIVATE ---

  // Private Instance Methods

}

// Helper Classes

class MessageElement extends HtmlElement<'div'> {

  // Public Constructor

  public constructor(info: Info) {
    const options = info.options || {};

    super({
      tag: 'div',
      classes: [ <CssClass>'message', LEVEL_CLASS_MAP.get(info.level)! ],
      children: [{
        tag: 'span',
        html: info.html,
      },{
        tag: 'button',
        classes: [<CssClass>'close', <CssClass>'iconButton'],
        html: CLOSE_X_ENTITY,
        syncButtonHandler: (e)=>this.onCloseClick(e),
      }],
    });

    if (options.autoDismiss) {
      setTimeout(()=>{ this.remove(); }, AUTO_DISMISS_TIMEOUT_MS);
    }

  }

  // --- PRIVATE ---

  // Private Instance Event handlers

  private onCloseClick(event: MouseEvent): void {
    event.preventDefault();
    this.remove();
  }
}




