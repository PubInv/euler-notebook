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
const debug = debug1('client:notebook-edit-screen-content');

import { CellId, CellObject, CellRelativePosition, CellPosition, CellType, InputType, TextCellObject, FigureCellObject } from "../../../shared/cell";
import { CssClass, assert, Html, assertFalse, notImplemented, emptySvg, PlainText, POINTS_PER_INCH, CssSize, CssLength } from "../../../shared/common";
import { DeleteCell, InsertCell, MoveCell, NotebookChangeRequest, } from "../../../shared/client-requests";
import { NotebookUpdate } from "../../../shared/server-responses";
import { DebugParams, DebugResults, } from "../../../shared/api-calls";

import { CellBase } from "./cells/cell-base";
import { createCell } from "./cells/index";
import { HtmlElement } from "../../../html-element";
import { NotebookEditScreen } from "..";
import { reportError } from "../../../error-handler";
import { userSettingsInstance } from "../../../user-settings";
import { EMPTY_FORMULA, FormulaCellObject } from "../../../shared/formula";
import { emptyStylusInput } from "../../../shared/stylus";

// Types

type CommandName = string;

type CommandFunction = (this: Content)=>Promise<void>;

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
  [ 'Enter', KeyMod.Alt, 'insertFormulaCellBelow'],
  // TODO: [ 'Enter', KeyMod.Alt|KeyMod.Shift, 'insertFormulaCellAbove'],
  [ 'Escape', KeyMod.None, 'unselectAll'],
];

const KEY_BINDINGS = new Map<KeyCombo, CommandName>(KEY_MAP.map(([ keyName, keyMods, commandName])=>[ `${keyName}${keyMods}`, commandName ]));


// Exported Class

export class Content extends HtmlElement<'div'>{

  // Public Class Methods

  // Public Constructor

  public constructor(screen: NotebookEditScreen) {
    super({
      tag: 'div',
      appendTo: screen.$elt,
      class: <CssClass>'content',
      listeners: {
        blur: e=>this.onBlur(e),
        focus: e=>this.onFocus(e),
        keyup: e=>this.onKeyUp(e),
      }
    });
    this.screen = screen;

    this.cellViews = new Map();
    this.dirtyCells = new Set();
    this.topOfUndoStack = 0;
    this.undoStack = [];

    for (const cellId of this.screen.notebook.topLevelCellOrder()) {
      const cellObject = this.screen.notebook.getCell(cellId);
      this.createCell(cellObject, -1);
    }

  }

  // Public Instance Properties

  public screen: NotebookEditScreen;

  // Public Instance Property Functions

  // Public Instance Methods

  public async deleteTopLevelStyle(cellId: CellId): Promise<void> {
    await this.unselectAll();
    const changeRequest: DeleteCell = { type: 'deleteCell', cellId: cellId };
    await this.sendUndoableChangeRequests([changeRequest]);
  }

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
    const cellViews = this.selectedCells();
    await this.unselectAll();
    const changeRequests = cellViews.map<DeleteCell>(c=>({ type: 'deleteCell', cellId: c.cellId }));
    await this.sendUndoableChangeRequests(changeRequests);
  }

  public async developmentButtonClicked(): Promise<void> {
    // This code is executed when the user presses the underwear button in the sidebar.
    // For when a developer needs a button to initiate a test action.
    console.log('Development Button Clicked!');
    const notebookPath = this.screen.notebook.path;
    const cellId = this.lastCellSelected?.cellId;
    const params: DebugParams = { notebookPath, cellId };

    const api = '/api/debug';
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    const body = JSON.stringify(params);
    const response = await fetch(api, { method: 'POST', headers, body });
    if (response.status != 200) {
      console.error(`Error ${response.status} returned from ${api}`);
    }
    // REVIEW: Check results headers for content type?
    /* const results = */<DebugResults>await response.json();
    notImplemented();
    // WAS: this.screen.debugPopup.showContents(results.html);
  }

  public async insertFigureCellBelow(afterId?: CellRelativePosition): Promise<void> {
    debug("Insert Figure Cell Below");

    // If cell to insert after is not specified, then insert below the last cell selected.
    // If no cells are selected, then insert at the end of the notebook.
    if (afterId === undefined) {
      if (this.lastCellSelected) { afterId = this.lastCellSelected.cellId; }
      else { afterId = CellPosition.Bottom; }
    }

    const cssSize: CssSize = {
      height: <CssLength>`${2*POINTS_PER_INCH}pt`,
      width: <CssLength>`${6.5*POINTS_PER_INCH}pt`,
    }
    let changeRequest: InsertCell<FigureCellObject>;
      changeRequest = {
        type: 'insertCell',
        cellObject: {
          id: 0,
          type: CellType.Figure,
          inputType: InputType.Stylus,
          cssSize,
          displaySvg: emptySvg(cssSize),
          source: 'USER',
          stylusInput: emptyStylusInput(cssSize),
          stylusSvg: emptySvg(cssSize),
        },
        afterId,
      };
    /* const undoChangeRequest = */await this.screen.notebook.sendChangeRequest(changeRequest);
    // const cellId = (<DeleteCellRequest>undoChangeRequest).cellId;

    // TODO: Set focus?
  }

  public async insertFormulaCellBelow(afterId?: CellRelativePosition): Promise<void> {
    debug("Insert Formula Cell Below");

    // If cell to insert after is not specified, then insert below the last cell selected.
    // If no cells are selected, then insert at the end of the notebook.
    if (afterId === undefined) {
      if (this.lastCellSelected) { afterId = this.lastCellSelected.cellId; }
      else { afterId = CellPosition.Bottom; }
    }

    const cssSize: CssSize = {
      height: <CssLength>`${1*POINTS_PER_INCH}pt`,
      width: <CssLength>`${6.5*POINTS_PER_INCH}pt`,
    }
    let changeRequest: InsertCell<FormulaCellObject>;
    const inputMode = userSettingsInstance.defaultInputMode;
    if (inputMode == 'keyboard') {
      changeRequest = {
        type: 'insertCell',
        cellObject: {
          id: 0,
          type: CellType.Formula,
          inputText: <PlainText>"",
          cssSize,
          displaySvg: emptySvg(cssSize),
          inputType: InputType.Keyboard,
          plainTextFormula: EMPTY_FORMULA,
          source: 'USER',
        },
        afterId,
      };
    } else {
      changeRequest = {
        type: 'insertCell',
        cellObject: {
          id: 0,
          type: CellType.Formula,
          inputType: InputType.Stylus,
          displaySvg: emptySvg(cssSize),
          cssSize,
          plainTextFormula: EMPTY_FORMULA,
          source: 'USER',
          stylusInput: emptyStylusInput(cssSize),
          stylusSvg: emptySvg(cssSize),
        },
        afterId,
      };
    }
    /* const undoChangeRequest = */await this.screen.notebook.sendChangeRequest(changeRequest);
    // const cellId = (<DeleteCellRequest>undoChangeRequest).cellId;

    // TODO: Set focus?
  }

  public async insertTextCellBelow(afterId?: CellRelativePosition): Promise<void> {
    debug("Insert Text Cell Below");

    // If cell to insert after is not specified, then insert below the last cell selected.
    // If no cells are selected, then insert at the end of the notebook.
    if (afterId === undefined) {
      if (this.lastCellSelected) { afterId = this.lastCellSelected.cellId; }
      else { afterId = CellPosition.Bottom; }
    }

    const cssSize: CssSize = {
      height: <CssLength>`${1*POINTS_PER_INCH}pt`,
      width: <CssLength>`${6.5*POINTS_PER_INCH}pt`,
    }
    const inputMode = userSettingsInstance.defaultInputMode;
    let changeRequest: InsertCell<TextCellObject>;
    if (inputMode == 'keyboard') {
      changeRequest = {
        type: 'insertCell',
        cellObject: {
          id: 0,
          type: CellType.Text,
          inputType: InputType.Keyboard,
          cssSize,
          displaySvg: emptySvg(cssSize),
          inputText: <PlainText>"",
          source: 'USER',
        },
        afterId,
      };
    } else {
      changeRequest = {
        type: 'insertCell',
        cellObject: {
          id: 0,
          type: CellType.Text,
          inputType: InputType.Stylus,
          cssSize,
          displaySvg: emptySvg(cssSize),
          source: 'USER',
          stylusInput: emptyStylusInput(cssSize),
          stylusSvg: emptySvg(cssSize),
        },
        afterId,
      };
    }
    /* const undoChangeRequest = */await this.screen.notebook.sendChangeRequest(changeRequest);
    // const cellId = (<DeleteCellRequest>undoChangeRequest).cellId;

    // TODO: Set focus?
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
    const cellId = this.lastCellSelected.cellId;

    const nextCell = this.nextCell(this.lastCellSelected);
    if (!nextCell) {
      // Selected cell is already the last cell. Nowhere down to go.
      return;
    }
    const nextNextCell = this.nextCell(nextCell);
    const afterId = nextNextCell ? nextCell.cellId : CellPosition.Bottom;

    const request: MoveCell = { type: 'moveCell', cellId, afterId };
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
    const cellId = this.lastCellSelected.cellId;

    const previousCell = this.previousCell(this.lastCellSelected);
    if (!previousCell) {
      // Selected cell is already the first cell. Nowhere up to go.
      return;
    }
    const previousPreviousCell = this.previousCell(previousCell);
    const afterId = previousPreviousCell ? previousPreviousCell.cellId : /* top */ 0;

    const request: MoveCell = { type: 'moveCell', cellId, afterId };
    await this.sendUndoableChangeRequests([ request ]);
  }

  public async redo(): Promise<void> {
    // Disable undo and redo buttons during the operation.
    this.screen.sidebar.$redoButton.disabled = true;
    this.screen.sidebar.$undoButton.disabled = true;

    // Resubmit the change requests.
    assert(this.topOfUndoStack < this.undoStack.length);
    const entry = this.undoStack[this.topOfUndoStack++];
    await this.sendUndoableChangeRequests(entry.changeRequests);

    // Enable undo and redo buttons as appropriate.
    this.screen.sidebar.$redoButton.disabled = (this.topOfUndoStack >= this.undoStack.length);
    this.screen.sidebar.$undoButton.disabled = false;
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
    this.screen.sidebar.$redoButton.disabled = true;
    this.screen.sidebar.$undoButton.disabled = true;

    // Undo the changes by making a set of counteracting changes.
    assert(this.topOfUndoStack > 0);
    const entry = this.undoStack[--this.topOfUndoStack];
    await this.screen.notebook.sendChangeRequests(entry.undoChangeRequests);

    // Enable undo and redo as appropriate
    this.screen.sidebar.$redoButton.disabled = false;
    this.screen.sidebar.$undoButton.disabled = (this.topOfUndoStack == 0);
  }

  // REVIEW: Not actually asynchronous. Have synchronous alternative for internal use?
  public async unselectAll(noEmit?: boolean): Promise<void> {
    for (const cellView of this.cellViews.values()) {
      if (cellView.isSelected()) { cellView.unselect(); }
    }
    delete this.lastCellSelected;
    if (!noEmit) {
      this.screen.sidebar.$trashButton.disabled = true;
    }
  }

  // Instance Methods

  public createCell(style: CellObject, afterId: CellRelativePosition): CellBase {
    const cellView = createCell(this, style);
    this.cellViews.set(style.id, cellView);
    this.insertCell(cellView, afterId);
    return cellView;
  }

  public deleteCell(cellView: CellBase): void {
    if (cellView == this.lastCellSelected) {
      delete this.lastCellSelected;
    }
    this.$elt.removeChild(cellView.$elt);
    this.cellViews.delete(cellView.cellId);
  }

  // REVIEW: Should be limited to changing a single style so this isn't used as backdoor
  //         for submitting arbitrary changes.
  public async editStyle(changeRequests: NotebookChangeRequest[]): Promise<void> {
    await this.sendUndoableChangeRequests(changeRequests);
  }

  public insertCell(cellView: CellBase, afterId: CellRelativePosition): void {
    if (afterId == CellPosition.Top) {
      this.$elt.prepend(cellView.$elt);
    } else if (afterId == CellPosition.Bottom) {
      this.$elt.append(cellView.$elt);
    } else {
      const afterCell = this.cellViews.get(afterId);
      if (!afterCell) { throw new Error(`Cannot insert cell after unknown cell ${afterId}`); }
      afterCell.$elt.insertAdjacentElement('afterend', cellView.$elt);
    }
  }

  public async insertStyle<T extends CellObject>(cellObject: T, afterId: CellRelativePosition = CellPosition.Bottom): Promise<void> {
    const changeRequest: InsertCell<T> = { type: 'insertCell', cellObject, afterId };
    await this.sendUndoableChangeRequests([ changeRequest ]);
  }

  public selectCell(
    cellView: CellBase,
    rangeExtending?: boolean, // Extending selection by a contiguous range.
    indivExtending?: boolean, // Extending selection by an individual cell, possibly non-contiguous.
  ): void {
    // Erase tools panel. Newly selected cell will populate, if it is the only cell selected.
    this.screen.tools.clear();

    const solo = !rangeExtending && !indivExtending;
    if (solo) {
      this.unselectAll(true);
    }
    cellView.select();
    cellView.renderTools(this.screen.tools);
    this.lastCellSelected = cellView;
    this.screen.sidebar.$trashButton.disabled = false;
  }

  public useTool(id: CellId): void {
    this.screen.notebook.useTool(id);
    this.setFocus();
  }

  // ClientNotebookWatcher Methods

  public onChange(change: NotebookUpdate): void {
    const notebook = this.screen.notebook;
    // If a change would (or might) modify the display of a cell,
    // then mark add the cell to a list of cells to be redrawn.
    // If a cell is deleted or moved, then make that change immediately.
    switch (change.type) {
      // case 'styleChanged': {
      //   // REVIEW: Is there a way to tell what styles affect display?
      //   const topLevelStyleId = notebook.topLevelStyleOf(change.style.id).id;
      //   this.dirtyCells.add(topLevelStyleId);
      //   this.cellViewFromId(topLevelStyleId).onChange(change);
      //   break;
      // }
      // case 'styleConverted': {
      //   const topLevelStyleId = notebook.topLevelStyleOf(change.cellId).id;
      //   this.dirtyCells.add(topLevelStyleId);
      //   this.cellViewFromId(topLevelStyleId).onChange(change);
      //   break;
      // }
      case 'cellDeleted': {
        // If a substyle is deleted then mark the cell as dirty.
        // If a top-level style is deleted then remove the cell.
        const cellObject = notebook.getCell(change.cellId);
        const cellView = this.cellViews.get(cellObject.id);
        assert(cellView);
        this.deleteCell(cellView!);
        this.dirtyCells.delete(cellObject.id);
        break;
      }
      case 'cellInserted': {
        this.createCell(change.cellObject, change.afterId!);
        break;
      }
      case 'cellMoved': {
        const cellObject = notebook.getCell(change.cellId);
        const movedCell = this.cellViews.get(cellObject.id);
        assert(movedCell);
        // Note: DOM methods ensure the element will be removed from
        //       its current parent.
        this.insertCell(movedCell!, change.afterId);
        // REVIEW: We do not pass the changed event to the moved cell, assuming it does not change. Safe assumption?
        break;
      }
      default: assertFalse();
    }
  }

  public onChangesFinished(): void {
    // Redraw all of the cells that (may) have changed.
    for (const cellId of this.dirtyCells) {
      const cellView = this.cellViewFromId(cellId);
      cellView.onChangesFinished();
    }
    if (this.lastCellSelected) {
      this.lastCellSelected.renderTools(this.screen.tools);
    }
    this.dirtyCells.clear();
  }

  // -- PRIVATE --

  // Private Instance Properties

  private cellViews: Map<CellId, CellBase>;
  private dirtyCells: Set<CellId>;     // Style ids of top-level styles that need to be redrawn.
  private lastCellSelected?: CellBase;
  private topOfUndoStack: number;       // Index of the top of the stack. May not be the length of the undoStack array if there have been some undos.
  private undoStack: UndoEntry[];

  // Private Instance Property Functions

  private cellViewFromId(cellId: CellId): CellBase {
    const rval = this.cellViews.get(cellId)!;
    assert(rval);
    return rval;
  }

  private cellViewFromElement($elt: HTMLDivElement): CellBase {
    // Strip 'C' prefix from cell ID to get the style id.
    const cellId: CellId = parseInt($elt.id.slice(1), 10);
    return this.cellViewFromId(cellId);
  }

  private firstCell(): CellBase | undefined {
    const styleOrder = this.screen.notebook.topLevelCellOrder();
    if (styleOrder.length==0) { return undefined; }
    const cellId = styleOrder[0];
    const cellView = this.cellViewFromId(cellId);
    assert(cellView);
    return cellView;
  }

  private lastCell(): CellBase | undefined {
    const $elt = <HTMLDivElement|null>this.$elt.lastElementChild;
    return $elt ? this.cellViewFromElement($elt) : undefined;
  }

  private nextCell(cellView: CellBase): CellBase | undefined {
    const $elt = <HTMLDivElement|null>cellView.$elt.nextElementSibling;
    return $elt ? this.cellViewFromElement($elt) : undefined;
  }

  private previousCell(cellView: CellBase): CellBase | undefined {
    const $elt = <HTMLDivElement|null>cellView.$elt.previousElementSibling;
    return $elt ? this.cellViewFromElement($elt) : undefined;
  }

  private selectedCells(): CellBase[] {
    const rval: CellBase[] = [];
    for (const cellView of this.cellViews.values()) {
      if (cellView.isSelected()) { rval.push(cellView); }
    }
    return rval;
  }

  // private async sendUndoableChangeRequest(changeRequest: NotebookChangeRequest): Promise<NotebookChangeRequest> {
  //   const undoChangeRequests = await this.sendUndoableChangeRequests([changeRequest]);
  //   assert(undoChangeRequests.length==1);
  //   return undoChangeRequests[0];
  // }

  private async sendUndoableChangeRequests(changeRequests: NotebookChangeRequest[]): Promise<NotebookChangeRequest[]> {
    // Disable the undo and redo buttons
    this.screen.sidebar.$redoButton.disabled = true;
    this.screen.sidebar.$undoButton.disabled = true;

    // const { undoChangeRequests } = await this.sendTrackedChangeRequests(changeRequests);

    const results = await this.screen.notebook.sendChangeRequests(changeRequests);

    const undoChangeRequests = results.undoChangeRequests!;
    assert(undoChangeRequests && undoChangeRequests.length>0);
    const entry: UndoEntry = { changeRequests, undoChangeRequests };
    while(this.undoStack.length > this.topOfUndoStack) { this.undoStack.pop(); }
    this.undoStack.push(entry);
    this.topOfUndoStack = this.undoStack.length;

    // Enable the undo button and disable the redo button.
    this.screen.sidebar.$redoButton.disabled = true;
    this.screen.sidebar.$undoButton.disabled = false;

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
