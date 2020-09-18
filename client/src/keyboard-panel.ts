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

import * as debug1 from "debug";
import { $new } from "./dom";
const debug = debug1('client:keyboard-panel');

import { HtmlElement } from "./html-element";

// Types

type KeyboardCallbackFn = (text: string)=>Promise<void>;

// Constants

// Exported Class

export class KeyboardPanel extends HtmlElement<'div'> {

  // Public Constructor

  public constructor(
    text: string,
    keyboardCallbackFn: KeyboardCallbackFn,
  ) {
    debug(`Creating instance.`);

    const $textArea = $new<'textarea'>({
      tag: 'textarea',
      listeners: {
        input: (e: InputEvent)=>this.onTextAreaInput(e),
        keyup: (e: KeyboardEvent)=>this.onTextAreaKeyUp(e),
      }
    });
    $textArea.value = text;

    super({
      tag: 'div',
      classes: [ 'editPanel', 'keyboardPanel'],
      children: [ $textArea ],
    });

    this.$textArea = $textArea;
    this.keyboardCallbackFn = keyboardCallbackFn;
  }

  // Public Instance Methods


  // --- PRIVATE ---

    // Private Instance Properties

    private $textArea: HTMLTextAreaElement;
    private keyboardCallbackFn: KeyboardCallbackFn;


  // Private Instance Methods

  public updateText(text: string): void {
    debug(`Updating text.`);
    this.$textArea.value = text;
  }

  // Private Event Handlers

  private onTextAreaInput(_event: Event): void {
    debug(`TextArea input event`);
    // const text = this.$textArea.value;
    // TODO: Incremental change
  }

  private onTextAreaKeyUp(event: KeyboardEvent): void {
    debug(`TextArea key-up event`);
    switch(event.key) {
      case 'Enter':
        // TODO: Do not allow submission if there is an error.
        if (event.ctrlKey) {
          event.stopPropagation();
          this.keyboardCallbackFn(this.$textArea.value);
        }
        break;
      case 'Escape':
          event.stopPropagation();
          // TODO: restore previous value?
        break;
    }
  }

}
