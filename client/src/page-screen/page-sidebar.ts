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

import { ButtonBar } from "../button-bar"
import { ClientNotebook } from "../client-notebook"
import { PageView } from "./page-view"

// Types

// Constants

// Global Variables

// Exported Class

export class PageSidebar extends ButtonBar {

  // Class Methods

  public static create($parent: HTMLElement, notebook: ClientNotebook): PageSidebar {
    return new this($parent, notebook);
  }

  // Instance Properties


  // Instance Methods

  public connect(_notebook: ClientNotebook, _pageView: PageView): void { }

  // -- PRIVATE --

  // Constructor

  private constructor($parent: HTMLElement, _notebook: ClientNotebook) {
    super({
      tag: 'div',
      appendTo: $parent,
      class: 'sidebar',
     });
  }

  // Private Instance Properties

  // Private Instance Methods

  // Private Event Handlers


}