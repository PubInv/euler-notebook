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

import { $new } from './dom.js';
import { Renderer, RenderResult } from './renderers.js';

// Types

type DismissCallback = (text: string|undefined)=>void;

// Constants

// Exported Class

export class KeyboardInputPanel {

  // Class Methods

  public static create(
    text: string,
    renderer: Renderer,
    dismissCallback: DismissCallback,
  ): KeyboardInputPanel {
    return new this(text, renderer, dismissCallback);
  }

  // Instance Properties

  public $elt: HTMLDivElement;

  // Instance Methods

  public dismiss(saveChanges: boolean): void {
    let text = undefined;
    if (saveChanges) {
      text = this.$textArea.value;
    }
    this.dismissCallback(text);
  }

  public focus(): void { this.$textArea.focus(); }

  // ----- Private -----

  // Private Constructor

  private constructor(
    text: string,
    renderer: Renderer,
    dismissCallback: DismissCallback,
  ) {
    this.dismissCallback = dismissCallback;
    this.renderer = renderer;

    this.$elt = $new('div', { class: 'keyboardInputPanel' });

    this.$preview = $new('div', {
      appendTo: this.$elt,
      class: 'keyboardInputPreview',
    });

    this.$textArea = $new<HTMLTextAreaElement>('textarea', {
      appendTo: this.$elt,
      listeners: {
        input: (event)=>this.onInput(event),
        keyup: (event)=>this.onKeyUp(event),
      }
    });
    this.$textArea.value = text;

    this.$errorMessage = $new('div', {
      appendTo: this.$elt,
      class: 'keyboardInputErrorMessage',
    });

    this.previewRenderingResult(renderer(text));
  }

  // Private Instance Properties

  private $errorMessage: HTMLDivElement;
  private $preview: HTMLDivElement;
  private $textArea: HTMLTextAreaElement;
  private dismissCallback: DismissCallback;
  private renderer: Renderer;

  // Private Instance Methods

  private previewRenderingResult(result: RenderResult): void {
    const { html, errorHtml } = result;
    if (html) { this.$preview.innerHTML = html; }
    this.$errorMessage.innerHTML = errorHtml || '';
  }
  // Private Event Handlers

  private onInput(_event: Event): void {
    const text = this.$textArea.value;
    this.previewRenderingResult(this.renderer(text));
  }

  private onKeyUp(event: KeyboardEvent): void {
    switch(event.key) {
      case 'Enter':
        // TODO: Do not allow submission if there is an error.
        if (event.ctrlKey) {
          event.stopPropagation();
          this.dismiss(true);
        }
        break;
      case 'Escape':
          event.stopPropagation();
          this.dismiss(false);
        break;
    }
  }
}
