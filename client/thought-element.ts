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
import { StyleObject, LatexData, ToolMenu, StyleId, RelationshipObject } from './math-tablet-api.js';
import { Notebook } from './notebook.js';

// Exported Class

export class ThoughtElement {

  // Class Methods

  static insert(notebook: Notebook, style: StyleObject): ThoughtElement {
    var rval = new this(notebook, style);
    notebook.$elt.appendChild(rval.$elt);
    return rval;
  }

  // Instance Properties

  public $elt: HTMLDivElement;
  public style: StyleObject;
  public notebook: Notebook;

  // Instance Methods

  public delete(): void {
    const $parent = this.$elt.parentElement;
    if (!$parent) { throw new Error("Thought element has no parent in delete."); }
    $parent.removeChild(this.$elt);
  }

  public deleteStyle(style: StyleObject): void {
    if (!style.parentId) {

    } else {
      if (style.type == 'LATEX') {
        const $formulaElt = this.$elt.querySelector('.formula');
        $formulaElt!.innerHTML = '';
      }
    }
  }

  // REVIEW: This is very fragile in the ordering of style insertions.
  //         For example, if LaTeX input-alt comes in after error, the error message
  //         will be obliterated.
  public insertStyle(style: StyleObject): void {
    console.log(`Inserting style ${style.id} ${style.meaning} ${style.type}`);
    switch(style.meaning) {
      case 'ATTRIBUTE':
        if (style.type == 'TOOL-MENU') { this.renderToolMenu(style); }
        break;
      case 'ERROR': this.renderErrorMessage(style); break;
      case 'EXPOSITION':
        console.dir(style);
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
      default:
    }
  }

  public deleteEquivalence(relationship: RelationshipObject): void {
//    const $formulaElt = this.$elt.querySelector('.formula');
    console.log(relationship);
    const element = document.getElementById("relationship"+relationship.id);
    if (element != null) {
      // @ts-ignore
      element.parentNode.removeChild(element);
    }
  }

  public insertEquivalence(relationship: RelationshipObject): void {
    const $formulaElt = this.$elt.querySelector('.formula');
    let childStyle = this.notebook.getStyleFromKey(relationship.sourceId);
    if (childStyle) {
      const thought = this.notebook.topLevelStyleOf(childStyle).style.id;
      const preamble = `<p id=${"relationship"+relationship.id}> = { (${thought}) (From Mathematica CAS) } </p>`;
      $formulaElt!.innerHTML = preamble + $formulaElt!.innerHTML;
    }
  }

  public select(): void {
    this.$elt.classList.add('selected');
  }

  public unselect(): void {
    this.$elt.classList.remove('selected');
  }

  // PRIVATE

  // Private Constructor

  private constructor(notebook: Notebook, thought: StyleObject) {
    this.notebook = notebook;
    this.style = thought;
    this.$elt = this.createElement();
  }


  // Private Instance Methods

  private createElement(): HTMLDivElement {
    const styleId: StyleId = this.style.id!;
    const $rval = $new<HTMLDivElement>('div', {
      id: `T${styleId}`,
      class: 'thought',
    });

    // <div class="handle">(1)</div>
    const selectClickHandler = (event: MouseEvent)=>{ this.notebook.selectStyle(styleId, event); };
    const $handle = $new<HTMLDivElement>('div', { class: 'handle', html: `(${styleId})`, appendTo: $rval });
    $handle.addEventListener('click', selectClickHandler);

    // <div class="status"></div>
    const $status = $new<HTMLDivElement>('div', { class: 'status', html: "&nbsp;", appendTo: $rval });
    $status.addEventListener('click', selectClickHandler);

    // <div class="formula"></div>
    $new<HTMLDivElement>('div', { class: 'formula', appendTo: $rval });

    // <div class="tools"></div>`
    $new<HTMLDivElement>('div', { class: 'tools', appendTo: $rval });

    // <button class="deleteStyle"></button>`);
    const $deleteButton = $new<HTMLButtonElement>('button', { class: 'deleteStyle', html: "&#x2715;", appendTo: $rval });
    $deleteButton.addEventListener('click', (_event: MouseEvent)=>{
      this.notebook.deleteStyle(styleId);
    });

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
