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

import { StyleId, StyleObject, NotebookChange, RelationshipId, RelationshipObject, NotebookObject } from './notebook.js';
import { NotebookName, UseTool, StylePropertiesWithSubprops, ChangeNotebook, StyleDeleteRequest, StyleInsertRequest } from './math-tablet-api.js';
// import { Jiix, StrokeGroups } from './myscript-types.js';
import { ThoughtElement } from './thought-element.js';
import { $new, escapeHtml, Html } from './dom.js';

// Types

interface StyleIndex { [id:string]: StyleId[] }

// Exported Class

export class HtmlNotebook {

  // Class Methods

  public static get(notebookName: NotebookName): HtmlNotebook|undefined {
    return this.notebooks.get(notebookName);
  }

  public static open(
    socket: ServerSocket,
    notebookName: NotebookName,
    tDoc: NotebookObject,
  ): HtmlNotebook {
    let notebook = this.notebooks.get(notebookName);
    if (!notebook) {
      notebook = new this(socket, notebookName);
      this.notebooks.set(notebookName, notebook);
      notebook.populateFromTDoc(tDoc);
    }
    return notebook;
  }

  // Instance Properties

  public $elt: HTMLElement;
  public notebookName: NotebookName;

  // Instance Property Functions

  public debugHtml(): Html {
    return Array.from(this.styleElements.values())
    .map(s=>this.debugStyleHtml(s.style)).join('');
  }

  // This is just to have public access..
  public getStyleFromKey(key: StyleId): StyleObject | null {
    const g = this.styles.get(key);
    return g ? g : null;
  }

  public topLevelStyleOf(style: StyleObject): ThoughtElement {
    for (; style.parentId; style = this.styles.get(style.parentId)!);
    const styleElt = this.styleElements.get(style.id);
    return styleElt!;
  }

  // Instance Methods

  public close() {
    // TODO: remove event listeners?
    // TODO: delete element?
    // TODO: mark closed?
    this.clear();
    HtmlNotebook.notebooks.delete(this.notebookName);
  }

  public deleteStyle(styleId: StyleId): void {
    const changeRequest: StyleDeleteRequest = {
      type: 'deleteStyle',
      styleId,
    }
    const msg: ChangeNotebook = {
      type: 'changeNotebook',
      notebookName: this.notebookName,
      changeRequests: [ changeRequest ],
    }
    this.socket.sendMessage(msg);
  }

  public insertStyle(styleProps: StylePropertiesWithSubprops): void {
    const changeRequest: StyleInsertRequest = {
      type: 'insertStyle',
      afterId: -1,
      styleProps,
    }
    const msg: ChangeNotebook = {
      type: 'changeNotebook',
      notebookName: this.notebookName,
      changeRequests: [ changeRequest ],
    }
    this.socket.sendMessage(msg);
  }

  public selectStyle(styleId: StyleId, event: MouseEvent): void {

    // If neither shift nor command held down then unselect prior selection
    if (!event.shiftKey && !event.metaKey) {
      while (this.selectedStyles.length>0) {
        const styleId = this.selectedStyles.pop();
        const $styleElt = this.styleElements.get(styleId!);
        $styleElt!.unselect();
      }
    }
    // TODO: if event.shiftKey, select all intervening thoughts.
    this.styleElements.get(styleId)!.select();
    this.selectedStyles.push(styleId);
  }

  public useTool(id: StyleId): void {
    const msg: UseTool = {
      type: 'useTool',
      notebookName: this.notebookName,
      styleId: id,
    };
    this.socket.sendMessage(msg);
  }

  // Server Message Handlers

  public smChange(changes: NotebookChange[]): void {
    for (const change of changes) {
      switch (change.type) {
        case 'relationshipDeleted': this.chDeleteRelationship(change.relationship); break;
        case 'relationshipInserted': this.chInsertRelationship(change.relationship); break;
        case 'styleDeleted': this.chDeleteStyle(change.style.id); break;
        case 'styleInserted': this.chInsertStyle(change.style); break;
      }
    }
  }

  public smClose(): void { return this.close(); }

  // -- PRIVATE --

  // Private Class Properties

  private static notebooks: Map<NotebookName, HtmlNotebook> = new Map();

  // Private Constructor

  private constructor(socket: ServerSocket, notebookName: NotebookName) {
    this.socket = socket;
    this.notebookName = notebookName;

    this.$elt = $new('div', { id: notebookName, class: 'tdoc' });

    this.relationships = new Map();
    this.styles = new Map();
    this.styleElements = new Map();
    this.selectedStyles = [];
  }

  // Private Instance Properties

  private socket: ServerSocket;
  private relationships: Map<RelationshipId, RelationshipObject>;
  private selectedStyles: StyleId[];
  private styles: Map<StyleId, StyleObject>;
  private styleElements: Map<StyleId, ThoughtElement>;

  // Private Instance Property Functions

  private relationshipsAttachedToStyle(s: StyleObject): RelationshipObject[] {
    return Array.from(this.relationships.values()).filter(r=>r.fromId==s.id);
  }

  private stylesAttachedToStyle(s: StyleObject): StyleObject[] {
    return Array.from(this.styles.values()).filter(s2=>s2.parentId==s.id);
  }

  // Private Event Handlers

  // Private Change Event Handlers

  private chDeleteRelationship(relationship: RelationshipObject): void {
    const relationshipElt = this.relationships.get(relationship.id);
    if (!relationshipElt) { throw new Error("Delete relationship message for unknown style"); }
    this.relationships.delete(relationship.id);

    // if the relationship is an equivalence, it has been rendered
    // as a preamble of a thought. It would probably be easiest
    // to re-render the thought.
    if (relationship.meaning == 'EQUIVALENCE') {
      const srcStyle = this.styles.get(relationship.fromId);
      const tarStyle = this.styles.get(relationship.toId);
      if (srcStyle && tarStyle) {
        const srcStyleElt = this.topLevelStyleOf(srcStyle);
        const tarStyleElt = this.topLevelStyleOf(tarStyle);
        srcStyleElt.deleteEquivalence(relationship);
        tarStyleElt.deleteEquivalence(relationship);
        console.log(srcStyleElt,tarStyleElt);
      }
    }
  }

  private chDeleteStyle(styleId: StyleId): void {
    const style = this.styles.get(styleId);
    if (!style) { throw new Error("Delete style message for unknown style"); }
    this.styles.delete(styleId);
    const styleElt = this.topLevelStyleOf(style);
    if (!styleElt) { throw new Error(`Delete style message for style without top-level element`); }
    styleElt.deleteStyle(style);
    if (!style.parentId) {
      styleElt.delete();
      this.styleElements.delete(style.id);
    }
  }

  private chInsertRelationship(relationship: RelationshipObject): void {
    this.relationships.set(relationship.id, relationship);
    if (relationship.meaning == 'EQUIVALENCE') {
      let style = this.styles.get(relationship.toId);
      if (style) {
        // Here I try to find the target to try to add the
        // equivalence preamble...
        let thoughtElt = this.topLevelStyleOf(style);
        thoughtElt.insertEquivalence(relationship);
      }
    }
  }

  private chInsertStyle(style: StyleObject): void {
    this.styles.set(style.id, style);
    let thoughtElt: ThoughtElement;
    if (!style.parentId) {
      thoughtElt = ThoughtElement.create(this, style);
      this.$elt.appendChild(thoughtElt.$elt);
      this.styleElements.set(style.id, thoughtElt);
    } else {
      thoughtElt = this.topLevelStyleOf(style);
    }
    thoughtElt.insertStyle(style);
  }

  // Private Instance Methods

  private clear(): void {
    this.$elt.innerHTML = '';
    this.styleElements.clear();
    this.styles.clear();
  }

  private debugRelationshipHtml(relationship: RelationshipObject): Html {
    return `<div><span class="leaf">R${relationship.id} ${relationship.fromId} &#x27a1; ${relationship.toId} Meaning: ${relationship.meaning}</span></div>`;
  }

  private debugStyleHtml(style: StyleObject): Html {
    const styleElements = this.stylesAttachedToStyle(style);
    const relationshipElements = this.relationshipsAttachedToStyle(style);
    const json = escapeHtml(JSON.stringify(style.data));
    if (styleElements.length == 0 && relationshipElements.length == 0 && json.length<30) {
      return `<div><span class="leaf">S${style.id} ${style.type} ${style.meaning} ${style.source} <tt>${json}</tt></span></div>`;
    } else {
      const stylesHtml = styleElements.map(s=>this.debugStyleHtml(s)).join('');
      const relationshipsHtml = relationshipElements.map(r=>this.debugRelationshipHtml(r)).join('');
      const [ shortJsonTt, longJsonTt ] = json.length<30 ? [` <tt>${json}</tt>`, ''] : [ '', `<tt>${json}</tt>` ];
      return `<div>
  <span class="collapsed">S${style.id} ${style.type} ${style.meaning} ${style.source}${shortJsonTt}</span>
  <div class="nested" style="display:none">${longJsonTt}
    ${stylesHtml}
    ${relationshipsHtml}
  </div>
</div>`;
    }
  }

  private populateFromTDoc(tDoc: NotebookObject): void {
    const index: StyleIndex = { '0':[] };
    for (const styleId of Object.keys(tDoc.styleMap)) { index[styleId] = []; }
    for (const style of Object.values(tDoc.styleMap)) { index[style.parentId].push(style.id); }
    for (const styleId of tDoc.styleOrder) {
      this.populateStyleRecursively(tDoc, index, styleId);
    }
    for (const relationship of Object.values(tDoc.relationshipMap)) {
      this.chInsertRelationship(relationship);
    }
  }

  private populateStyleRecursively(tDoc: NotebookObject, index: StyleIndex, styleId: StyleId) {
    const style = tDoc.styleMap[styleId];
    this.chInsertStyle(style);
    for (const subStyleId of index[styleId]) {
      this.populateStyleRecursively(tDoc, index, subStyleId)
    }
  }

}
