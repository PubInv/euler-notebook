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

import { $new, escapeHtml, Html } from './dom.js';
import { getKatex } from './katex-types.js';
import { ThoughtObject, StyleObject, LatexData, ToolMenu } from './math-tablet-api.js';
import { Notebook } from './notebook.js';

// Exported Class

export class ThoughtElement {

  // Class Methods

  static insert(notebook: Notebook, thought: ThoughtObject): ThoughtElement {
    var rval = new this(notebook, thought);
    notebook.$elt.appendChild(rval.$elt);
    return rval;
  }

  // Instance Properties

  public $elt: HTMLDivElement;
  public thought: ThoughtObject;
  public notebook: Notebook;

  // Instance Methods

  delete(): void {
    const $parent = this.$elt.parentElement;
    if (!$parent) { throw new Error("Thought element has no parent in delete."); }
    $parent.removeChild(this.$elt);
  }

  deleteStyle(style: StyleObject): void {
    if (style.type == 'LATEX') {
      const $formulaElt = this.$elt.querySelector('.formula');
      $formulaElt!.innerHTML = '';
    }
  }

  // REVIEW: This is very fragile in the ordering of style insertions.
  //         For example, if LaTeX input-alt comes in after error, the error message
  //         will be obliterated.
  insertStyle(style: StyleObject): void {
    switch(style.meaning) {
      case 'ATTRIBUTE':
        if (style.type == 'TOOL-MENU') { this.renderToolMenu(style); }
        break;
      case 'ERROR': this.renderErrorMessage(style); break;
      case 'EXPOSITION':
        if (style.type == 'HTML') { this.renderHtml(style.data); }
        else if (style.type == 'TEXT') { this.renderText(style.data); }
        else { throw new Error(`Unexpected data type for exposition: ${style.type}.`); }
        break;
      case 'INPUT':
        if (style.type == 'LATEX') { this.renderLatexFormula(style.data); }
        else if (style.type == 'TEXT') { this.renderText(style.data); }
        else { this.renderOtherInput(style); }
        break;
      case 'INPUT-ALT':
        if (style.type == 'LATEX') { this.renderLatexFormula(style.data); }
        else if (style.type == 'TEXT') { this.renderText(style.data); }
        break;
      case 'PLOT': this.renderPlot(style); break;
    }
  }

  // PRIVATE

  // Private Constructor

  private constructor(notebook: Notebook, thought: ThoughtObject) {
    this.notebook = notebook;
    this.thought = thought;
    this.$elt = this.createElement();
  }


  // Private Instance Methods

  private createElement(): HTMLDivElement {
    const thoughtId = this.thought.id;
    const $rval = $new<HTMLDivElement>('div', {
      id: `T${thoughtId}`,
      class: 'thought',
      html:
`<div class="handle">(${thoughtId})</div>
<div class="status"></div>
<div class="formula"></div>
<div class="tools"></div>`
    });
    // <button class="deleteThought"></button>`);
    const $deleteButton = $new<HTMLButtonElement>('button', { class: 'deleteThought', html: "&#x2715;" });
    $deleteButton.addEventListener('click', (_event: MouseEvent)=>{
      this.notebook.deleteThought(thoughtId);
    });

    $rval.appendChild($deleteButton);
    return $rval;
  }

  private renderErrorMessage(style: StyleObject): void {
    if (style.type != 'TEXT') {
      console.error(`Don't know how to render ${style.type} error.`);
      return;
    }
    const $formulaElt = this.$elt.querySelector('.formula');
    const escapedText = escapeHtml(style.data);
    const html = `<div class="error">${escapedText}</div>${$formulaElt!.innerHTML}`;
    $formulaElt!.innerHTML = html;
  }

  private renderHtml(html: Html): void {
    const $formulaElt = this.$elt.querySelector('.formula');
    $formulaElt!.innerHTML = html;
  }

  private renderLatexFormula(latexData: LatexData): void {
    const $formulaElt = this.$elt.querySelector('.formula');
    let html;
    try {
      html = getKatex().renderToString(latexData, {});
    } catch(err) {
      html = `<div class="error">${escapeHtml(err.message)}</div><tt>${escapeHtml(latexData)}</tt>`
    }
    $formulaElt!.innerHTML = html;
  }

  private renderOtherInput(style: StyleObject): void {
    if (typeof style.data != 'string') {
      console.error(`Don't know how to render non-string input ${typeof style.data}`);
      return;
    }
    const $formulaElt = this.$elt.querySelector('.formula');
    $formulaElt!.innerHTML = `<tt>${escapeHtml(style.data)}</tt>`;
  }

  private renderPlot(style: StyleObject): void {
    if (style.type != 'IMAGE') {
      console.error(`Don't know how to handle plot of type ${style.type}`);
      return;
    }
    const url: string = style.data;
    const $formulaElt = this.$elt.querySelector('.formula');
    $formulaElt!.innerHTML = `<image src="${url}"/>`
  }

  private renderText(text: string): void {
    const $formulaElt = this.$elt.querySelector('.formula');
    $formulaElt!.innerHTML = escapeHtml(text);
  }

  private renderToolMenu(style: StyleObject): void {
    const toolMenu: ToolMenu = style.data;
    const $toolsElt = this.$elt.querySelector('.tools');
    for (const info of toolMenu) {
      const $button = $new('button', { class: 'tool', html: info.html });
      $button.addEventListener('click', (_event: MouseEvent)=>{
        this.notebook.useTool(this, style.source, info);
      });
      $toolsElt!.appendChild($button);
    };
  }

}
