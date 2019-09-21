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
import { $, $new, escapeHtml, Html, listenerWrapper } from './dom.js';
import { StyleId, StyleObject, NotebookChange, RelationshipId, RelationshipObject, NotebookObject, StyleMoved, StyleType, StyleInserted, StyleInsertedFromNotebookChange } from './notebook.js';
import {
  ChangeNotebook,
  NotebookChangeRequest,
  NotebookName,
  StyleChangeRequest,
  StyleDeleteRequest,
  StyleInsertRequest,
  StylePropertiesWithSubprops,
  UseTool,
  StyleMoveRequest,
  Tracker,
  NotebookChanged,
} from './math-tablet-api.js';
// import { Jiix, StrokeGroups } from './myscript-types.js';
import { ServerSocket } from './server-socket.js';

// Types

type CommandName = string;

type CommandFunction = (this: NotebookView)=>void;

enum KeyMod {
  None = 0,
  Alt = 1,    // Option key on Mac.
  Ctrl = 2,
  Meta = 4,   // Command key on Mac, Windows key on Windows.
  Shift = 8,
}

type KeyMods = number;    // Bitwise or of KeyMod. // TYPESCRIPT:??

type KeyName = string;
type KeyCombo = string;   // KeyName followed by KeyMods, e.g. 'Enter8' for shift+enter.

interface StyleIndex { [id:string]: StyleId[] }

export interface SelectionChangedEventDetail {
  empty: boolean;
}

// Constants

const IGNORED_KEYUPS = [ 'Alt', 'Control', 'Meta', 'Shift' ];

// LATER: Load key bindings from user-editable configuration.
const KEY_MAP: [ KeyName, KeyMods, CommandName][] = [
  [ 'ArrowDown', KeyMod.None, 'selectDown'],
  [ 'ArrowDown', KeyMod.Alt, 'moveSelectionDown'],
  [ 'ArrowDown', KeyMod.Shift, 'selectDownExtended'],
  [ 'ArrowUp', KeyMod.None, 'selectUp'],
  [ 'ArrowUp', KeyMod.Shift, 'selectUpExtended'],
  [ 'ArrowUp', KeyMod.Alt, 'moveSelectionUp'],
  [ 'Backspace', KeyMod.None, 'deleteSelectedCells'],
  [ 'Enter', KeyMod.None, 'editSelectedCell'],
  [ 'Enter', KeyMod.Alt, 'insertKeyboardCellAboveSelected'],
  [ 'Escape', KeyMod.None, 'unselectAll'],
];

const KEY_BINDINGS = new Map<KeyCombo, CommandName>(KEY_MAP.map(([ keyName, keyMods, commandName])=>[ `${keyName}${keyMods}`, commandName ]));

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
    const cell = this.cellViews.get(style.id);
    assert(cell);
    return cell!;
  }

  // Commands
  // (Public instance methods bound to keystrokes)

  public deleteSelectedCells(): void {
    const cellViews = this.selectedCells();
    this.unselectAll();
    const changeRequests = cellViews.map<StyleDeleteRequest>(c=>({ type: 'deleteStyle', styleId: c.style.id }));
    this.sendChangeRequests(changeRequests);
  }

  public editSelectedCell(): void {
    if (!this.lastCellSelected) {
      // Nothing selected to move.
      // REVIEW: Beep or something?
      return;
    }
    this.lastCellSelected.editMode();
  }

  public insertKeyboardCellAboveSelected(): void {
    // If cells are selected then in insert a keyboard input cell
    // above the last cell selected.
    // Otherwise, insert at the end of the noteboo.

    // REVIEW: We shouldn't be assuming a specific HTML control on the page.
    const $typeSelector = $<HTMLSelectElement>('#keyboardInputType');

    const styleProps: StylePropertiesWithSubprops = {
      type: <StyleType>$typeSelector.value,
      meaning: 'INPUT',
      data: "",
    };

    let afterId: StyleId;
    if (this.lastCellSelected) {
      const previousCell = this.previousCell(this.lastCellSelected);
      afterId = previousCell ? previousCell.style.id : 0;
    } else {
      afterId = 0;
    }

    // Insert top-level style and wait for it to be inserted.
    this.insertStyleTracked(styleProps, afterId)
    .then(styleId=>{
      const cellView = this.cellViewFromStyleId(styleId);
      this.scrollCellIntoView(cellView);
      this.selectCell(cellView);
      cellView.editMode();
    })
    .catch(err=>{
      console.error(`Error inserting keyboard style: ${err.message}\n${err.stack}`);
    });
  }

  public moveSelectionDown(): void {
    // TODO: contiguous multiple selection
    // TODO: discontiguous multiple selection
    // TODO: scroll into view if necessary.
    if (!this.lastCellSelected) {
      // Nothing selected to move.
      // REVIEW: Beep or something?
      return;
    }
    const styleId = this.lastCellSelected.style.id;

    const nextCell = this.nextCell(this.lastCellSelected);
    if (!nextCell) {
      // Selected cell is already the last cell. Nowhere down to go.
      return;
    }
    const nextNextCell = this.nextCell(nextCell);
    const afterId = nextNextCell ? nextCell.style.id : /* bottom */ -1;

    const request: StyleMoveRequest = { type: 'moveStyle', styleId, afterId };
    this.sendChangeRequest(request);
  }

  public moveSelectionUp(): void {
    // TODO: contiguous multiple selection
    // TODO: discontiguous multiple selection
    // TODO: scroll into view if necessary.
    if (!this.lastCellSelected) {
      // Nothing selected to move.
      // REVIEW: Beep or something?
      return;
    }
    const styleId = this.lastCellSelected.style.id;

    const previousCell = this.previousCell(this.lastCellSelected);
    if (!previousCell) {
      // Selected cell is already the first cell. Nowhere up to go.
      return;
    }
    const previousPreviousCell = this.previousCell(previousCell);
    const afterId = previousPreviousCell ? previousPreviousCell.style.id : /* top */ 0;

    const request: StyleMoveRequest = { type: 'moveStyle', styleId, afterId };
    this.sendChangeRequest(request);
  }

  public selectDown(extend?: boolean): void {
    const cellView = this.lastCellSelected ? this.nextCell(this.lastCellSelected): this.firstCell();
    if (cellView) {
      this.selectCell(cellView, false, !!extend);
    }
  }

  public selectDownExtended(): void {
    this.selectDown(true);
  }

  public selectUp(extend?: boolean): void {
    // TODO: scroll into view if necessary.
    // Select the cell immediately before the last one previously.
    // If no cell was previously selected, then select the last cell.
    // If the first cell was previously selected, do nothing.
    // Note: Holding the shift key will extend the selection.
    const cellView = this.lastCellSelected ? this.previousCell(this.lastCellSelected): this.lastCell();
    if (cellView) {
      this.selectCell(cellView, false, !!extend);
    }
  }

  public selectUpExtended(): void {
    this.selectUp(true);
  }

  public unselectAll(noEmit?: boolean): void {
    for (const cellView of this.cellViews.values()) {
      if (cellView.isSelected()) { cellView.unselect(); }
    }
    delete this.lastCellSelected;
    if (!noEmit) { this.emitSelectionChangedEvent({ empty: true }); }
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
    const changeRequest: StyleChangeRequest = { type: 'changeStyle', styleId, data };
    this.sendChangeRequest(changeRequest);
  }

  public insertStyle(styleProps: StylePropertiesWithSubprops, afterId: StyleId = -1): void {
    const changeRequest: StyleInsertRequest = { type: 'insertStyle', afterId, styleProps };
    this.sendChangeRequest(changeRequest);
  }

  public async insertStyleTracked(styleProps: StylePropertiesWithSubprops, afterId: StyleId = -1): Promise<StyleId> {
    const changeRequest: StyleInsertRequest = { type: 'insertStyle', afterId, styleProps };
    const changes = await this.sendTrackedChangeRequest(changeRequest);

    // The style we inserted will be the first change that comes back.
    assert(changes.length>0);
    const change = StyleInsertedFromNotebookChange(changes[0]);
    const style = change.style;
    return style.id;
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

  public smChange(msg: NotebookChanged): void {

    const changes = msg.changes;
    for (const change of changes) {
      switch (change.type) {
        case 'relationshipDeleted': this.chDeleteRelationship(change.relationship); break;
        case 'relationshipInserted': this.chInsertRelationship(change.relationship); break;
        case 'styleChanged': this.chChangeStyle(change.style.id, change.style.data, change.previousData); break;
        case 'styleDeleted': this.chDeleteStyle(change.style.id); break;
        case 'styleInserted': this.chInsertStyle(change); break;
        case 'styleMoved': this.chMoveStyle(change); break;
        default: throw new Error(`Unexpected change type ${(<any>change).type}`);
      }
    }

    // REVIEW: Are all of the above changes synchronous?
    //         If not, then we will need to wait for them to complete
    //         before resolving the tracking promise, below.
    // If the changes were tracked then accumulate the changes
    // and resolve the tracking promise if complete.
    if (msg.tracker) {
      const previousChanges = this.trackedChangeResponses.get(msg.tracker) || [];
      assert(previousChanges);
      const accumulatedChanges = previousChanges.concat(changes);
      if (!msg.complete) {
        this.trackedChangeResponses.set(msg.tracker, accumulatedChanges);
      } else {
        this.trackedChangeResponses.delete(msg.tracker);
        const fns = this.trackedChangeRequests.get(msg.tracker);
        this.trackedChangeRequests.delete(msg.tracker);
        assert(fns);
        const resolve = fns![0];
        // REVIEW: Is there any way the promise could be rejected?
        resolve(accumulatedChanges);
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
    this.trackedChangeRequests = new Map();
    this.trackedChangeResponses = new Map();
  }

  // Private Instance Properties

  private cellViews: Map<StyleId, CellView>;
  private lastCellSelected?: CellView;
  private relationships: Map<RelationshipId, RelationshipObject>;
  private socket: ServerSocket;
  private styles: Map<StyleId, StyleObject>;
  private trackedChangeRequests: Map<Tracker, [ (changes: NotebookChange[])=>void, (reason: any)=>void ]>;
  private trackedChangeResponses: Map<Tracker, NotebookChange[]>;

  private cellViewFromStyleId(styleId: StyleId): CellView {
    return this.cellViews.get(styleId)!;
  }

  private cellViewFromElement($elt: HTMLDivElement): CellView {
    // Strip 'C' prefix from cell ID to get the style id.
    const styleId: StyleId = parseInt($elt.id.slice(1), 10);
    return this.cellViewFromStyleId(styleId);
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

  private onBlur(_event: FocusEvent): void {
    // console.log("BLUR!!!");
    // console.dir(event);
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

  private onFocus(_event: FocusEvent): void {
    // console.log("FOCUS!!!");
    // console.dir(event);
  }

  private onKeyUp(event: KeyboardEvent): void {
    // Ignore event if it is from a sub-element.
    if (document.activeElement != this.$elt) { return; }

    const keyName: KeyName = event.key;
    let keyMods = 0;
    if (event.altKey) { keyMods += KeyMod.Alt; }
    if (event.ctrlKey) { keyMods += KeyMod.Ctrl; }
    if (event.metaKey) { keyMods += KeyMod.Meta; }
    if (event.shiftKey) { keyMods += KeyMod.Shift; }

    const keyCombo: KeyCombo = `${keyName}${keyMods}`;
    const commandName = KEY_BINDINGS.get(keyCombo);
    if (commandName) {
      const commandFn = <CommandFunction|undefined>((</* TYPESCRIPT: */any>this)[commandName]);
      if (!commandFn) { throw new Error(`Unknown command ${commandName} for key ${keyCombo}`); }
      commandFn.call(this);
    } else {
      if (IGNORED_KEYUPS.indexOf(keyName)<0) {
        console.log(`NotebookView unrecognized keyup : ${keyCombo}`);
      }
      // No command bound to that key.
      // REVIEW: Beep or something?
    }
  }

  // Private Change Event Handlers

  private chChangeStyle(styleId: StyleId, data: any, previousData: any): void {
    const style = this.styles.get(styleId);
    if (!style) { throw new Error(`Change style message for unknown style: ${styleId}`); }
    style.data = data;
    const cell = this.topLevelCellOf(style!);
    if (!cell) { throw new Error(`Change style message for style without top-level element`); }
    cell.changeStyle(style, previousData);
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
    const cell = this.topLevelCellOf(style!);
    if (!cell) { throw new Error(`Delete style message for style without top-level element`); }
    cell.deleteStyle(style!);
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

  private chInsertStyle(change: StyleInserted): void {
    const { style, afterId } = change;

    this.styles.set(style.id, style);
    let cellView: CellView;
    if (!style.parentId) {
      cellView = this.createCell(style, afterId!);
    } else {
      cellView = this.topLevelCellOf(style);
    }
    cellView.insertStyle(style);
  }

  private chMoveStyle(change: StyleMoved): void {
    const { styleId, afterId } = change;
    const movedCell = this.cellViews.get(styleId);
    if (!movedCell) { throw new Error(`Cannot move unknown cell ${styleId}`); }
    // Note: DOM methods ensure the element will be removed from
    //       its current parent.
    this.insertCell(movedCell, afterId);
  }

  // Private Instance Methods

  private clear(): void {
    this.$elt.innerHTML = '';
    this.cellViews.clear();
    this.styles.clear();
  }

  private createCell(style: StyleObject, afterId: StyleId): CellView {
    const cellView = CellView.create(this, style);
    cellView.$elt.addEventListener('click', listenerWrapper( cellView.$elt, 'click', event=>this.onCellClick(cellView, event)));
    cellView.$elt.addEventListener('dblclick', listenerWrapper( cellView.$elt, 'dblclick', event=>this.onCellDoubleClick(cellView, event)));
    this.cellViews.set(style.id, cellView);
    this.insertCell(cellView, afterId);
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

  private insertCell(cellView: CellView, afterId: StyleId): void {
    if (afterId == /* top */ 0) {
      this.$elt.prepend(cellView.$elt);
    } else if (afterId == /* bottom */ -1) {
      this.$elt.append(cellView.$elt);
    } else {
      const afterCell = this.cellViews.get(afterId);
      if (!afterCell) { throw new Error(`Cannot insert cell after unknown cell ${afterId}`); }
      afterCell.$elt.insertAdjacentElement('afterend', cellView.$elt);
    }
  }

  private emitSelectionChangedEvent(detail: SelectionChangedEventDetail): void {
    const event = new CustomEvent<SelectionChangedEventDetail>('selection-changed', { detail });
    this.$elt.dispatchEvent(event);
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
    const change: StyleInserted = { type: 'styleInserted', style };
    if (!style.parentId) { change.afterId = -1; }
    this.chInsertStyle(change);
    for (const subStyleId of index[styleId]) {
      this.populateStyleRecursively(tDoc, index, subStyleId)
    }
  }

  private selectCell(
    cellView: CellView,
    rangeExtending?: boolean, // Extending selection by a contiguous range.
    indivExtending?: boolean, // Extending selection by an individual cell, possibly non-contiguous.
  ): void {
    if (!rangeExtending && !indivExtending) { this.unselectAll(true); }
    cellView.select();
    this.lastCellSelected = cellView;
    this.emitSelectionChangedEvent({ empty: false });
  }

  private scrollCellIntoView(cellView: CellView): void {
    cellView.$elt.scrollIntoView();
  }

  private sendChangeRequest(changeRequest: NotebookChangeRequest, tracker?: Tracker): void {
    this.sendChangeRequests([ changeRequest ], tracker);
  }

  private sendChangeRequests(changeRequests: NotebookChangeRequest[], tracker?: Tracker): void {
    if (changeRequests.length == 0) { return; }
    const msg: ChangeNotebook = {
      type: 'changeNotebook',
      notebookName: this.notebookName,
      changeRequests,
      tracker,
    }
    this.socket.sendMessage(msg);
  }

  private sendTrackedChangeRequest(changeRequest: NotebookChangeRequest): Promise<NotebookChange[]> {
    return this.sendTrackedChangeRequests([ changeRequest ]);
  }

  private sendTrackedChangeRequests(changeRequests: NotebookChangeRequest[]): Promise<NotebookChange[]> {
    return new Promise((resolve, reject)=>{
      const tracker: Tracker = Date.now().toString();
      this.trackedChangeRequests.set(tracker, [ resolve, reject ]);
      this.sendChangeRequests(changeRequests, tracker);
    });
  }

}
