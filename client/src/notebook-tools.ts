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

import { StyleId, FindStyleOptions } from "./shared/notebook"
import { SymbolTable, ToolData } from "./shared/math-tablet-api"

import { $new, escapeHtml, Html } from "./dom"
import { NotebookView } from "./notebook-view"
import { getRenderer } from "./renderers"

// Types

// Constants

// Global Variables

// Class

export class NotebookTools {

  // Class Methods

  public static create($parent: HTMLElement): NotebookTools {
    return new this($parent);
  }

  // Instance Methods

  public clear(): void {
    this.$elt.innerHTML = '';
  }

  public connect(view: NotebookView): void {
    this.view = view;
  }

  public render(styleId: StyleId): void {
    const style = this.view.notebook.getStyle(styleId);


    // Render the symbol table
    const findOptions: FindStyleOptions = { role: 'SYMBOL-TABLE', /* recursive: true */ };
    const symbolTableStyle = this.view.notebook.findStyle(findOptions, style.id);
    if (symbolTableStyle) {
      const symbolTableData = <SymbolTable>symbolTableStyle.data;
      let html = '<tr><td colspan="2">Symbols</td></tr>';
      for (const [symbol, constraints] of Object.entries(symbolTableData)) {
        html += `<tr><td>${escapeHtml(symbol)}</td><td>${constraints.map(c=>escapeHtml(c)).join('; ')}</td></tr>`
      }
      const $table = $new({ tag: 'table', class: 'symbolTable', html });
      this.$elt.appendChild($table);
    }

    // REVIEW: If we attached tool styles to the top-level style,
    //         then we would not need to do a recursive search.
    const findOptions2: FindStyleOptions = { type: 'TOOL-DATA', recursive: true };
    const toolStyles = this.view.notebook.findStyles(findOptions2, style.id);
    for (const toolStyle of toolStyles) {
      const toolData: ToolData = toolStyle.data;
      let html: Html;
      if (toolData.tex) {
        const latexRenderer = getRenderer('TEX-EXPRESSION');
        const results = latexRenderer!(toolData.tex);
        if (results.html) { html = results.html; }
        else { html = results.errorHtml!; }
      } else {
        html = toolData.html!;
      }
      const $button = $new({
        tag: 'button',
        class: 'tool',
        html,
        listeners: { 'click': _e=>this.view.useTool(toolStyle.id) }
      });
      this.$elt.appendChild($button);
    }
  }

  // -- PRIVATE --

  // Constructor

  private constructor($parent: HTMLElement) {
    this.$elt = $new({
      tag: 'div',
      appendTo: $parent,
      class: 'tools',
    });
  }

  // Private Instance Properties

  private $elt: HTMLDivElement;
  private view!: NotebookView;    // Initialized in connect.

  // Private Instance Property Functions

  // Private Instance Methods

  // Private Event Handlers

}
