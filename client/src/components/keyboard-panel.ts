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

// REVIEW: This component is not currently used. This file can be deleted.
//         Leaving here for future reference.

// Requirements

import * as debug1 from "debug";

import { CssClass, PlainText } from "../shared/common";

import { $new } from "../dom";
const debug = debug1('client:keyboard-panel');

import { HtmlElement } from "../html-element";

// Types

export type KeyboardCallbackFn = (start: number, end: number, replacement: PlainText, value: PlainText)=>void;

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
      },
      asyncListeners: {
        keyup: (e: KeyboardEvent)=>this.onTextAreaKeyUp(e),
      }
    });
    $textArea.value = text;

    super({
      tag: 'div',
      classes: [ <CssClass>'keyboardPanel'],
      children: [ $textArea ],
    });

    this.$textArea = $textArea;
    this.keyboardCallbackFn = keyboardCallbackFn;
    this.lastText = text;
  }

  // Public Instance Methods


  // --- PRIVATE ---

    // Private Instance Properties

    private $textArea: HTMLTextAreaElement;
    private keyboardCallbackFn: KeyboardCallbackFn;
    private lastText: string;


  // Private Instance Methods

  public updateText(text: string): void {
    debug(`Updating text.`);
    this.$textArea.value = text;
  }

  // Private Event Handlers

  private onTextAreaInput(event: InputEvent): void {
    debug(`TextArea input event: ${event.inputType} "${event.data}"`);
    const target = <HTMLTextAreaElement>event.target!;
    // See https://w3c.github.io/input-events/#interface-InputEvent
    console.dir(event);
    console.dir((<any>event).getTargetRanges());

    // TODO: Compute start and end and replacement values from event data.
    const start = 0;
    const end = -1;
    const replacement = <PlainText>"";
    const value = <PlainText>target.value;
    this.keyboardCallbackFn(start, end, replacement, value);
  }

  private async onTextAreaKeyUp(event: KeyboardEvent): Promise<void> {
    debug(`TextArea key-up event`);
    switch(event.key) {
      case 'Enter':
        // TODO: Do not allow submission if there is an error.
        if (event.ctrlKey) {
          const text = this.$textArea.value;
          event.stopPropagation();
          this.lastText = text;
          // await this.keyboardCallbackFn(text);
        }
        break;
      case 'Escape':
          // TODO: also save last value when we lose focus.
          event.stopPropagation();
          this.$textArea.value = this.lastText;
          // TODO: this.keyboardCallbackFn('cancelEditing', this.lastText)
        break;
    }
  }

}
