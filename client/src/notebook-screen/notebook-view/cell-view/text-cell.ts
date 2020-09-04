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

import { StyleObject } from "../../../shared/notebook"
import { NotebookView } from "../../../notebook-screen/notebook-view"
import { getRenderer } from "../../../renderers"

import { CellView } from "./index"

// Types

// Constants

// Class

export class TextCellView extends CellView {

  // Class Methods

  public static create(notebookView: NotebookView, style: StyleObject): TextCellView {
    const instance = new this(notebookView, style);
    instance.render(style);
    return instance;
  }

  // Instance Methods

  public render(style: StyleObject): void {
    const renderer = getRenderer(style.type);
    const { html, errorHtml } = renderer(style.data);
    // TODO: Error formatting.
    if (html) { this.$elt.innerHTML = html; }
    else { this.$elt.innerHTML = errorHtml!; }
  }

  // -- PRIVATE --

  // Constructor

  private constructor(notebookView: NotebookView, style: StyleObject) {
    super(notebookView, style, 'textCell');
  }
}
