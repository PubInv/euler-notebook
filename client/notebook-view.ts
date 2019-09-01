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

import { CellView } from './cell-view.js';
import { assert } from './common.js';
import { $new, escapeHtml, Html, listenerWrapper } from './dom.js';
import { StyleId, StyleObject, NotebookChange, RelationshipId, RelationshipObject, NotebookObject } from './notebook.js';
import {
  ChangeNotebook,
  NotebookChangeRequest,
  NotebookName,
  StyleChangeRequest,
  StyleDeleteRequest,
  StyleInsertRequest,
  StylePropertiesWithSubprops,
  UseTool,
} from './math-tablet-api.js';
// import { Jiix, StrokeGroups } from './myscript-types.js';
import { ServerSocket } from './server-socket.js';

// Types

interface StyleIndex { [id:string]: StyleId[] }

// Exported Class

export class NotebookView {

  // Class Methods

  public static get(notebookName: NotebookName): NotebookView|undefined {
    return this.notebooks.get(notebookName);
  }

  public static create(
    socket: ServerSocket,
    notebookName: NotebookName,
    tDoc: NotebookObject,
  ): NotebookView {
    assert(!this.notebooks.has(notebookName));
    const instance = new this(socket, notebookName);
    this.notebooks.set(notebookName, instance);
    instance.populateFromTDoc(tDoc);
    return instance;
  }

  public static open(
    socket: ServerSocket,
    notebookName: NotebookName,
    tDoc: NotebookObject,
  ): NotebookView {
    return this.notebooks.get(notebookName) || this.create(socket, notebookName, tDoc);
  }

  // Instance Properties

  public $elt: HTMLElement;
  public notebookName: NotebookName;

  // Instance Property Functions

  public debugHtml(): Html {
    return Array.from(this.cellViews.values())
    .map(s=>this.debugStyleHtml(s.style)).join('');
  }

  // This is just to have public access..
  public getStyleFromKey(key: StyleId): StyleObject | null {
    const g = this.styles.get(key);
    return g ? g : null;
  }

  public topLevelCellOf(style: StyleObject): CellView {
    for (; style.parentId; style = this.styles.get(style.parentId)!);
    const styleElt = this.cellViews.get(style.id);
    return styleElt!;
  }

  // Instance Methods

  public close() {
    // TODO: remove event listeners?
    // TODO: delete element?
    // TODO: mark closed?
    this.clear();
    NotebookView.notebooks.delete(this.notebookName);
  }

  public changeStyle(styleId: StyleId, data: any): void {
    const changeRequest: StyleChangeRequest = { type: 'changeStyle', styleId, data, };
    this.sendChangeRequest(changeRequest);
  }

  public deleteCellsRequest(cellViews: CellView[]): void {
    const changeRequests = cellViews.map<StyleDeleteRequest>(c=>({ type: 'deleteStyle', styleId: c.style.id }));
    this.sendChangeRequests(changeRequests);
  }

  public insertStyle(styleProps: StylePropertiesWithSubprops): void {
    const changeRequest: StyleInsertRequest = { type: 'insertStyle', afterId: -1, styleProps, }
    this.sendChangeRequest(changeRequest);
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
        case 'styleChanged': this.chChangeStyle(change.style.id, change.data); break;
        case 'styleDeleted': this.chDeleteStyle(change.style.id); break;
        case 'styleInserted': this.chInsertStyle(change.style); break;
      }
    }
  }

  public smClose(): void { return this.close(); }

  // -- PRIVATE --

  // Private Class Properties

  private static notebooks: Map<NotebookName, NotebookView> = new Map();

  // Private Constructor

  private constructor(socket: ServerSocket, notebookName: NotebookName) {
    this.socket = socket;
    this.notebookName = notebookName;

    this.$elt = $new('div', {
      id: notebookName,
      class: 'notebookView',
      attrs: {
        tabindex: 0,
      },
      listeners: {
        blur: e=>this.onBlur(e),
        focus: e=>this.onFocus(e),
        keyup: e=>this.onKeyUp(e),
      }
    });

    this.relationships = new Map();
    this.styles = new Map();
    this.cellViews = new Map();
  }

  // Private Instance Properties

  private cellViews: Map<StyleId, CellView>;
  private lastCellSelected?: CellView;
  private relationships: Map<RelationshipId, RelationshipObject>;
  private socket: ServerSocket;
  private styles: Map<StyleId, StyleObject>;

  private cellViewFromElement($elt: HTMLDivElement): CellView {
    // Strip 'C' prefix from cell ID to get the style id.
    const styleId: StyleId = parseInt($elt.id.slice(1), 10);
    return this.cellViews.get(styleId)!;
  }

  private firstCell(): CellView | undefined {
    const $elt = <HTMLDivElement|null>this.$elt.firstElementChild;
    return $elt ? this.cellViewFromElement($elt) : undefined;
  }

  private lastCell(): CellView | undefined {
    const $elt = <HTMLDivElement|null>this.$elt.lastElementChild;
    return $elt ? this.cellViewFromElement($elt) : undefined;
  }

  private nextCell(cellView: CellView): CellView | undefined {
    const $elt = <HTMLDivElement|null>cellView.$elt.nextElementSibling;
    return $elt ? this.cellViewFromElement($elt) : undefined;
  }

  private previousCell(cellView: CellView): CellView | undefined {
    const $elt = <HTMLDivElement|null>cellView.$elt.previousElementSibling;
    return $elt ? this.cellViewFromElement($elt) : undefined;
  }

  private relationshipsAttachedToStyle(s: StyleObject): RelationshipObject[] {
    return Array.from(this.relationships.values()).filter(r=>r.fromId==s.id);
  }

  private selectedCells(): CellView[] {
    const rval: CellView[] = [];
    for (const cellView of this.cellViews.values()) {
      if (cellView.isSelected()) { rval.push(cellView); }
    }
    return rval;
  }

  private stylesAttachedToStyle(s: StyleObject): StyleObject[] {
    return Array.from(this.styles.values()).filter(s2=>s2.parentId==s.id);
  }

  // Private Event Handlers

  private onBlur(event: FocusEvent): void {
    console.log("BLUR!!!");
    console.dir(event);
  }

  private onCellClick(cellView: CellView, event: MouseEvent): void {
    // Note: Shift-click or ctrl-click will extend the current selection.
    this.selectCell(cellView, event.shiftKey, event.metaKey);
  }

  private onCellDoubleClick(cellView: CellView, _event: MouseEvent): void {
    if (!cellView.editMode()) {
      // REVIEW: Beep or something?
      console.log(`Keyboard input panel not available for cell: ${cellView.style.meaning}/${cellView.style.type}`)
    }
  }

  private onFocus(event: FocusEvent): void {
    console.log("FOCUS!!!");
    console.dir(event);
  }

  private onKeyUp(event: KeyboardEvent): void {
    switch(event.key) {
      case "ArrowDown": this.keyArrowDown(event); break;
      case "ArrowUp": this.keyArrowUp(event); break;
      case "Backspace": this.keyBackspace(event); break;
      case "Enter": this.keyEnter(event); break;
      case "Escape": this.keyEscape(event); break;
      default:
        console.log(`NotebookView keyup : ${event.key}`);
        break;
    }
  }

  // Private Change Event Handlers

  private chChangeStyle(styleId: StyleId, data: any): void {
    const style = this.styles.get(styleId);
    if (!style) { throw new Error(`Change style message for unknown style: ${styleId}`); }
    const styleElt = this.topLevelCellOf(style!);
    if (!styleElt) { throw new Error(`Change style message for style without top-level element`); }
    styleElt.changeStyle(style, data);
  }

  private chDeleteRelationship(relationship: RelationshipObject): void {
    const relationshipElt = this.relationships.get(relationship.id);
    if (!relationshipElt) { throw new Error(`Delete relationship message for unknown relationship`); }
    this.relationships.delete(relationship.id);

    // if the relationship is an equivalence, it has been rendered
    // as a preamble of a thought. It would probably be easiest
    // to re-render the cell.
    if (relationship.meaning == 'EQUIVALENCE') {
      const srcStyle = this.styles.get(relationship.fromId);
      const tarStyle = this.styles.get(relationship.toId);
      if (srcStyle && tarStyle) {
        const srcStyleElt = this.topLevelCellOf(srcStyle);
        const tarStyleElt = this.topLevelCellOf(tarStyle);
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
    const styleElt = this.topLevelCellOf(style!);
    if (!styleElt) { throw new Error(`Delete style message for style without top-level element`); }
    styleElt.deleteStyle(style!);
    if (!style!.parentId) {
      // This is a top-level style so delete the associated cell.
      const cellView = this.cellViews.get(styleId);
      assert(cellView);
      this.deleteCell(cellView!);
    }
  }

  private chInsertRelationship(relationship: RelationshipObject): void {
    this.relationships.set(relationship.id, relationship);
    if (relationship.meaning == 'EQUIVALENCE') {
      let style = this.styles.get(relationship.toId);
      if (style) {
        // Here I try to find the target to try to add the
        // equivalence preamble...
        let cellView = this.topLevelCellOf(style);
        cellView.insertEquivalence(relationship);
      }
    }
  }

  private chInsertStyle(style: StyleObject): void {
    this.styles.set(style.id, style);
    let cellView: CellView;
    if (!style.parentId) {
      cellView = this.createCell(style);
    } else {
      cellView = this.topLevelCellOf(style);
    }
    cellView.insertStyle(style);
  }

  // Private Key Event Handlers

  private keyArrowDown(event: KeyboardEvent): void {
    // Select the cell immediately after the last one previously.
    // If no cell was previously selected, then select the first cell.
    // If the last cell was previously selected, do nothing.
    // Note: Holding the shift key will extend the selection.
    const cellView = this.lastCellSelected ? this.nextCell(this.lastCellSelected): this.firstCell();
    if (cellView) {
      this.selectCell(cellView, false, event.shiftKey);
    }
    // REVIEW: Else beep?
  }

  private keyArrowUp(event: KeyboardEvent): void {
    // Select the cell immediately before the last one previously.
    // If no cell was previously selected, then select the last cell.
    // If the first cell was previously selected, do nothing.
    // Note: Holding the shift key will extend the selection.
    const cellView = this.lastCellSelected ? this.previousCell(this.lastCellSelected): this.lastCell();
    if (cellView) {
      this.selectCell(cellView, false, event.shiftKey);
    }
    // REVIEW: Else beep?
  }

  private keyBackspace(_event: KeyboardEvent): void {
    const cellViews = this.selectedCells();
    this.deleteCellsRequest(cellViews);
  }

  private keyEnter(_event: KeyboardEvent): void {
    if (this.lastCellSelected) {
      this.lastCellSelected.editMode();
    }
  }

  private keyEscape(_event: KeyboardEvent): void {
    this.unselectAll();
  }

  // Private Instance Methods

  private clear(): void {
    this.$elt.innerHTML = '';
    this.cellViews.clear();
    this.styles.clear();
  }

  private createCell(style: StyleObject): CellView {
    const cellView = CellView.create(this, style);
    cellView.$elt.addEventListener('click', listenerWrapper( cellView.$elt, 'click', event=>this.onCellClick(cellView, event)));
    cellView.$elt.addEventListener('dblclick', listenerWrapper( cellView.$elt, 'dblclick', event=>this.onCellDoubleClick(cellView, event)));
    this.$elt.appendChild(cellView.$elt);
    this.cellViews.set(style.id, cellView);
    return cellView;
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

  private deleteCell(cellView: CellView): void {
    if (cellView == this.lastCellSelected) {
      delete this.lastCellSelected;
    }
    this.$elt.removeChild(cellView.$elt);
    this.cellViews.delete(cellView.style.id);
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

  private selectCell(
    cellView: CellView,
    rangeExtending: boolean, // Extending selection by a contiguous range.
    indivExtending: boolean, // Extending selection by an individual cell, possibly non-contiguous.
  ): void {
    if (!rangeExtending && !indivExtending) { this.unselectAll(); }
    cellView.select();
    this.lastCellSelected = cellView;
  }

  private sendChangeRequest(changeRequest: NotebookChangeRequest): void {
    this.sendChangeRequests([ changeRequest ]);
  }

  private sendChangeRequests(changeRequests: NotebookChangeRequest[]): void {
    if (changeRequests.length == 0) { return; }
    const msg: ChangeNotebook = {
      type: 'changeNotebook',
      notebookName: this.notebookName,
      changeRequests,
    }
    this.socket.sendMessage(msg);
  }

  private unselectAll(): void {
    for (const cellView of this.cellViews.values()) {
      if (cellView.isSelected()) { cellView.unselect(); }
    }
    delete this.lastCellSelected;
  }
}
