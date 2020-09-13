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

// LATER: If more than one message appears, then a "Close all" button should appear.
// LATER: Multiple identical messages should be coalesced with a number showing the number of copies. (Like browser console.)
// LATER: Animate the appearance of new messages.

// Requirements

import { Html, errorMessageForUser } from "./shared/common";

import { CLOSE_X_ENTITY } from "./dom";
import { HtmlElement } from "./html-element";

// Types

type MessageType = 'error'|'success'|'warning';

interface MessageOptions {
  autoDismiss?: boolean;
}

// Constants

const AUTO_DISMISS_TIMEOUT_MS = 3000;

// Exported singleton instance

export let messageDisplayInstance: MessageDisplay;

// Class

export class MessageDisplay extends HtmlElement<'div'> {

  // Public Class Methods

  public static initialize($body: HTMLBodyElement): void {
    messageDisplayInstance = new MessageDisplay($body)
  }

  // Public Constructor

  public constructor($body: HTMLBodyElement) {
    super({
      tag: 'div',
      id: 'messageDisplay',
      appendTo: $body,
    });
  }

  // Public Instance Methods

  public addError(err: Error, message?: Html): void {
    let html = errorMessageForUser(err);
    if (message) { html = <Html>`${message}: ${html}`; }
    this.addErrorMessage(html);
  }

  public addErrorMessage(message: Html): void {
    new Message(this, 'error', message);
  }

  public addSuccessMessage(html: Html): void { new Message(this, 'success', html, { autoDismiss: true }); }

  public addWarningMessage(html: Html): void { new Message(this, 'warning', html); }

  // --- PRIVATE ---

  // Private Instance Methods

}

// Helper Classes

class Message extends HtmlElement<'div'> {

  // Public Constructor

  public constructor(parent: MessageDisplay, type: MessageType, html: Html, options?: MessageOptions) {
    options = options || {};

    super({
      tag: 'div',
      classes: [ 'message', type ],
      children: [{
        tag: 'span',
        html,
      },{
        tag: 'button',
        classes: ['close', 'iconButton'],
        html: CLOSE_X_ENTITY,
        listeners: {
          click: (e)=>this.onCloseClick(e),
        }
      }],
      appendTo: parent.$elt,
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




