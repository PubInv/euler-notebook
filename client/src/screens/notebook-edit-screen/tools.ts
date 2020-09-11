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

import { StyleId, FindStyleOptions } from "../../shared/notebook";
import { SymbolTable, ToolData } from "../../shared/math-tablet-api";

import { $new, escapeHtml, Html } from "../../dom";
import { getRenderer } from "../../renderers";
import { HtmlElement } from "../../html-element";
import { NotebookEditScreen } from ".";

// Types

// Constants

// Global Variables

// Class

export class Tools extends HtmlElement<'div'>{

  // Class Methods

  // Public Constructor

  public constructor(screen: NotebookEditScreen) {
    super({
      tag: 'div',
      appendTo: screen.$elt,
      class: 'tools',
    });
    this.screen = screen;
  }

  // Instance Methods

  public clear(): void {
    this.$elt.innerHTML = '';
  }

  public render(styleId: StyleId): void {
    const style = this.screen.notebook.getStyle(styleId);


    // Render the symbol table
    const findOptions: FindStyleOptions = { role: 'SYMBOL-TABLE', /* recursive: true */ };
    const symbolTableStyle = this.screen.notebook.findStyle(findOptions, style.id);
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
    const toolStyles = this.screen.notebook.findStyles(findOptions2, style.id);
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
        listeners: { 'click': _e=>this.screen.view.useTool(toolStyle.id) }
      });
      this.$elt.appendChild($button);
    }
  }

  // -- PRIVATE --

  // Private Instance Properties

  private screen: NotebookEditScreen;

  // Private Instance Property Functions

  // Private Instance Methods

  // Private Event Handlers

}
