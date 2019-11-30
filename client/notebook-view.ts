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

import { CellView } from './cell-view/index.js';
import { createCellView } from './cell-view/instantiator.js';
import { assert } from './common.js';
import { $, configure } from './dom.js';
import {
  DrawingData, StyleId, StyleObject, NotebookChange,
  StyleType, /* StyleInserted, */ StyleInsertedFromNotebookChange, StyleRelativePosition,
  StylePosition, DOCUMENT, PageId,
} from './notebook.js';
import {
  StyleChangeRequest, StyleDeleteRequest,
  StyleInsertRequest, StylePropertiesWithSubprops, StyleMoveRequest,
} from './math-tablet-api.js';
import { OpenNotebook } from './open-notebook.js';
import { Sidebar } from './sidebar.js';

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

  public openNotebook!: OpenNotebook;

  // Instance Property Functions

  public topLevelCellOf(style: StyleObject): CellView {
    for (; style.parentId; style = this.openNotebook.getStyleById(style.parentId));
    const cell = this.cellViews.get(style.id);
    assert(cell);
    return cell!;
  }

  // Instance Methods

  public connect(openNotebook: OpenNotebook, sidebar: Sidebar): void {
    this.openNotebook = openNotebook;
    this.sidebar = sidebar;

    for (const styleId of this.openNotebook.topLevelStyleOrder()) {
      const style = this.openNotebook.getStyleById(styleId);
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

  public deleteSelectedCells(): void {
    const cellViews = this.selectedCells();
    this.unselectAll();
    const changeRequests = cellViews.map<StyleDeleteRequest>(c=>({ type: 'deleteStyle', styleId: c.styleId }));
    this.openNotebook.sendChangeRequests(changeRequests);
  }

  public editSelectedCell(): void {
    if (!this.lastCellSelected) {
      // Nothing selected to move.
      // REVIEW: Beep or something?
      return;
    }
    this.lastCellSelected.editMode();
  }

  public insertDrawingCellBelow(): void {
    // If cells are selected then in insert a keyboard input cell below the last cell selected.
    // Otherwise, insert at the end of the notebook.
    let afterId: StyleRelativePosition;
    if (this.lastCellSelected) { afterId = this.lastCellSelected.styleId; }
    else { afterId = StylePosition.Bottom; }

    const data: DrawingData = {
      size: { height: '1in', width: '6.5in' },
      strokes: [],
    };
    const styleProps: StylePropertiesWithSubprops = { type: 'DRAWING', meaning: 'INPUT', data };
    this.insertStyle(styleProps, afterId);
  }

  public insertKeyboardCellAbove(): void {
    // If cells are selected then in insert a keyboard input cell
    // above the last cell selected.
    // Otherwise, insert at the beginning of the notebook.
    let afterId: StyleRelativePosition;
    if (this.lastCellSelected) {
      const previousCell = this.previousCell(this.lastCellSelected);
      afterId = previousCell ? previousCell.styleId : StylePosition.Top;
    } else { afterId = StylePosition.Top; }
    this.insertKeyboardCellAndEdit(afterId);
  }

  public insertKeyboardCellBelow(): void {
    // If cells are selected then in insert a keyboard input cell below the last cell selected.
    // Otherwise, insert at the end of the notebook.
    let afterId: StyleRelativePosition;
    if (this.lastCellSelected) { afterId = this.lastCellSelected.styleId; }
    else { afterId = StylePosition.Bottom; }
    this.insertKeyboardCellAndEdit(afterId);
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
    const styleId = this.lastCellSelected.styleId;

    const nextCell = this.nextCell(this.lastCellSelected);
    if (!nextCell) {
      // Selected cell is already the last cell. Nowhere down to go.
      return;
    }
    const nextNextCell = this.nextCell(nextCell);
    const afterId = nextNextCell ? nextCell.styleId : StylePosition.Bottom;

    const request: StyleMoveRequest = { type: 'moveStyle', styleId, afterId };
    this.openNotebook.sendChangeRequest(request);
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
    const styleId = this.lastCellSelected.styleId;

    const previousCell = this.previousCell(this.lastCellSelected);
    if (!previousCell) {
      // Selected cell is already the first cell. Nowhere up to go.
      return;
    }
    const previousPreviousCell = this.previousCell(previousCell);
    const afterId = previousPreviousCell ? previousPreviousCell.styleId : /* top */ 0;

    const request: StyleMoveRequest = { type: 'moveStyle', styleId, afterId };
    this.openNotebook.sendChangeRequest(request);
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
    if (!noEmit) {
      this.sidebar.enableTrashButton(false);
    }
  }

  // Instance Methods

  public changeStyle(styleId: StyleId, data: any): void {
    const changeRequest: StyleChangeRequest = { type: 'changeStyle', styleId, data };
    this.openNotebook.sendChangeRequest(changeRequest);
  }

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

  public insertKeyboardCellAndEdit(afterId: StyleRelativePosition): void {
    // Shared implementation of 'insertKeyboardCellAbove' and 'insertKeyboardCellBelow'
    // Inserts a cell into the notebook, and opens it for editing.

    // REVIEW: We shouldn't be assuming a specific HTML control on the page.
    const $typeSelector = $<HTMLSelectElement>(document, '#keyboardInputType');

    const styleProps: StylePropertiesWithSubprops = {
      type: <StyleType>$typeSelector.value,
      meaning: 'INPUT',
      data: "",
    };

    // Insert top-level style and wait for it to be inserted.
    this.insertStyleTracked(styleProps, afterId)
    .then(styleId=>{
      const cellView = this.cellViewFromStyleId(styleId);
      cellView.scrollIntoView();
      this.selectCell(cellView);
      cellView.editMode();
    })
    .catch(err=>{
      console.error(`Error inserting keyboard style: ${err.message}\n${err.stack}`);
    });
  }

  public insertStyle(styleProps: StylePropertiesWithSubprops, afterId: StyleRelativePosition = StylePosition.Bottom): void {
    const changeRequest: StyleInsertRequest = { type: 'insertStyle', afterId, styleProps };
    this.openNotebook.sendChangeRequest(changeRequest);
  }

  public async insertStyleTracked(styleProps: StylePropertiesWithSubprops, afterId: StyleRelativePosition = StylePosition.Bottom): Promise<StyleId> {
    const changeRequest: StyleInsertRequest = { type: 'insertStyle', afterId, styleProps };
    const changes = await this.openNotebook.sendTrackedChangeRequest(changeRequest);

    // The style we inserted will be the first change that comes back.
    assert(changes.length>0);
    const change = StyleInsertedFromNotebookChange(changes[0]);
    const style = change.style;
    return style.id;
  }

  public selectCell(
    cellView: CellView,
    rangeExtending?: boolean, // Extending selection by a contiguous range.
    indivExtending?: boolean, // Extending selection by an individual cell, possibly non-contiguous.
  ): void {
    if (!rangeExtending && !indivExtending) { this.unselectAll(true); }
    cellView.select();
    this.lastCellSelected = cellView;
    this.sidebar.enableTrashButton(true);
  }

  // Called by openNotebook when changes come in from the server.
  // Called *after* the changes have been made to the notebook,
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
      case 'styleDeleted': {
        // If a substyle is deleted then mark the cell as dirty.
        // If a top-level style is deleted then remove the cell.
        const style = this.openNotebook.getStyleById(change.style.id);
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
          this.dirtyCells.add(this.openNotebook.topLevelStyleOf(change.style.id).id);
        }
        break;
      }
      case 'styleMoved': {
        const style = this.openNotebook.getStyleById(change.styleId);
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
      const style = this.openNotebook.getStyleById(styleId);
      const cell = this.cellViewFromStyleId(styleId);
      if (!cell) { throw new Error(`Can't find dirty Change style message for style without top-level element`); }
      cell.render(style);
    }
    this.dirtyCells.clear();
  }

  public useTool(id: StyleId): void { this.openNotebook.useTool(id); }

  // -- PRIVATE --

  // Constructor

  private constructor($elt: HTMLDivElement) {
    this.$elt = $elt;
    configure($elt, { listeners: {
      blur: e=>this.onBlur(e),
      focus: e=>this.onFocus(e),
      keyup: e=>this.onKeyUp(e),
    }});

    this.cellViews = new Map();
    this.dirtyCells = new Set();
  }

  // Private Instance Properties

  private $elt: HTMLElement;
  private cellViews: Map<StyleId, CellView>;
  private dirtyCells: Set<StyleId>;             // Style ids of top-level styles that need to be redrawn.
  private lastCellSelected?: CellView;
  private sidebar!: Sidebar;

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

  // Private Notebook Change Handlers

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
      commandFn.call(this);
    } else {
      if (IGNORED_KEYUPS.indexOf(keyName)<0) {
        console.log(`NotebookView unrecognized keyup : ${keyCombo}`);
      }
      // No command bound to that key.
      // REVIEW: Beep or something?
    }
  }

}
