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

import { $new } from '../dom.js';
import { getRenderer, Renderer } from './renderers.js';
import { ROLE_OPTIONS, SUBROLE_OPTIONS, TYPE_OPTIONS } from './role-selectors.js';
import { StyleObject, StyleRole, StyleSubrole, StyleType } from '../notebook.js';
import { NotebookChangeRequest, StyleChangeRequest, StyleConvertRequest } from '../math-tablet-api.js';

// Types

type DismissCallback = (changeRequests: NotebookChangeRequest[])=>void;

// Constants

// Exported Class

export class KeyboardInputPanel {

  // Class Methods

  public static create(style: StyleObject, repStyle: StyleObject, dismissCallback: DismissCallback): KeyboardInputPanel {
    return new this(style, repStyle, dismissCallback);
  }

  // Instance Properties

  public $elt: HTMLDivElement;

  // Instance Methods

  public dismiss(saveChanges: boolean): void {
    if (!saveChanges) {
      this.dismissCallback([]);
      return;
    }

    const changeRequests = <NotebookChangeRequest[]>[];

    // If role/subrole changed then send a convertStyle request on root style.
    // If type changed then send a convertStyle request on representation style.
    // If data has changed then send a changeStyle request on representation style.
    // otherwise send no changes.
    const role = <StyleRole>this.$roleSelector.value;
    const subrole = <StyleSubrole>this.$subroleSelector.value;
    if (role != this.style.role || subrole != this.style.subrole) {
      const changeRequest: StyleConvertRequest = { type: 'convertStyle', styleId: this.style.id, role, subrole };
      changeRequests.push(changeRequest);
    }

    const styleType = <StyleType>this.$typeSelector.value;
    const data = this.$textArea.value;
    if (styleType != this.repStyle.type) {
      const changeRequest: StyleConvertRequest = { type: 'convertStyle', styleId: this.style.id, styleType, data };
      changeRequests.push(changeRequest);
    } else if (data != this.repStyle.data) {
      const changeRequest: StyleChangeRequest = { type: 'changeStyle', styleId: this.repStyle.id, data };
      changeRequests.push(changeRequest);
    }

    this.dismissCallback(changeRequests);
  }

  public focus(): void { this.$textArea.focus(); }

  // ----- Private -----

  // Private Constructor

  private constructor(
    style: StyleObject,
    repStyle: StyleObject,
    dismissCallback: DismissCallback,
  ) {
    this.style = style;
    this.repStyle = repStyle;

    this.$elt = $new('div', { class: 'inputPanel' });

    // Three rows: preview, error message, and input row.
    this.$preview = $new('div', { appendTo: this.$elt, class: 'preview' });
    this.$messages = $new('div', { appendTo: this.$elt, class: 'messages' });
    const $inputRow = $new('div', { appendTo: this.$elt, class: 'inputRow' });

    // Input row contains role/subrole/type selectors, and textarea.
    const $selectors = $new<HTMLDivElement>('div', { appendTo: $inputRow, class: 'selectors' });
    this.$textArea = $new<HTMLTextAreaElement>('textarea', {
      appendTo: $inputRow,
      listeners: {
        input: (event)=>this.onInput(event),
        keyup: (event)=>this.onKeyUp(event),
      }
    });
    this.$textArea.value = repStyle.data;

    // Populate the selectors
    this.constructSelectors($selectors, style, repStyle);

    // Render preview
    this.changeRenderer(repStyle.type);
    this.renderPreview(repStyle.data);

    this.dismissCallback = dismissCallback;
  }

  // Private Instance Properties

  private $messages: HTMLDivElement;
  private $preview: HTMLDivElement;
  private $roleSelector!: HTMLSelectElement;
  private $subroleSelector!: HTMLSelectElement;
  private $textArea: HTMLTextAreaElement;
  private $typeSelector!: HTMLSelectElement;
  private dismissCallback: DismissCallback;
  private repStyle: StyleObject;
  private style: StyleObject;
  private renderer!: Renderer;

  // Private Instance Methods

  private changeRenderer(type: StyleType): void {
    this.renderer = getRenderer(type);
  }

  private constructSelectors($selectors: HTMLDivElement, style: StyleObject, repStyle: StyleObject): void {

    // Role selector
    const $roleSelector = this.$roleSelector = $new<HTMLSelectElement>('select', {
      appendTo: $selectors,
      listeners: { input: e=>this.onRoleSelectorChange(e), }
    });
    for (const [ value, html ] of ROLE_OPTIONS) {
      $new<HTMLOptionElement>('option', {
        appendTo: $roleSelector,
        attrs: { value, selected: (value == style.role) },
        html
      });
    }

    // Subrole selector
    this.$subroleSelector = $new<HTMLSelectElement>('select', {
      appendTo: $selectors,
      listeners: { input: e=>this.onSubroleSelectorChange(e), }
    });
    this.populateSubroleSelector(style.role, style.subrole!);

    // Type selector
    this.$typeSelector = $new<HTMLSelectElement>('select', {
      appendTo: $selectors,
      listeners: { input: e=>this.onTypeSelectorChange(e), }
    });
    this.populateTypeSelector(style.role, repStyle.type);
  }

  private populateSubroleSelector(role: StyleRole, subrole?: StyleSubrole): void {
    this.$subroleSelector.innerHTML = '';
    for (const [ value, html ] of SUBROLE_OPTIONS.get(role)!) {
      $new<HTMLOptionElement>('option', {
        appendTo: this.$subroleSelector,
        attrs: { value, selected: (value === subrole) },
        html
      });
    }
  }

  private populateTypeSelector(role: StyleRole, type?: StyleType): void {
    this.$typeSelector.innerHTML = '';
    for (const [ value, html ] of TYPE_OPTIONS.get(role)!) {
      $new<HTMLOptionElement>('option', {
        appendTo: this.$typeSelector,
        attrs: { value, selected: (value === type) },
        html
      });
    }
  }

  private renderPreview(data: string): void {
    const { html, errorHtml } = this.renderer(data);
    if (html) { this.$preview.innerHTML = html; }
    this.$messages.innerHTML = errorHtml || '';
  }

  // Private Event Handlers

  private onInput(_event: Event): void {
    const text = this.$textArea.value;
    this.renderPreview(text);
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

  private onRoleSelectorChange(event: Event /* REVIEW: More specific event? */): void {
    const role = <StyleRole>(<HTMLSelectElement>event.target).value;
    this.populateSubroleSelector(role);
    this.populateTypeSelector(role);
    // const subrole = 'UNKNOWN';
    // const changeRequest: NotebookChangeRequest = { type: 'convertStyle', styleId: this.styleId, role, subrole };
    // this.notebookView.openNotebook.sendChangeRequest(changeRequest, { wantUndo: true });
  }

  private onSubroleSelectorChange(_event: Event /* REVIEW: More specific event? */): void {
    // const subrole = <StyleSubrole>(<HTMLSelectElement>event.target).value;
    // TODO: Theoretically, preview should change.
  }

  private onTypeSelectorChange(event: Event /* REVIEW: More specific event? */): void {
    const type = <StyleType>(<HTMLSelectElement>event.target).value;
    this.changeRenderer(type);
    const text = this.$textArea.value;
    this.renderPreview(text);
  }

}
