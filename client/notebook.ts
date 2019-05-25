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

import { NotebookName, TDocObject, StyleId, StyleObject,
  ThoughtId, ThoughtObject, NotebookChange, ThoughtProperties, StyleProperties, RelationshipId, RelationshipObject } from './math-tablet-api.js';
// import { Jiix, StrokeGroups } from './myscript-types.js';
import { StyleElement } from './style-element.js';
import { ThoughtElement } from './thought-element.js';
import { $new, Html } from './dom.js';
import { RelationshipElement } from './relationship-element.js';

// Exported Class

export class Notebook {

  // Class Methods

  public static get(notebookName: NotebookName): Notebook|undefined {
    return this.notebooks.get(notebookName);
  }

  public static open(socket: ServerSocket, notebookName: NotebookName, notebookData: TDocObject): Notebook {
    let notebook = this.notebooks.get(notebookName);
    if (!notebook) {
      notebook = new this(socket, notebookName, notebookData);
      this.notebooks.set(notebookName, notebook);
    }
    return notebook;
  }

  // Instance Properties

  public $elt: HTMLElement;
  public notebookName: NotebookName;

  // Instance Property Functions

  public debugHtml(): Html {
    return Array.from(this.thoughtElements.values()).map(t=>this.debugThoughtHtml(t)).join('');
  }

  // Instance Methods

  public close() {
    // TODO: remove event listeners?
    // TODO: delete element?
    // TODO: mark closed?
    this.clear();
    Notebook.notebooks.delete(this.notebookName);
  }

  // Server Message Handlers

  public smChange(change: NotebookChange): void {
    switch (change.type) {
      case 'relationshipDeleted': this.chDeleteRelationship(change.relationship.id); break;
      case 'relationshipInserted': this.chInsertRelationship(change.relationship); break;
      case 'styleDeleted': this.chDeleteStyle(change.styleId); break;
      case 'styleInserted': this.chInsertStyle(change.style); break;
      case 'thoughtDeleted': this.chDeleteThought(change.thoughtId); break;
      case 'thoughtInserted': this.chInsertThought(change.thought); break;
    }
  }

  public smClose(): void { return this.close(); }

  public insertThought(thoughtProps: ThoughtProperties, stylePropss: StyleProperties[]): void {
    this.socket.sendMessage({ action: 'insertThought', notebookName: this.notebookName, thoughtProps, stylePropss });
  }

  // -- PRIVATE --

  // Private Class Properties

  private static notebooks: Map<NotebookName, Notebook> = new Map();
  
  // Private Constructor

  private constructor(socket: ServerSocket, notebookName: NotebookName, notebookData: TDocObject) {
    this.socket = socket;
    this.notebookName = notebookName;

    this.$elt = $new('div', notebookName, ['tdoc']);
    this.$elt.addEventListener('click', (event: MouseEvent)=>{ this.onClick(event); })

    this.relationshipElements = new Map();
    this.styleElements = new Map();
    this.thoughtElements = new Map();

    for (const thought of notebookData.thoughts) { this.chInsertThought(thought); }
    for (const style of notebookData.styles) { this.chInsertStyle(style); }
  }

  // Private Instance Properties

  private socket: ServerSocket;
  private relationshipElements: Map<RelationshipId, RelationshipElement>;
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

  private chDeleteRelationship(relationshipId: RelationshipId): void {
    const relationshipElt = this.relationshipElements.get(relationshipId);
    if (!relationshipElt) { throw new Error("Delete relationship message for unknown style"); }
    relationshipElt.delete();
    this.relationshipElements.delete(relationshipId);
  }

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

  private chInsertRelationship(relationship: RelationshipObject): void {
    let elt: ThoughtElement|StyleElement|undefined;
    elt = this.thoughtElements.get(relationship.sourceId);
    if (!elt) {
      elt = this.styleElements.get(relationship.sourceId);
    }
    if (!elt) { throw new Error("Relationship attached to unknown thought or style."); }
    const relationshipElt = RelationshipElement.insert(elt.$elt, relationship);;
    this.relationshipElements.set(relationship.id, relationshipElt);
  }

  private chInsertStyle(style: StyleObject): void {
    let elt: ThoughtElement|StyleElement|undefined;
    elt = this.thoughtElements.get(style.stylableId);
    if (!elt) {
      elt = this.styleElements.get(style.stylableId);
    }
    if (!elt) { throw new Error("Style attached to unknown thought or style."); }
    const styleElt = StyleElement.insert(elt.$elt, style);
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

  private debugRelationshipHtml(r: RelationshipElement): Html {
    return `<div><span class="leaf">R${r.relationship.id} &#x27a1; ${r.relationship.targetId}</span></div>`;
  }

  private debugStyleHtml(s: StyleElement): Html {
    const styleElements = this.stylesAttachedToStyle(s);
    const relationshipElements = this.relationshipsAttachedToStyle(s);
    const json = JSON.stringify(s.style.data);
    if (styleElements.length == 0 && relationshipElements.length == 0 && json.length<30) {
      return `<div><span class="leaf">S${s.style.id} ${s.style.type} ${s.style.meaning} ${s.style.source} <tt>${json}</tt></span></div>`;
    } else {
      const stylesHtml = styleElements.map(s=>this.debugStyleHtml(s)).join('');
      const relationshipsHtml = relationshipElements.map(r=>this.debugRelationshipHtml(r)).join('');
      const [ shortJsonTt, longJsonTt ] = json.length<30 ? [` <tt>${json}</tt>`, ''] : [ '', `<tt>${json}</tt>` ];
      return `<div>
  <span class="collapsed">S${s.style.id} ${s.style.type} ${s.style.meaning} ${s.style.source}${shortJsonTt}</span>
  <div class="nested" style="display:none">${longJsonTt}
    ${stylesHtml}
    ${relationshipsHtml}
  </div>
</div>`;
    }
  }

  private debugThoughtHtml(t: ThoughtElement): Html {
    const styleElements = this.stylesAttachedToThought(t);
    const relationshipElements = this.relationshipsAttachedToThought(t);
    if (styleElements.length == 0 && relationshipElements.length == 0) {
      return `<div><span class="leaf">T${t.thought.id}</span></div>`;
    } else {
      const stylesHtml = styleElements.map(s=>this.debugStyleHtml(s)).join('');
      const relationshipsHtml = relationshipElements.map(r=>this.debugRelationshipHtml(r)).join('');
      return `<div>
  <span class="collapsed">T${t.thought.id}</span>
  <div class="nested" style="display:none">
    ${stylesHtml}
    ${relationshipsHtml}
  </div>
</div>`;
    }
  }

  private relationshipsAttachedToStyle(s: StyleElement): RelationshipElement[] {
    return Array.from(this.relationshipElements.values()).filter(r=>r.relationship.sourceId==s.style.id);
  }

  private relationshipsAttachedToThought(t: ThoughtElement): RelationshipElement[] {
    return Array.from(this.relationshipElements.values()).filter(r=>r.relationship.sourceId==t.thought.id);
  }

  private stylesAttachedToStyle(s: StyleElement): StyleElement[] {
    return Array.from(this.styleElements.values()).filter(s2=>s2.style.stylableId==s.style.id);
  }

  private stylesAttachedToThought(t: ThoughtElement): StyleElement[] {
    return Array.from(this.styleElements.values()).filter(s=>s.style.stylableId==t.thought.id);
  }

}