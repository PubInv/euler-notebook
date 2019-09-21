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

import { assert } from './common.js';
import { escapeHtml, $new, Html } from './dom.js';
import { getKatex } from './katex-types.js';
import { NotebookView } from './notebook-view.js';
import { KeyboardInputPanel } from './keyboard-input-panel.js';
import { StyleObject, StyleId, RelationshipObject } from './notebook.js';
import { LatexData, ToolInfo, NameValuePair } from './math-tablet-api.js';
import { rendererMap } from './renderers.js';

// Exported Class

export class CellView {

  // Class Methods

  public static create(notebook: NotebookView, style: StyleObject): CellView {
    return new this(notebook, style);
  }

  // Instance Properties

  public $elt: HTMLDivElement;
  public style: StyleObject;
  public notebookView: NotebookView;
  public equivalentStyles: StyleId[];

  public isSelected(): boolean {
    return this.$elt.classList.contains('selected');
  }

  // Instance Methods

  public changeStyle(style: StyleObject, _previousData: any): void {
    // TEMPORARY HACK: The way rendering is currently implemented ("Last one wins"), it doesn't matter whether the
    // style is being inserted or changed.
    this.insertStyle(style);
  }

  public deleteTool(styleId: StyleId): void {
    const element = document.getElementById("tool"+styleId);
    if (element != null) {
      // @ts-ignore
      element.parentNode.removeChild(element);
    }
  }

  public deleteStyle(style: StyleObject): void {
    if (!style.parentId) { return; }

    if (style.type == 'LATEX') {
      const $formulaElt = this.$elt.querySelector('.formula');
      $formulaElt!.innerHTML = '';
    }
    if (style.type == 'TOOL') {
      // We embed the id into the HTML so that we can delete
      // specific objects, so taht multiple tools can in theory be
      // delete and added to a given thought. The fundamental problem
      // we are trying to solve is that they mutate, but there are many
      // potential tools on one thought.
      this.deleteTool(style.id);
    }
  }

  public editMode(): boolean {
    // Returns true iff cell was put into edit mode.

    // REVIEW: Not completely sure we will not get double-clicks.
    //         We may need to stopPropagation or preventDefault
    //         in the right places.
    assert(!this.keyboardInputPanel);

    // Only allow editing of user input cells, which have a data type
    // that is string-based, with a renderer.
    const renderer = rendererMap.get(this.style.type);
    if (this.style.meaning!='INPUT' || typeof this.style.data!='string') { return false; }

    this.keyboardInputPanel = KeyboardInputPanel.create(
      this.style.data,
      renderer!,
      (text)=>this.onKeyboardInputPanelDismissed(text)
    );
    this.$elt.parentElement!.insertBefore(this.keyboardInputPanel.$elt, this.$elt.nextSibling);
    this.keyboardInputPanel.focus();
    this.hide();
    return true;
  }

  // REVIEW: This is very fragile in the ordering of style insertions.
  //         For example, if LaTeX input-alt comes in after error, the error message
  //         will be obliterated.
  // In fact I don't belive dealing with this on a per-style input basis
  // is a bad idea; a thought should be rendered based on being able to
  // render the entirety of the styles in the thought. As present,
  // These styles seem to "stomp on" each other.
  // On the other hand each "style" may legitimately be thought of as a
  // decoration; the problem here is that we have poor representation of
  // what has yet been rendered.  Dealing with the HTML itself is rather
  // awkward.  Looking at the parent of the style may work, but is
  // awkward in a different way.
  public insertStyle(style: StyleObject): void {
    // console.log(`Inserting style ${style.id} ${style.meaning} ${style.type}`);
    switch(style.meaning) {
      case 'ATTRIBUTE':
        if (style.type == 'TOOL') { this.renderTool(style); }
        break;
      case 'ERROR': this.renderErrorMessage(style); break;
      case 'EXPOSITION':
        if (style.type == 'HTML') { this.renderHtml(style.data); }
        else if (style.type == 'TEXT') { this.renderText(style.data); }
        else { assert(false, `Unexpected data type for exposition: ${style.type}.`); }
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
      case 'DECORATION':
        if (style.type == 'LATEX') { this.renderLatexFormula(style.data); }
        else if (style.type == 'TEXT') { this.renderText(style.data); }
        break;
      case 'PLOT':
        this.renderPlot(style);
        break;
      case 'EQUATION-SOLUTION': this.renderSolution(style);
        break;
        // This is currently a "promotion" which is a form of input,
        // so make it a high-level thought is slightly inconsistent.
      case 'SYMBOL-DEFINITION':
        if (style.type == 'SYMBOL') { this.renderDefinition(style); }
        break;
      default:
    }
  }

  public constructEquivalencePreamble() : string{
    const element = document.getElementById("relationship"+this.style.id);
    if (element != null) {
      // @ts-ignore
      element.parentNode.removeChild(element);
    }
    this.equivalentStyles = this.equivalentStyles.sort();
    const preamble = (this.equivalentStyles.length > 0) ?
      `<p id=${"relationship"+this.style.id}> = { (${this.equivalentStyles}) (From Mathematica CAS) } </p>` :
      "";
    return preamble;
  }

  public deleteEquivalence(relationship: RelationshipObject): void {
    var index = this.equivalentStyles.indexOf(relationship.fromId);
    if (index !== -1) this.equivalentStyles.splice(index, 1);

    const preamble = this.constructEquivalencePreamble();

    const $formulaElt = this.$elt.querySelector('.formula');
    $formulaElt!.innerHTML = preamble + `<tt>${escapeHtml(this.style.data)}</tt>`;

  }

  public insertEquivalence(relationship: RelationshipObject): void {
    const $formulaElt = this.$elt.querySelector('.formula');
    if ($formulaElt) {
      if (relationship.toId == this.style.id) {
        this.equivalentStyles.push(relationship.fromId);
      }
      this.equivalentStyles = this.equivalentStyles.sort();

      const preamble = this.constructEquivalencePreamble();
      $formulaElt!.innerHTML = preamble + `<tt>${escapeHtml(this.style.data)}</tt>`;
    }
  }

  public select(): void {
    this.$elt.classList.add('selected');
  }

  public unselect(): void {
    if (this.keyboardInputPanel) {
      // 'dismiss' will call the callback function, onKeyboardInputPanelDismissed,
      // which will delete the keyboard input panel and show ourself.
      this.keyboardInputPanel.dismiss(false);
    }
    this.$elt.classList.remove('selected');
  }

  // PRIVATE

  // Private Constructor

  private constructor(notebook: NotebookView, thought: StyleObject) {
    this.notebookView = notebook;
    this.style = thought;
    this.$elt = this.createElement();
    this.equivalentStyles = [];
  }

  // Private Instance Properties

  private keyboardInputPanel?: KeyboardInputPanel;

  // Private Event Handlers

  private onKeyboardInputPanelDismissed(text: string|undefined): void {
    if (text) {
      this.notebookView.changeStyle(this.style.id, text);
    }
    this.$elt.parentElement!.removeChild(this.keyboardInputPanel!.$elt);
    delete this.keyboardInputPanel;

    this.show();
    // this.notebookView.$elt.focus();
  }

  // Private Instance Methods

  private createElement(): HTMLDivElement {
    const styleId: StyleId = this.style.id!;

    // Create our div.
    const $elt = $new<HTMLDivElement>('div', {
      class: 'cell',
      id: `C${styleId}`,
    });

    // Create our child elements: handle, status, formula, tools, and delete button.
    $new<HTMLDivElement>('div', { class: 'handle', html: `(${styleId})`, appendTo: $elt });
    $new<HTMLDivElement>('div', { class: 'status', html: "&nbsp;", appendTo: $elt });
    $new<HTMLDivElement>('div', { class: 'formula', appendTo: $elt });
    $new<HTMLDivElement>('div', { class: 'tools', appendTo: $elt });

    return $elt;
  }

  private hide(): void {
    this.$elt.style.display = 'none';
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
    const renderer = rendererMap.get('LATEX');
    let { html, errorHtml } = renderer!(latexData);
    if (errorHtml) {
      html = `<div class="error">${errorHtml}</div><tt>${escapeHtml(latexData)}</tt>`;
    }
    $formulaElt!.innerHTML = html!;
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

  private renderSolution(style: StyleObject): void {
    const $formulaElt = this.$elt.querySelector('.formula');
    const current = $formulaElt!.innerHTML;
    console.log("current",current);
    $formulaElt!.innerHTML = current + '<br>' + '<font size="1">'+style.data + "</font>";
  }


  private renderText(text: string): void {
    const $formulaElt = this.$elt.querySelector('.formula');
    $formulaElt!.innerHTML = escapeHtml(text);
  }

  private renderDefinition(style: StyleObject): void {
    const $formulaElt = this.$elt.querySelector('.formula');

    const nvp : NameValuePair = style.data;

    // This is a hack; but if we are alread an input, we don't
    // want to overwrite therei.
    if (!$formulaElt!.innerHTML) {
      // NOT completely obvious this is best rendering.
      const render = nvp.name + " = " + nvp.value;
      $formulaElt!.innerHTML = escapeHtml(render);
    }
  }

  private renderTool(style: StyleObject): void {
    const info: ToolInfo = style.data;
    const $toolsElt = this.$elt.querySelector('.tools');
    // TODO: Use latexRenderer fro renderers.ts.
    const input = (info.tex) ?
      getKatex().renderToString(info.tex, {}) :
      info.html;
    const wrapped = `<span id="tool${style.id}">${input}</span>`;

    const $button = $new('button', { class: 'tool', html: wrapped });
    $button.addEventListener('click', (_event: MouseEvent)=>{
      this.notebookView.useTool(style.id);
    });
    $toolsElt!.appendChild($button);
  }

  private show(): void {
    this.$elt.style.display = 'flex';
  }

}

