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

// TODO: Hide focus ring unless user is using keyboard:
//       https://medium.com/hackernoon/removing-that-ugly-focus-ring-and-keeping-it-too-6c8727fefcd2

// Requirements

import { CellView } from './cell-view/index.js';
import { createCellView } from './cell-view/instantiator.js';
import { assert } from '../common.js';
import { $, $configure } from '../dom.js';
import {
  DrawingData, StyleId, StyleObject, NotebookChange,
  StyleType, StyleRelativePosition,
  StylePosition, DOCUMENT, PageId, HintData, HintStatus, HintRelationship, FormulaData,
} from '../shared/notebook.js';
import {
  StyleDeleteRequest,
  StyleInsertRequest, StylePropertiesWithSubprops, StyleMoveRequest, NotebookChangeRequest, ChangeNotebookOptions,
} from '../shared/math-tablet-api.js';
import { ClientNotebook, TrackedChangesResults } from './client-notebook.js';
import { Sidebar } from './sidebar.js';

// Types

type CommandName = string;

type CommandFunction = (this: NotebookView)=>Promise<void>;

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

interface UndoEntry {
  changeRequests: NotebookChangeRequest[];
  undoChangeRequests: NotebookChangeRequest[];
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
  [ 'Enter', KeyMod.Alt, 'insertKeyboardCellBelow'],
  [ 'Enter', KeyMod.Alt|KeyMod.Shift, 'insertKeyboardCellAbove'],
  [ 'Escape', KeyMod.None, 'unselectAll'],
];

const KEY_BINDINGS = new Map<KeyCombo, CommandName>(KEY_MAP.map(([ keyName, keyMods, commandName])=>[ `${keyName}${keyMods}`, commandName ]));

// Exported Class

export class NotebookView {

  // Class Methods

  public static attach($elt: HTMLDivElement): NotebookView {
    return new this($elt);
  }

  // Instance Properties

  public openNotebook!: ClientNotebook;

  // Instance Property Functions

  public topLevelCellOf(style: StyleObject): CellView {
    for (; style.parentId; style = this.openNotebook.getStyle(style.parentId));
    const cell = this.cellViews.get(style.id);
    assert(cell);
    return cell!;
  }

  // Instance Methods

  public async deleteTopLevelStyle(styleId: StyleId): Promise<void> {
    await this.unselectAll();
    const changeRequest: StyleDeleteRequest = { type: 'deleteStyle', styleId: styleId };
    await this.sendUndoableChangeRequests([changeRequest]);
  }

  public connect(openNotebook: ClientNotebook, sidebar: Sidebar): void {
    this.openNotebook = openNotebook;
    this.sidebar = sidebar;

    for (const styleId of this.openNotebook.topLevelStyleOrder()) {
      const style = this.openNotebook.getStyle(styleId);
      this.createCell(style, -1);
    }
  }

  public scrollPageIntoView(pageId: PageId): void {
    // TODO: This will not work when cells can be added or removed.
    const pageData = DOCUMENT.pages.find(p=>p.id == pageId);
    if (!pageData) { throw new Error(`Page with ID not found: ${pageId}`); }
    const cellData = pageData.cells[0];
    // TODO: This doesn't work of the page doesn't have any cells.
    const cellId = cellData.id;
    const $cell = this.$elt.querySelector<SVGSVGElement>(`#${cellId}`);
    $cell!.scrollIntoView({ block: 'start'});
  }

  // NOTE: When sidebar switches views it calls .focus() on the element directly,
  //       It does not call this function.
  public setFocus(): void {
    this.$elt.focus();
  }

  // Commands
  // (Public instance methods bound to keystrokes)

  public async deleteSelectedCells(): Promise<void> {
    const cellViews = this.selectedCells();
    await this.unselectAll();
    const changeRequests = cellViews.map<StyleDeleteRequest>(c=>({ type: 'deleteStyle', styleId: c.styleId }));
    await this.sendUndoableChangeRequests(changeRequests);
  }

  public async developmentButtonClicked(): Promise<void> {
    // This code is executed when the user presses the underwear button in the sidebar.
    // For when a developer needs a button to initiate a test action.
    console.log('Development Button Clicked!')
  }

  public async editSelectedCell(): Promise<void> {
    if (!this.lastCellSelected) {
      // Nothing selected to move.
      // REVIEW: Beep or something?
      return;
    }
    this.lastCellSelected.editMode();
  }

  public async insertHintCellBelow(): Promise<void> {
    // TODO: InsertHintButton should only be enabled when first of two consecutive formula cells is selected.
    if (!this.lastCellSelected) {
      throw new Error("Must select a FORMULA cell to insert a hint.");
    }
    const fromId = this.lastCellSelected.styleId;
    const fromStyle = this.openNotebook.getStyle(fromId);
    if (fromStyle.role != 'FORMULA') {
      throw new Error("Must select a FORMULA cell to insert a hint.");
    }
    const toId = this.openNotebook.followingStyleId(fromId);
    if (!toId) {
      throw new Error("Can't insert a hint after last formula.");
    }
    const toStyle = this.openNotebook.getStyle(toId);
    if (toStyle.role != 'FORMULA') {
      throw new Error("Can only insert a hint between two FORMULA cells.");
    }

    const data: HintData = {
      relationship: HintRelationship.Unknown,
      status: HintStatus.Unknown,
//      idOfRelationshipDecorated: relId
    };

    const styleProps: StylePropertiesWithSubprops = {
      role: 'HINT', type: 'HINT-DATA', data,
      subprops: [
        { role: 'INPUT', type: 'PLAIN-TEXT', data: "" },
      ]
    };

    const changeRequest: StyleInsertRequest = { type: 'insertStyle', afterId: fromId, styleProps };
    const undoChangeRequest = await this.sendUndoableChangeRequest(changeRequest);
    const styleId = (<StyleDeleteRequest>undoChangeRequest).styleId;
    this.startEditingCell(styleId);
  }

  public async insertInkCellBelow(afterId?: StyleRelativePosition): Promise<void> {
    if (afterId === undefined) {
      // Cell to insert after is not specified.
      // If cells are selected then in insert a keyboard input cell below the last cell selected.
      // Otherwise, insert at the end of the notebook.
      if (this.lastCellSelected) { afterId = this.lastCellSelected.styleId; }
      else { afterId = StylePosition.Bottom; }
    }

    const strokeData: DrawingData = {
      size: { height: '1in', width: '6.5in' },
      strokeGroups: [
        { strokes: [] }
      ],
    };
    const styleProps: StylePropertiesWithSubprops = {
      role: 'UNINTERPRETED-INK', subrole: 'OTHER', type: 'NONE', data: null,
      subprops: [
        { role: 'INPUT', type: 'STROKE-DATA', data: strokeData }
      ]
    };
    const changeRequest: StyleInsertRequest = { type: 'insertStyle', afterId, styleProps };
    /* const undoChangeRequest = */ await this.sendUndoableChangeRequest(changeRequest);
    // const styleId = (<StyleDeleteRequest>undoChangeRequest).styleId
  }

  public async insertKeyboardCellAbove(): Promise<void> {
    // If cells are selected then in insert a keyboard input cell
    // above the last cell selected.
    // Otherwise, insert at the beginning of the notebook.
    let afterId: StyleRelativePosition;
    if (this.lastCellSelected) {
      const previousCell = this.previousCell(this.lastCellSelected);
      afterId = previousCell ? previousCell.styleId : StylePosition.Top;
    } else { afterId = StylePosition.Top; }
    await this.insertKeyboardCellAndEdit(afterId);
  }

  public async insertKeyboardCellBelow(): Promise<void> {
    // If cells are selected then in insert a keyboard input cell below the last cell selected.
    // Otherwise, insert at the end of the notebook.
    let afterId: StyleRelativePosition;
    if (this.lastCellSelected) { afterId = this.lastCellSelected.styleId; }
    else { afterId = StylePosition.Bottom; }
    await this.insertKeyboardCellAndEdit(afterId);
  }

  public async moveSelectionDown(): Promise<void> {
    // TODO: contiguous multiple selection
    // TODO: discontiguous multiple selection
    // TODO: scroll into view if necessary.
    if (!this.lastCellSelected) {
      // Nothing selected to move.
      // REVIEW: Beep or something?
      return;
    }
    const styleId = this.lastCellSelected.styleId;

    const nextCell = this.nextCell(this.lastCellSelected);
    if (!nextCell) {
      // Selected cell is already the last cell. Nowhere down to go.
      return;
    }
    const nextNextCell = this.nextCell(nextCell);
    const afterId = nextNextCell ? nextCell.styleId : StylePosition.Bottom;

    const request: StyleMoveRequest = { type: 'moveStyle', styleId, afterId };
    await this.sendUndoableChangeRequests([ request ]);
  }

  public async moveSelectionUp(): Promise<void> {
    // TODO: contiguous multiple selection
    // TODO: discontiguous multiple selection
    // TODO: scroll into view if necessary.
    if (!this.lastCellSelected) {
      // Nothing selected to move.
      // REVIEW: Beep or something?
      return;
    }
    const styleId = this.lastCellSelected.styleId;

    const previousCell = this.previousCell(this.lastCellSelected);
    if (!previousCell) {
      // Selected cell is already the first cell. Nowhere up to go.
      return;
    }
    const previousPreviousCell = this.previousCell(previousCell);
    const afterId = previousPreviousCell ? previousPreviousCell.styleId : /* top */ 0;

    const request: StyleMoveRequest = { type: 'moveStyle', styleId, afterId };
    await this.sendUndoableChangeRequests([ request ]);
  }

  public async redo(): Promise<void> {
    // Disable undo and redo buttons during the operation.
    this.sidebar.enableRedoButton(false);
    this.sidebar.enableUndoButton(false);

    // Resubmit the change requests.
    assert(this.topOfUndoStack < this.undoStack.length);
    const entry = this.undoStack[this.topOfUndoStack++];
    await this.sendTrackedChangeRequests(entry.changeRequests);

    // Enable undo and redo buttons as appropriate.
    this.sidebar.enableRedoButton(this.topOfUndoStack < this.undoStack.length);
    this.sidebar.enableUndoButton(true);
  }

  public async selectDown(extend?: boolean): Promise<void> {
    const cellView = this.lastCellSelected ? this.nextCell(this.lastCellSelected): this.firstCell();
    if (cellView) {
      this.selectCell(cellView, false, !!extend);
    }
  }

  public async selectDownExtended(): Promise<void> {
    this.selectDown(true);
  }

  public async selectUp(extend?: boolean): Promise<void> {
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

  public async selectUpExtended(): Promise<void> {
    this.selectUp(true);
  }

  public async undo(): Promise<void> {
    // Disable undo and redo during the operation
    this.sidebar.enableRedoButton(false);
    this.sidebar.enableUndoButton(false);

    // Undo the changes by making a set of counteracting changes.
    assert(this.topOfUndoStack > 0);
    const entry = this.undoStack[--this.topOfUndoStack];
    await this.sendTrackedChangeRequests(entry.undoChangeRequests);

    // Enable undo and redo as appropriate
    this.sidebar.enableRedoButton(true);
    this.sidebar.enableUndoButton(this.topOfUndoStack > 0);
  }

  // REVIEW: Not actually asynchronous. Have synchronous alternative for internal use?
  public async unselectAll(noEmit?: boolean): Promise<void> {
    for (const cellView of this.cellViews.values()) {
      if (cellView.isSelected()) { cellView.unselect(); }
    }
    delete this.lastCellSelected;
    if (!noEmit) {
      this.sidebar.enableTrashButton(false);
    }
  }

  // Instance Methods

  public createCell(style: StyleObject, afterId: StyleRelativePosition): CellView {
    const cellView = createCellView(this, style);
    this.cellViews.set(style.id, cellView);
    this.insertCell(cellView, afterId);
    return cellView;
  }

  public deleteCell(cellView: CellView): void {
    if (cellView == this.lastCellSelected) {
      delete this.lastCellSelected;
    }
    this.$elt.removeChild(cellView.$elt);
    this.cellViews.delete(cellView.styleId);
  }

  // REVIEW: Should be limited to changing a single style so this isn't used as backdoor
  //         for submitting arbitrary changes.
  public async editStyle(changeRequests: NotebookChangeRequest[]): Promise<void> {
    await this.sendUndoableChangeRequests(changeRequests);
  }

  public insertCell(cellView: CellView, afterId: StyleRelativePosition): void {
    if (afterId == StylePosition.Top) {
      this.$elt.prepend(cellView.$elt);
    } else if (afterId == StylePosition.Bottom) {
      this.$elt.append(cellView.$elt);
    } else {
      const afterCell = this.cellViews.get(afterId);
      if (!afterCell) { throw new Error(`Cannot insert cell after unknown cell ${afterId}`); }
      afterCell.$elt.insertAdjacentElement('afterend', cellView.$elt);
    }
  }

  public async insertKeyboardCellAndEdit(afterId: StyleRelativePosition): Promise<void> {
    // Shared implementation of 'insertKeyboardCellAbove' and 'insertKeyboardCellBelow'
    // Inserts a cell into the notebook, and opens it for editing.
    // TODO: Inserting text cells, not just formula cells.

    // REVIEW: We shouldn't be assuming a specific HTML control on the page.
    const $typeSelector = $<HTMLSelectElement>(document, '#keyboardInputType');

    const data: FormulaData = { wolframData: '' };
    const styleProps: StylePropertiesWithSubprops = {
      role: 'FORMULA',
      type: 'FORMULA-DATA',
      data,
      subprops: [
        { role: 'INPUT', type: <StyleType>$typeSelector.value, data: '' },
      ]
    };

    // Insert top-level style and wait for it to be inserted.
    const changeRequest: StyleInsertRequest = { type: 'insertStyle', afterId, styleProps };
    const undoChangeRequest = await this.sendUndoableChangeRequest(changeRequest);
    const styleId = (<StyleDeleteRequest>undoChangeRequest).styleId;
    this.startEditingCell(styleId);
  }

  public async insertStyle(styleProps: StylePropertiesWithSubprops, afterId: StyleRelativePosition = StylePosition.Bottom): Promise<void> {
    const changeRequest: StyleInsertRequest = { type: 'insertStyle', afterId, styleProps };
    await this.sendUndoableChangeRequests([ changeRequest ]);
  }

  public selectCell(
    cellView: CellView,
    rangeExtending?: boolean, // Extending selection by a contiguous range.
    indivExtending?: boolean, // Extending selection by an individual cell, possibly non-contiguous.
  ): void {
    // Erase tools panel. Newly selected cell will populate, if it is the only cell selected.
    $<HTMLDivElement>(document, '#tools').innerHTML = '';

    const solo = !rangeExtending && !indivExtending;
    if (solo) {
      this.unselectAll(true);
    }
    cellView.select();
    cellView.renderTools($<HTMLDivElement>(document, '#tools'));
    this.lastCellSelected = cellView;
    this.sidebar.enableTrashButton(true);
  }

  // Called by openNotebook when changes come in from the server.
  // Called *before* any delete changes have been made to the notebook,
  // and *after* any other changes have been made to the notebook,
  // and *before* any promises for tracked change requests are resolved.
  public smChange(change: NotebookChange): void {

    // If a change would (or might) modify the display of a cell,
    // then mark add the cell to a list of cells to be redrawn.
    // If a cell is deleted or moved, then make that change immediately.
    switch (change.type) {
      case 'relationshipDeleted': {
        // REVIEW: Is there a way to tell what relationships affect display?
        // REVIEW: This assumes both incoming and outgoing relationships can affect display.
        //         Is that too conservative?
        this.dirtyCells.add(this.openNotebook.topLevelStyleOf(change.relationship.fromId).id);
        this.dirtyCells.add(this.openNotebook.topLevelStyleOf(change.relationship.toId).id);
        break;
      }
      case 'relationshipInserted': {
        // REVIEW: Is there a way to tell what relationships affect display?
        // REVIEW: This assumes both incoming and outgoing relationships can affect display.
        //         Is that too conservative?
        this.dirtyCells.add(this.openNotebook.topLevelStyleOf(change.relationship.fromId).id);
        this.dirtyCells.add(this.openNotebook.topLevelStyleOf(change.relationship.toId).id);
        break;
      }
      case 'styleChanged': {
        // REVIEW: Is there a way to tell what styles affect display?
        this.dirtyCells.add(this.openNotebook.topLevelStyleOf(change.style.id).id);
        break;
      }
      case 'styleConverted': {
        this.dirtyCells.add(this.openNotebook.topLevelStyleOf(change.styleId).id);
        break;
      }
      case 'styleDeleted': {
        // If a substyle is deleted then mark the cell as dirty.
        // If a top-level style is deleted then remove the cell.
        const style = this.openNotebook.getStyle(change.style.id);
        const topLevelStyle = this.openNotebook.topLevelStyleOf(style.id);
        if (style.id != topLevelStyle.id) {
          // REVIEW: Is there a way to tell what styles affect display?
          this.dirtyCells.add(topLevelStyle.id);
        } else {
          const cellView = this.cellViews.get(style.id);
          assert(cellView);
          this.deleteCell(cellView!);
          this.dirtyCells.delete(style.id);
        }
        break;
      }
      case 'styleInserted': {
        if (!change.style.parentId) {
          this.createCell(change.style, change.afterId!);
        } else {
          // REVIEW: Is there a way to tell what styles affect display?
          const topLevelStyle = this.openNotebook.topLevelStyleOf(change.style.id);
          this.dirtyCells.add(topLevelStyle.id);
        }
        break;
      }
      case 'styleMoved': {
        const style = this.openNotebook.getStyle(change.styleId);
        if (style.parentId) {
          console.warn(`Non top-level style moved: ${style.id}`);
          break;
        }
        const movedCell = this.cellViews.get(style.id);
        assert(movedCell);
        // Note: DOM methods ensure the element will be removed from
        //       its current parent.
        this.insertCell(movedCell!, change.afterId);
        break;
      }
      default: throw new Error(`Unexpected change type ${(<any>change).type}`);
    }
  }

  public updateView(): void {
    // Redraw all of the cells that (may) have changed.
    for (const styleId of this.dirtyCells) {
      const style = this.openNotebook.getStyle(styleId);
      const cellView = this.cellViewFromStyleId(styleId);
      if (!cellView) { throw new Error(`Can't find dirty Change style message for style without top-level element`); }
      cellView.render(style);
    }
    if (this.lastCellSelected) {
      const $tools = $<HTMLDivElement>(document, '#tools');
      this.lastCellSelected.renderTools($tools);
    }
    this.dirtyCells.clear();
  }

  public useTool(id: StyleId): void {
    this.openNotebook.useTool(id);
    this.setFocus();
  }

  // -- PRIVATE --

  // Private Constructor

  private constructor($elt: HTMLDivElement) {
    this.$elt = $elt;
    $configure($elt, { listeners: {
      blur: e=>this.onBlur(e),
      focus: e=>this.onFocus(e),
      keyup: e=>this.onKeyUp(e),
    }});

    this.cellViews = new Map();
    this.dirtyCells = new Set();
    this.topOfUndoStack = 0;
    this.undoStack = [];
  }

  // Private Instance Properties

  private $elt: HTMLElement;
  private cellViews: Map<StyleId, CellView>;
  private dirtyCells: Set<StyleId>;             // Style ids of top-level styles that need to be redrawn.
  private lastCellSelected?: CellView;
  private sidebar!: Sidebar;
  private topOfUndoStack: number; // Index of the top of the stack. May not be the length of the undoStack array if there have been some undos.
  private undoStack: UndoEntry[];

  // Private Instance Property Functions

  private cellViewFromStyleId(styleId: StyleId): CellView {
    return this.cellViews.get(styleId)!;
  }

  private cellViewFromElement($elt: HTMLDivElement): CellView {
    // Strip 'C' prefix from cell ID to get the style id.
    const styleId: StyleId = parseInt($elt.id.slice(1), 10);
    return this.cellViewFromStyleId(styleId);
  }

  private firstCell(): CellView | undefined {
    const styleOrder = this.openNotebook.topLevelStyleOrder();
    if (styleOrder.length==0) { return undefined; }
    const styleId = styleOrder[0];
    const cellView = this.cellViewFromStyleId(styleId);
    assert(cellView);
    return cellView;
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

  private selectedCells(): CellView[] {
    const rval: CellView[] = [];
    for (const cellView of this.cellViews.values()) {
      if (cellView.isSelected()) { rval.push(cellView); }
    }
    return rval;
  }

  // Private Instance Methods

  private startEditingCell(styleId: StyleId): void {
    const cellView = this.cellViewFromStyleId(styleId);
    cellView.scrollIntoView();
    this.selectCell(cellView);
    cellView.editMode();
  }

  // Private Notebook Change Handlers

  // Private Event Handlers

  private async sendTrackedChangeRequests(changeRequests: NotebookChangeRequest[], options?: ChangeNotebookOptions): Promise<TrackedChangesResults> {
    return await this.openNotebook.sendTrackedChangeRequests(changeRequests, options);
  }

  private async sendUndoableChangeRequest(changeRequest: NotebookChangeRequest): Promise<NotebookChangeRequest> {
    const undoChangeRequests = await this.sendUndoableChangeRequests([changeRequest]);
    assert(undoChangeRequests.length==1);
    return undoChangeRequests[0];
  }

  private async sendUndoableChangeRequests(changeRequests: NotebookChangeRequest[]): Promise<NotebookChangeRequest[]> {
    // Disable the undo and redo buttons
    this.sidebar.enableRedoButton(false);
    this.sidebar.enableUndoButton(false);

    const { undoChangeRequests } = await this.sendTrackedChangeRequests(changeRequests, { wantUndo: true });
    if (!undoChangeRequests) { throw new Error("Did not get undo change requests when wantUndo is true."); }
    const entry: UndoEntry = { changeRequests, undoChangeRequests };
    while(this.undoStack.length > this.topOfUndoStack) { this.undoStack.pop(); }
    this.undoStack.push(entry);
    this.topOfUndoStack = this.undoStack.length;

    // Enable the undo button and disable the redo button.
    this.sidebar.enableRedoButton(false);
    this.sidebar.enableUndoButton(true);

    return undoChangeRequests;
  }

  // Private Event Handlers

  private onBlur(_event: FocusEvent): void {
    // console.log("BLUR!!!");
    // console.dir(event);
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
      console.log(`Command: ${commandName}`);
      commandFn.call(this)
      .catch(err=>{
        // REVIEW: Duplicated code in sidebar.ts/asyncCommand.
        // TODO: Display error message to user.
        console.error(`Error executing async ${commandName} command: ${err.message}`);
        // TODO: Dump stack trace
      });
    } else {
      if (IGNORED_KEYUPS.indexOf(keyName)<0) {
        console.log(`NotebookView unrecognized keyup : ${keyCombo}`);
      }
      // No command bound to that key.
      // REVIEW: Beep or something?
    }
  }
}

// Helper Functions
