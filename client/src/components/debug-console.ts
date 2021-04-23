/*
Euler Notebook
Copyright (C) 2021 Public Invention
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

// import * as debug1 from "debug";
// const debug = debug1('client:debug-console');

import { assert, ElementId, Html } from "../shared/common";

import { HtmlElement } from "../html-element";
import { $new } from "../dom";

// import { userSettingsInstance, InputMode } from "../user-settings";

// Types

// Constants

// Global Variables

// Class

export class DebugConsole extends HtmlElement<'div'> {

  // Public Class Properties

  public static singleton?: DebugConsole;

  // Public Class Methods

  // Public Constructor

  public static addMessage(html: Html): void {
    assert(this.singleton);
    this.singleton!.addMessage(html);
  }

  // Public Constructor

  public constructor() {
    assert(!DebugConsole.singleton);
    super({
      tag: 'div',
      id: <ElementId>'debugConsole',
    });
    DebugConsole.singleton = this;
  }

  // Public Instance Property Functions

  // Public Instance Methods

  public addMessage(html: Html): void {
    const $message = $new<'div'>({ tag: 'div', html });
    this.$elt.append($message);
    this.scrollToBottom();
  }

  // Public Instance Event Handlers

  // -- PRIVATE --

  // Private Instance Properties

  // Private Instance Methods

  private scrollToBottom(): void {
    this.$elt.scrollTop = this.$elt.scrollHeight;
  }

  // Private Instance Event Handlers

}

// Helper Functions
