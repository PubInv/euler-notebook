/*
Euler Notebook
Copyright (C) 2019-21 Public Invention
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

import { CellId, CellObject, CellPosition, CellRelativePosition, CellType } from "../../../shared/cell";
import { assert, Html, notImplementedError, notImplementedWarning } from "../../../shared/common";
import { CssClass } from "../../../shared/css";
import { DebugParams } from "../../../shared/api-calls";
import { notebookUpdateSynopsis } from "../../../shared/debug-synopsis";
import { CellDeleted, CellInserted, CellMoved, NotebookUpdate } from "../../../shared/server-responses";

import { StylusMode } from "../../../components/stroke-panel";

import { NotebookEditScreen } from "..";

import { HtmlElement } from "../../../html-element";
import { showError } from "../../../error-handler";
import { apiDebug } from "../../../api";
import { ClientNotebook } from "../../../models/client-notebook";
import { $, RIGHT_TRIANGLE_ENTITY } from "../../../dom";

import { CellEditView } from "./cell-edit-view";
import { createCellView } from "./cell-edit-view/instantiator";

// Types

type CommandName = string;

type CommandFunction = (this: NotebookEditView)=>Promise<void>;

enum KeyMod {
  None  = 0,
  Alt   = 1,    // Option key on Mac.
  Ctrl  = 2,
  Meta  = 4,    // Command key on Mac, Windows key on Windows.
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

export class NotebookEditView extends HtmlElement<'div'> {

  // Public Class Methods

  // Public Constructor

  public constructor(container: NotebookEditScreen, notebook: ClientNotebook) {
    super({
      tag: 'div',
      class: <CssClass>'content',
      listeners: {
        blur: e=>this.onBlur(e),
        focus: e=>this.onFocus(e),
        keyup: e=>this.onKeyUp(e),
      },
      children: [{
        tag: 'button',
        attrs: { tabindex: -1 },
        classes: [ <CssClass>'insertCellAtTopButton', <CssClass>'iconButton' ],
        html: RIGHT_TRIANGLE_ENTITY,
        asyncButtonHandler: e=>this.onInsertCellAtTopButtonClicked(e),
      }]
    });

    this.cellViewMap = new Map();
    this.container = container;
    this.insertMode = CellType.Formula;
    this._stylusMode = StylusMode.Draw;
    this.notebook = notebook;

    let afterId: CellRelativePosition = CellPosition.Top;
    for (const cellObject of notebook.cellObjects()) {
      const cellUpdate: CellInserted = { type: 'cellInserted', cellObject, afterId }
      this.onCellInserted(cellUpdate);
      afterId = cellObject.id;
    }
  }

  // Public Instance Properties

  public insertMode: CellType;
  private _stylusMode: StylusMode;

  // Public Instance Property Functions

  public get stylusMode(): StylusMode {
    return this._stylusMode;
  }

  public set stylusMode(value: StylusMode) {
    this._stylusMode = value;
    for (const cellView of this.cellViewMap.values()) {
      cellView.stylusMode = value;
    }
  }

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
    notImplementedError("NotebookEditView delete selected cells");
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
    notImplementedError("NotebookEditView developmentButtonClicked");
    // WAS: this.screen.debugPopup.showContents(results.html);
  }

  public async insertCellRequest(afterId: CellRelativePosition): Promise<void> {
    await this.notebook.insertCellRequest(this.insertMode, afterId);
  }

  public async moveCellRequest(movedCellId: CellId, droppedCellId: CellId): Promise<void> {
    debug(`Move cell: ${movedCellId}, ${droppedCellId}`);
    // REVIEW: Placeholder move?
    await this.notebook.moveCellRequest(movedCellId, droppedCellId);
  }

  public async moveSelectionDown(): Promise<void> {
    notImplementedError("NotebookEditView moveSelectionDown");
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
    notImplementedError("NotebookEditView MoveSelectionUp");
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

  // REVIEW: Not actually asynchronous. Have synchronous alternative for internal use?
  public async unselectAll(noEmit?: boolean): Promise<void> {
    for (const cellView of this.cellViewMap.values()) {
      if (cellView.isSelected()) { cellView.unselect(); }
    }
    delete this.lastCellSelected;
    if (!noEmit) {
      this.container.sidebar.$trashButton.disabled = true;
    }
  }

  // Public Instance Methods

  public deleteCell(cellView: CellEditView<CellObject>): void {
    if (cellView == this.lastCellSelected) {
      delete this.lastCellSelected;
    }
    this.$elt.removeChild(cellView.$elt);
    notImplementedError("NotebookEditView deleteCell");
    // TODO: Splice cell view out of cellViews array.
  }

  public selectCell(
    cellView: CellEditView<CellObject>,
    rangeExtending?: boolean, // Extending selection by a contiguous range.
    indivExtending?: boolean, // Extending selection by an individual cell, possibly non-contiguous.
  ): void {
    const solo = !rangeExtending && !indivExtending;
    if (solo) {
      this.unselectAll(true);
    }
    cellView.select();
    this.lastCellSelected = cellView;
    this.container.sidebar.$trashButton.disabled = false;
  }

  // Public Instance Event Handlers

  public onClosed(_reason: string): void {
    notImplementedWarning("NotebookEditView onClosed");
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

  private cellViewMap: Map<CellId, CellEditView<CellObject>>;
  private container: NotebookEditScreen;
  private lastCellSelected?: CellEditView<CellObject>;
  private notebook: ClientNotebook;

  // Private Instance Property Functions

  private getCellView<O extends CellObject>(cellId: CellId): CellEditView<O> {
    const rval = this.cellViewMap.get(cellId)!;
    assert(rval);
    return <CellEditView<O>>rval;
  }

  private cellViewFromElement<O extends CellObject>($elt: HTMLDivElement): CellEditView<O> {
    // Strip 'C' prefix from cell ID to get the style id.
    const cellId: CellId = parseInt($elt.id.slice(1), 10);
    return this.getCellView(cellId);
  }

  // private cellViewIndex(cellId: CellId): CellIndex {
  //   const rval = this.cellViews.findIndex(cellView => cellView.id === cellId);
  //   assert(rval>=0);
  //   return rval;
  // }

  private firstCell<O extends CellObject>(): CellEditView<O> | undefined {
    const $elt = <HTMLDivElement|null>this.$elt.firstElementChild;
    return $elt ? this.cellViewFromElement($elt) : undefined;
  }

  private lastCell<O extends CellObject>(): CellEditView<O> | undefined {
    const $elt = <HTMLDivElement|null>this.$elt.lastElementChild;
    return $elt ? this.cellViewFromElement($elt) : undefined;
  }

  private nextCell<O extends CellObject>(cellView: CellEditView<CellObject>): CellEditView<O> | undefined {
    const $elt = <HTMLDivElement|null>cellView.$elt.nextElementSibling;
    return $elt ? this.cellViewFromElement($elt) : undefined;
  }

  private previousCell<O extends CellObject>(cellView: CellEditView<CellObject>): CellEditView<O> | undefined {
    const $elt = <HTMLDivElement|null>cellView.$elt.previousElementSibling;
    return $elt ? this.cellViewFromElement($elt) : undefined;
  }

  // Private Instance Methods

  private deleteCellView(cellId: CellId): CellEditView<CellObject> {
    const cellView =  this.getCellView(cellId);
    cellView.$elt.remove();
    this.cellViewMap.delete(cellId);
    return cellView;
  }

  private insertCellView(cellView: CellEditView<CellObject>, afterId: CellRelativePosition): void {
    this.cellViewMap.set(cellView.id, cellView);
    if (afterId == CellPosition.Top) {
      $(this.$elt, '.insertCellAtTopButton').after(cellView.$elt);
    } else if (afterId == CellPosition.Bottom) {
      this.$elt.append(cellView.$elt);
    } else {
      const precedingCellView = this.getCellView(afterId);
      precedingCellView.$elt.after(cellView.$elt);
    }
  }

  // Private Instance Event Handlers

  private onBlur(_event: FocusEvent): void {
    // console.log("BLUR!!!");
    // console.dir(event);
  }

  private onCellDeleted(update: CellDeleted): void {
    const { cellId } = update;
    const cellView = this.deleteCellView(cellId);
    cellView.onCellDeleted(update);
  }

  private onCellInserted(update: CellInserted): void {
    const { cellObject, afterId } = update;
    const cell = this.notebook.getCell(cellObject.id);
    const cellView = createCellView(this, cell);
    this.insertCellView(cellView, afterId);
  }

  private onCellMoved(update: CellMoved): void {
    const { cellId, afterId } = update;
    const cellView = this.deleteCellView(cellId);
    this.insertCellView(cellView, afterId);
  }

  private async onInsertCellAtTopButtonClicked(event: MouseEvent): Promise<void> {
    event.preventDefault(); // Don't take focus.
    await this.insertCellRequest(CellPosition.Top);
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
        showError(err, <Html>`Error in '${commandName}'`);
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
