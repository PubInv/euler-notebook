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

import * as debug1 from "debug";
const debug = debug1('client:notebook-edit-view');

import { CellId, CellObject, CellRelativePosition, CellType } from "../shared/cell";
import { CssClass, assert, Html, notImplemented } from "../shared/common";
import { CellDeleted, CellInserted, CellMoved, NotebookUpdate } from "../shared/server-responses";
import { DebugParams } from "../shared/api-calls";

import { CellEditView } from "./cell-edit-view";
import { HtmlElement } from "../html-element";
import { NotebookEditScreen } from "../screens/notebook-edit-screen";
import { reportError } from "../error-handler";
import { apiDebug } from "../api";
import { ClientNotebook, NotebookView } from "../client-notebook";
import { notebookUpdateSynopsis } from "../shared/debug-synopsis";
import { createCellView } from "./instantiator";

// Types

type CommandName = string;

type CommandFunction = (this: NotebookEditView)=>Promise<void>;

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
  // [ 'Enter', KeyMod.Alt, 'insertFormulaCellBelow'],
  // TODO: [ 'Enter', KeyMod.Alt|KeyMod.Shift, 'insertFormulaCellAbove'],
  [ 'Escape', KeyMod.None, 'unselectAll'],
];

const KEY_BINDINGS = new Map<KeyCombo, CommandName>(KEY_MAP.map(([ keyName, keyMods, commandName])=>[ `${keyName}${keyMods}`, commandName ]));


// Exported Class

export class NotebookEditView extends HtmlElement<'div'> implements NotebookView {

  // Public Class Methods

  // Public Constructor

  public constructor(container: NotebookEditScreen, notebook: ClientNotebook) {
    super({
      tag: 'div',
      appendTo: container.$elt,
      class: <CssClass>'content',
      listeners: {
        blur: e=>this.onBlur(e),
        focus: e=>this.onFocus(e),
        keyup: e=>this.onKeyUp(e),
      }
    });

    this.cellViews = [];
    this.container = container;
    this.insertMode = CellType.Formula;
    this.notebook = notebook;

    for (let cellIndex=0; cellIndex<notebook.cells.length; cellIndex++) {
      const cellObject = notebook.cells[cellIndex].obj;
      const cellUpdate: CellInserted = { type: 'cellInserted', cellObject, cellIndex }
      this.onCellInserted(cellUpdate);
    }
  }

  // Public Instance Properties

  public insertMode: CellType;

  // Public Instance Property Functions

  // Public Instance Methods

  // public scrollPageIntoView(pageId: PageId): void {
  //   // TODO: This will not work when cells can be added or removed.
  //   const pageData = DOCUMENT.pages.find(p=>p.id == pageId);
  //   if (!pageData) { throw new Error(`Page with ID not found: ${pageId}`); }
  //   const cellData = pageData.cells[0];
  //   // TODO: This doesn't work of the page doesn't have any cells.
  //   const cellId = cellData.id;
  //   const $cell = $<SVGSVGElement>(this.$elt, `#${cellId}`);
  //   $cell!.scrollIntoView({ block: 'start'});
  // }

  // NOTE: When sidebar switches views it calls .focus() on the element directly,
  //       It does not call this function.
  public setFocus(): void {
    this.$elt.focus();
  }

  // Commands
  // (Public instance methods bound to keystrokes)

  public async deleteSelectedCells(): Promise<void> {
    notImplemented();
    // const cellViews = this.selectedCells();
    // await this.unselectAll();
    // const changeRequests = cellViews.map<DeleteCell>(c=>({ type: 'deleteCell', cellId: c.id }));
    // await this.sendUndoableChangeRequests(changeRequests);
  }

  public async developmentButtonClicked(): Promise<void> {
    // This code is executed when the user presses the underwear button in the sidebar.
    // For when a developer needs a button to initiate a test action.
    console.log('Development Button Clicked!');
    if (!this.lastCellSelected) { return; /* TODO: warning that no cell selected. */}
    const notebookPath = this.notebook.path;
    const cellId = this.lastCellSelected?.id;
    const params: DebugParams = { notebookPath, cellId };
    /* const results = */ await apiDebug(params);
    notImplemented();
    // WAS: this.screen.debugPopup.showContents(results.html);
  }

  public async insertCell(afterId: CellRelativePosition): Promise<void> {
    debug("Insert Cell");
    await this.notebook.insertCell(this.insertMode, afterId);
  }

  // public async insertFigureCellBelow(afterId?: CellRelativePosition): Promise<void> {
  //   debug("Insert Figure Cell Below");

  //   // If cell to insert after is not specified, then insert below the last cell selected.
  //   // If no cells are selected, then insert at the end of the notebook.
  //   if (afterId === undefined) {
  //     if (this.lastCellSelected) { afterId = this.lastCellSelected.id; }
  //     else { afterId = CellPosition.Bottom; }
  //   }
  //   await this.notebook.insertCell(CellType.Figure, afterId);
  //   // TODO: Set focus?
  // }

  // public async insertFormulaCellBelow(afterId?: CellRelativePosition): Promise<void> {
  //   debug("Insert Formula Cell Below");

  //   // If cell to insert after is not specified, then insert below the last cell selected.
  //   // If no cells are selected, then insert at the end of the notebook.
  //   if (afterId === undefined) {
  //     if (this.lastCellSelected) { afterId = this.lastCellSelected.id; }
  //     else { afterId = CellPosition.Bottom; }
  //   }
  //   await this.notebook.insertCell(CellType.Formula, afterId);
  //   // const inputMode = userSettingsInstance.defaultInputMode;
  //   // TODO: Set focus?
  // }

  // public async insertTextCellBelow(afterId?: CellRelativePosition): Promise<void> {
  //   debug("Insert Text Cell Below");

  //   // If cell to insert after is not specified, then insert below the last cell selected.
  //   // If no cells are selected, then insert at the end of the notebook.
  //   if (afterId === undefined) {
  //     if (this.lastCellSelected) { afterId = this.lastCellSelected.id; }
  //     else { afterId = CellPosition.Bottom; }
  //   }

  //   await this.notebook.insertCell(CellType.Text, afterId);
  //   // TODO: Set focus?
  // }

  public async moveSelectionDown(): Promise<void> {
    notImplemented();
    // // TODO: contiguous multiple selection
    // // TODO: discontiguous multiple selection
    // // TODO: scroll into view if necessary.
    // if (!this.lastCellSelected) {
    //   // Nothing selected to move.
    //   // REVIEW: Beep or something?
    //   return;
    // }
    // const cellId = this.lastCellSelected.id;

    // const nextCell = this.nextCell(this.lastCellSelected);
    // if (!nextCell) {
    //   // Selected cell is already the last cell. Nowhere down to go.
    //   return;
    // }
    // const nextNextCell = this.nextCell(nextCell);
    // const afterId = nextNextCell ? nextCell.id : CellPosition.Bottom;

    // const request: MoveCell = { type: 'moveCell', cellId, afterId };
    // await this.sendUndoableChangeRequests([ request ]);
  }

  public async moveSelectionUp(): Promise<void> {
    notImplemented();
    // // TODO: contiguous multiple selection
    // // TODO: discontiguous multiple selection
    // // TODO: scroll into view if necessary.
    // if (!this.lastCellSelected) {
    //   // Nothing selected to move.
    //   // REVIEW: Beep or something?
    //   return;
    // }
    // const cellId = this.lastCellSelected.id;

    // const previousCell = this.previousCell(this.lastCellSelected);
    // if (!previousCell) {
    //   // Selected cell is already the first cell. Nowhere up to go.
    //   return;
    // }
    // const previousPreviousCell = this.previousCell(previousCell);
    // const afterId = previousPreviousCell ? previousPreviousCell.id : /* top */ 0;

    // const request: MoveCell = { type: 'moveCell', cellId, afterId };
    // await this.sendUndoableChangeRequests([ request ]);
  }

  public async redo(): Promise<void> {
    // Disable undo and redo buttons during the operation.
    this.container.sidebar.$redoButton.disabled = true;
    this.container.sidebar.$undoButton.disabled = true;

    const moreRedoAvailable = await this.notebook.redo();

    // Enable undo and redo buttons as appropriate.
    this.container.sidebar.$redoButton.disabled = !moreRedoAvailable;
    this.container.sidebar.$undoButton.disabled = false;
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
    // REVIEW: Do we really want to disable the buttons?
    //         User should be able to hammer the undo button several times to undo several changes quickly.
    // Disable undo and redo during the operation
    this.container.sidebar.$redoButton.disabled = true;
    this.container.sidebar.$undoButton.disabled = true;

    const moreUndoAvailable = await this.notebook.undo();

    // Enable undo and redo as appropriate
    this.container.sidebar.$redoButton.disabled = false;
    this.container.sidebar.$undoButton.disabled = !moreUndoAvailable;
  }

  // REVIEW: Not actually asynchronous. Have synchronous alternative for internal use?
  public async unselectAll(noEmit?: boolean): Promise<void> {
    for (const cellView of this.cellViews) {
      if (cellView.isSelected()) { cellView.unselect(); }
    }
    delete this.lastCellSelected;
    if (!noEmit) {
      this.container.sidebar.$trashButton.disabled = true;
    }
  }

  // Public Instance Methods

  public deleteCell(cellView: CellEditView<any>): void {
    if (cellView == this.lastCellSelected) {
      delete this.lastCellSelected;
    }
    this.$elt.removeChild(cellView.$elt);
    notImplemented();
    // TODO: Splice cell view out of cellViews array.
  }

  // // REVIEW: Should be limited to changing a single style so this isn't used as backdoor
  // //         for submitting arbitrary changes.
  // public async editStyle(changeRequests: NotebookChangeRequest[]): Promise<void> {
  //   await this.sendUndoableChangeRequests(changeRequests);
  // }

  // public async insertStyle<T extends CellObject>(cellObject: T, afterId: CellRelativePosition = CellPosition.Bottom): Promise<void> {
  //   const changeRequest: InsertCell<T> = { type: 'insertCell', cellObject, afterId };
  //   await this.sendUndoableChangeRequests([ changeRequest ]);
  // }

  public selectCell(
    cellView: CellEditView<any>,
    rangeExtending?: boolean, // Extending selection by a contiguous range.
    indivExtending?: boolean, // Extending selection by an individual cell, possibly non-contiguous.
  ): void {
    // Erase tools panel. Newly selected cell will populate, if it is the only cell selected.
    this.container.tools.clear();

    const solo = !rangeExtending && !indivExtending;
    if (solo) {
      this.unselectAll(true);
    }
    cellView.select();
    cellView.renderTools(this.container.tools);
    this.lastCellSelected = cellView;
    this.container.sidebar.$trashButton.disabled = false;
  }

  public useTool(id: CellId): void {
    this.notebook.useTool(id);
    this.setFocus();
  }

  // Public Instance Event Handlers

  public onClosed(_reason: string): void {
    notImplemented();
  }

  public onUpdate(update: NotebookUpdate): void {
    debug(`onUpdate P${this.notebook.path} ${notebookUpdateSynopsis(update)}`);

    // Update our data structure
    switch (update.type) {
      case 'cellDeleted':  this.onCellDeleted(update); break;
      case 'cellInserted': this.onCellInserted(update); break;
      case 'cellMoved':    this.onCellMoved(update); break;
      default: /* Nothing to do */ break;
    }
  }

  // -- PRIVATE --

  // Private Instance Properties

  private cellViews:CellEditView<any>[];
  private container: NotebookEditScreen;
  private lastCellSelected?: CellEditView<any>;
  private notebook: ClientNotebook;

  // Private Instance Property Functions

  private cellViewFromId<O extends CellObject>(cellId: CellId): CellEditView<O> {
    const cellView = this.cellViews.find(cellView => cellView.id===cellId);
    assert(cellView);
    return <CellEditView<O>>cellView;
  }

  private cellViewFromElement<O extends CellObject>($elt: HTMLDivElement): CellEditView<O> {
    // Strip 'C' prefix from cell ID to get the style id.
    const cellId: CellId = parseInt($elt.id.slice(1), 10);
    return this.cellViewFromId(cellId);
  }

  private firstCell<O extends CellObject>(): CellEditView<O> | undefined {
    const $elt = <HTMLDivElement|null>this.$elt.firstElementChild;
    return $elt ? this.cellViewFromElement($elt) : undefined;
  }

  private lastCell<O extends CellObject>(): CellEditView<O> | undefined {
    const $elt = <HTMLDivElement|null>this.$elt.lastElementChild;
    return $elt ? this.cellViewFromElement($elt) : undefined;
  }

  private nextCell<O extends CellObject>(cellView: CellEditView<any>): CellEditView<O> | undefined {
    const $elt = <HTMLDivElement|null>cellView.$elt.nextElementSibling;
    return $elt ? this.cellViewFromElement($elt) : undefined;
  }

  private previousCell<O extends CellObject>(cellView: CellEditView<any>): CellEditView<O> | undefined {
    const $elt = <HTMLDivElement|null>cellView.$elt.previousElementSibling;
    return $elt ? this.cellViewFromElement($elt) : undefined;
  }

  // private selectedCells(): CellEditView<any>[] {
  //   const rval: CellEditView<any>[] = [];
  //   for (const cellView of this.cellViews.values()) {
  //     if (cellView.isSelected()) { rval.push(cellView); }
  //   }
  //   return rval;
  // }

  // Private Instance Methods

  // private createCellView<O extends CellObject>(cell: ClientCell<O>, afterId: CellRelativePosition): CellEditView<O> {
  //   const cellView = cell.createEditView();
  //   this.cellViews.set(cell.id, cellView);

  //   if (afterId == CellPosition.Top) {
  //     this.$elt.prepend(cellView.$elt);
  //   } else if (afterId == CellPosition.Bottom) {
  //     this.$elt.append(cellView.$elt);
  //   } else {
  //     const afterCell = this.cellViews.get(afterId);
  //     if (!afterCell) { throw new Error(`Cannot insert cell after unknown cell ${afterId}`); }
  //     afterCell.$elt.insertAdjacentElement('afterend', cellView.$elt);
  //   }

  //   return cellView;
  // }

  // private async sendUndoableChangeRequest(changeRequest: NotebookChangeRequest): Promise<NotebookChangeRequest> {
  //   const undoChangeRequests = await this.sendUndoableChangeRequests([changeRequest]);
  //   assert(undoChangeRequests.length==1);
  //   return undoChangeRequests[0];
  // }


  // Private Event Handlers

  private onBlur(_event: FocusEvent): void {
    // console.log("BLUR!!!");
    // console.dir(event);
  }

  private onCellDeleted(update: CellDeleted): void {
    const cellIndex = this.cellViews.findIndex(cellView => cellView.id === update.cellId);
    const cellView = this.cellViews[cellIndex];
    this.cellViews.splice(cellIndex, 1);
    cellView.$elt.remove();
  }

  private onCellInserted(update: CellInserted): void {
    const { cellObject, cellIndex } = update;
    const cell = this.notebook.getCell(cellObject.id);
    const cellView = createCellView(this, cell);
    this.cellViews.splice(cellIndex, 0, cellView);
    if (cellIndex === 0) {
      this.$elt.prepend(cellView.$elt);
    } else {
      const precedingCellView = this.cellViews[cellIndex-1];
      precedingCellView.$elt.after(cellView.$elt);
    }
  }

  private onCellMoved(_update: CellMoved): void {
    notImplemented();
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
        reportError(err, <Html>`Error in '${commandName}'`);
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
