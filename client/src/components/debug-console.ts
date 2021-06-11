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

import { assert, ElementId, escapeHtml } from "../shared/common";

import { HtmlElement } from "../html-element";
import { $new } from "../dom";

// import { userSettingsInstance, InputMode } from "../user-settings";

// Types

// Constants

// Global Variables

export let debugConsole: DebugConsole;

// Exported Functions

// Class

export class DebugConsole extends HtmlElement<'div'> {

  // Public Class Properties

  // Public Class Methods

  public static initialize(): DebugConsole {
    assert(!debugConsole);
    debugConsole = new this();
    return debugConsole;
  }

  // Public Constructor

  // Public Constructor

  public constructor() {
    super({ tag: 'div', id: <ElementId>'debugConsole', hidden: true });
  }

  // Public Instance Property Functions

  // Public Instance Methods

  public emit(message: string): void {
    const $message = $new<'div'>({ tag: 'div', html: escapeHtml(message) });
    this.$elt.append($message);
    this.scrollToBottom();
  }

  public emitObject(obj: /* TYPESCRIPT: JsonObject? */any, prefix?: string): void {
    const json = JSON.stringify(obj);
    if (prefix) {
      this.emit(`${prefix}: ${json}`);
    } else {
      this.emit(json);
    }
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
