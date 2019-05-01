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

import { ServerSocket } from './server-socket.js';

import { LatexText, MathJsText, NotebookName, TDocObject, StyleId, StyleObject,
  ThoughtId, ThoughtObject, NotebookChange } from './math-tablet-api.js';
import { Jiix, StrokeGroups } from './myscript-types.js';
import { StyleElement } from './style-element.js';
import { ThoughtElement } from './thought-element.js';
import { $new } from './dom.js';

// Exported Class

export class Notebook {

  // Class Methods

  public static open(socket: ServerSocket, notebookName: NotebookName, notebookData: TDocObject): Notebook {
    return new this(socket, notebookName, notebookData);
  }

  // Instance Properties

  public $elt: HTMLElement;
  public notebookName: NotebookName;

  // Instance Methods

  // Server Message Handlers

  public smChange(change: NotebookChange): void {
    switch (change.type) {
      case 'styleDeleted': this.chDeleteStyle(change.styleId); break;
      case 'thoughtDeleted': this.chDeleteThought(change.thoughtId); break;
      case 'styleInserted': this.chInsertStyle(change.style); break;
      case 'thoughtInserted': this.chInsertThought(change.thought); break;
    }
  }

  public smClose(): void {
    this.clear();
    // TODO: remove event listeners?
    // TODO: delete element?
  }

  public insertHandwrittenMath(latexMath: LatexText, jiix: Jiix): void {
    this.socket.sendMessage({ action: 'insertHandwrittenMath', notebookName: this.notebookName, latexMath, jiix });
  }

  public insertHandwrittenText(text: string, strokeGroups: StrokeGroups): void {
    this.socket.sendMessage({ action: 'insertHandwrittenText', notebookName: this.notebookName, text, strokeGroups });
  }

  public insertMathJsText(mathJsText: MathJsText): void {
    this.socket.sendMessage({ action: 'insertMathJsText', notebookName: this.notebookName, mathJsText });
  }

  // -- PRIVATE --

  private constructor(socket: ServerSocket, notebookName: NotebookName, notebookData: TDocObject) {
    this.socket = socket;
    this.notebookName = notebookName;

    this.$elt = $new('div', notebookName, ['tdoc']);
    this.$elt.addEventListener('click', (event: MouseEvent)=>{ this.onClick(event); })

    this.styleElements = new Map();
    this.thoughtElements = new Map();

    for (const thought of notebookData.thoughts) { this.chInsertThought(thought); }
    for (const style of notebookData.styles) { this.chInsertStyle(style); }
  }

  // Private Instance Properties

  private socket: ServerSocket;
  private styleElements: Map<StyleId, StyleElement>;
  private thoughtElements: Map<ThoughtId, ThoughtElement>;

  // Private Event Handlers

  private onClick(event: MouseEvent): void {
    const $target = <HTMLElement>event.target;
    if (!$target) { throw new Error("TDoc click event has no target!"); }
    if ($target.nodeName == 'BUTTON' && $target.classList.contains('deleteThought')) {
      const $parent = $target.parentElement;
      if (!$parent) { throw new Error("TDoc button has no parent!"); }
      const thoughtId = parseInt($parent.id.slice(1));
      this.socket.sendMessage({ action: 'deleteThought', notebookName: this.notebookName, thoughtId });
    }
  }

  // Private Change Event Handlers

  private chDeleteStyle(styleId: StyleId): void {
    const styleElt = this.styleElements.get(styleId);
    if (!styleElt) { throw new Error("Delete style message for unknown style"); }
    styleElt.delete();
    this.styleElements.delete(styleId);
  }

  private chDeleteThought(thoughtId: ThoughtId): void {
    const thoughtElt = this.thoughtElements.get(thoughtId);
    if (!thoughtElt) { throw new Error("Delete thought message for unknown thought"); }
    thoughtElt.delete();
    this.thoughtElements.delete(thoughtId);
  }

  private chInsertStyle(style: StyleObject): void {
    let elt: ThoughtElement|StyleElement|undefined;
    elt = this.thoughtElements.get(style.stylableId);
    if (!elt) {
      elt = this.styleElements.get(style.stylableId);
    }
    if (!elt) { throw new Error("Style attached to unknown thought or style."); }
    const styleElt = elt.insertStyle(style);
    this.styleElements.set(style.id, styleElt);
  }

  private chInsertThought(thought: ThoughtObject): void {
    const thoughtElt = ThoughtElement.insert(this.$elt, thought);
    this.thoughtElements.set(thought.id, thoughtElt);
  }

  // Private Instance Methods

  private clear(): void {
    this.$elt.innerHTML = '';
    this.thoughtElements.clear();
    this.styleElements.clear();
  }

}