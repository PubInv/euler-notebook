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

import { CellSource, CellId, CellObject, CellRelativePosition, CellOrdinalPosition, CellMap, CellPosition, InputType, StylusCellObject } from "./cell";
import { CssLength, CssSize, Html, assert, deepCopy, escapeHtml, ExpectedError, assertFalse, notImplemented } from "./common";
import { cellSynopsis } from "./debug-synopsis";
import { NOTEBOOK_NAME_RE, NotebookName, NotebookPath } from "./folder";
import { Stroke, StrokeId } from "./stylus";
import { WatchedResource, Watcher } from "./watched-resource";

// Types

export interface FindCellOptions {
  source?: CellSource;
  notSource?: CellSource;
}

export type NotebookChange = CellDeleted | CellInserted | CellMoved | StrokeInserted | StrokeDeleted;
export interface CellDeleted {
  type: 'cellDeleted';
  cellId: CellId;
}
export interface CellInserted {
  type: 'cellInserted';
  cellObject: CellObject;
  afterId?: CellRelativePosition;
}
export interface CellMoved {
  type: 'cellMoved';
  cellId: CellId;
  afterId: CellRelativePosition;
  oldPosition: CellOrdinalPosition;
  newPosition: CellOrdinalPosition;
}
export interface StrokeDeleted {
  type: 'strokeDeleted';
  cellId: CellId;
  strokeId: StrokeId;
}
export interface StrokeInserted {
  type: 'strokeInserted';
  cellId: CellId;
  strokeId: StrokeId;
  stroke: Stroke;
}

export interface NotebookObject {
  nextId: CellId;
  pageConfig: PageConfig;
  pages: Page[];
  cellMap: CellMap;
  version: string;
}

export interface NotebookWatcher extends Watcher {
  onChange(change: NotebookChange, ownRequest: boolean): void;
}

interface Page {
  cellIds: CellId[];
}

interface PageConfig {
  size: CssSize;
  margins: PageMargins;
}

interface PageMargins {
  bottom: CssLength;
  left: CssLength;
  right: CssLength;
  top: CssLength;
}

// Constants

const DEFAULT_PAGE_CONFIG: PageConfig = {
  // REVIEW: Standardize on "pt" as the unit of measurement rather than mixing inches and points?
  size: { width: <CssLength>'8.5in', height: <CssLength>'11in' },
  margins: {
    top: <CssLength>'72pt', /* 72pt = 1 in */
    right: <CssLength>'72pt',
    bottom: <CssLength>'72pt',
    left: <CssLength>'72pt',
  }
}

export const VERSION = "0.0.17";

// Exported Class

export abstract class Notebook<W extends NotebookWatcher> extends WatchedResource<NotebookPath, W> {

  // Public Class Property Functions

  public static isValidNotebookName(name: NotebookName): boolean {
    return NOTEBOOK_NAME_RE.test(name);
  }

  // Public Class Methods

  public static validateObject(obj: NotebookObject): void {
    // Throws an exception with a descriptive message if the object is not a valid notebook object.
    // LATER: More thorough validation of the object.
    if (!obj.nextId) { throw new Error("Invalid notebook object JSON."); }
    if (obj.version != VERSION) {
      throw new ExpectedError(`Invalid notebook version ${obj.version}. Expect version ${VERSION}`);
    }
  }

  // Public Instance Properties

  public nextId: CellId;
  public pageConfig: PageConfig;
  public pages: Page[];

  // Public Instance Property Functions

  public allCells(): CellObject[] {
    // REVIEW: Return an iterator?
    const sortedIds: CellId[] = Object.keys(this.cellMap).map(k=>parseInt(k,10)).sort();
    return sortedIds.map(id=>this.getCell(id));
  }

  public compareCellPositions(id1: CellId, id2: CellId): number {
    // Returns a negative number if style1 is before style2,
    // zero if they are the same styles,
    // or a positive number if style1 is after style2.
    const p1 = this.pages[0].cellIds.indexOf(id1);
    const p2 = this.pages[0].cellIds.indexOf(id2);
    assert(p1>=0 && p2>=0);
    return p1 - p2;
  }

  public followingCellId(id: CellId): CellId {
    // Returns the id of the style immediately after the top-level style specified.
    const i = this.pages[0].cellIds.indexOf(id);
    assert(i>=0);
    if (i+1>=this.pages[0].cellIds.length) { return 0; }
    return this.pages[0].cellIds[i+1];
  }

  public getCell<T extends CellObject>(id: CellId): T {
    const rval = <T>this.cellMap[id];
    assert(rval, `Style ${id} doesn't exist.`);
    return rval;
  }

  public getCellThatMayNotExist(id: CellId): CellObject|undefined {
    // TODO: Eliminate. Change usages to .findStyle.
    return this.cellMap[id];
  }

  public isEmpty(): boolean {
    // Returns true iff the notebook does not have any contents.
    return this.pages[0].cellIds.length == 0;
  }

  public precedingCellId(id: CellId): CellId {
    // Returns the id of the style immediately before the top-level style specified.
    const i = this.pages[0].cellIds.indexOf(id);
    assert(i>=0);
    if (i<1) { return 0; }
    return this.pages[0].cellIds[i-1];
  }

  public toHtml(): Html {
    if (this.isEmpty()) { return <Html>"<i>Notebook is empty.</i>"; }
    else {
      return <Html>this.topLevelCellOrder()
      .map(cellId=>{
        const cellObject = this.getCell(cellId);
        return this.cellToHtml(cellObject);
      })
      .join('');
    }
  }

  public topLevelCellOrder(): CellId[] {
    // REVIEW: Return IterableIterator<CellId>?
    return this.pages.reduce((acc: CellId[], page: Page)=>acc.concat(page.cellIds), []);
  }

  public topLevelCells(): CellObject[] {
    // REVIEW: This is just allCells now.
    // REVIEW: Return IterableIterator<StyleObjectd>?
    return this.pages[0].cellIds.map(cellId=>this.getCell(cellId));
  }

  public cellPosition(id: CellId): CellOrdinalPosition {
    return this.pages[0].cellIds.indexOf(id);
  }

  // Public Instance Methods

  public applyChange(change: NotebookChange, ownRequest: boolean): void {
    assert(change);
    for (const watcher of this.watchers) { watcher.onChange(change, ownRequest); }
    switch(change.type) {
      case 'cellDeleted': this.deleteCell(change); break;
      case 'cellInserted': this.insertCell(change); break;
      case 'cellMoved': this.moveCell(change); break;
      case 'strokeInserted': this.insertStroke(change); break;
      case 'strokeDeleted': this.deleteStroke(change); break;
      default: assertFalse();
    }
  }

  public applyChanges(changes: NotebookChange[], ownRequest: boolean): void {
    for (const change of changes) { this.applyChange(change, ownRequest); }
  }

  public findCell(options: FindCellOptions): CellObject|undefined {
    // REVIEW: If we don't need to throw on multiple matches, then we can terminate the search
    //         after we find the first match.
    // Like findStyles but expects to find zero or one matching style.
    // If it finds more than one matching style then it returns the first and outputs a warning.
    const styles = this.findCells(options);
    if (styles.length > 0) {
      if (styles.length > 1) {
        // TODO: On the server, this should use the logging system rather than console output.
        console.warn(`More than one style found for ${JSON.stringify(options)}`);
      }
      return styles[0];
    } else {
      return undefined;
    }
  }

  public findCells(
    options: FindCellOptions,
    rval: CellObject[] = []
  ): CellObject[] {
    // Option to throw if style not found.
    const cellObjects = this.topLevelCells();
    // REVIEW: Use filter with predicate instead of explicit loop.
    for (const cellObject of cellObjects) {
      if (cellMatchesPattern(cellObject, options)) { rval.push(cellObject); }
    }
    return rval;
  }

  public hasCellId(cellId: CellId): boolean {
    return this.cellMap.hasOwnProperty(cellId);
  }

  public hasCell(
    options: FindCellOptions,
  ): boolean {
    // Returns true iff findStyles with the same parameters would return a non-empty list.
    // OPTIMIZATION: Return true when we find the first matching style.
    // NOTE: We don't use 'findStyle' because that throws on multiple matches.
    const styles = this.findCells(options);
    return styles.length>0;
  }

  // --- PRIVATE ---

  // Private Class Properties

  // Private Class Methods

  // Private Constructor

  protected constructor(path: NotebookPath) {
    super(path);
    this.nextId = 1;
    this.pages = [{ cellIds: []}];
    this.pageConfig = deepCopy(DEFAULT_PAGE_CONFIG),
    this.cellMap = {};
  }

  // Private Instance Properties

  protected cellMap: CellMap;     // Mapping from style ids to style objects.

  // Private Instance Property Functions

  private cellToHtml(cell: CellObject): Html {
    // TODO: This is very inefficient as notebook.childStylesOf goes through *all* styles.
    return <Html>`<div>
<span class="collapsed">S${cell.id} ${cell.type} ${cell.source}</span>
<div class="nested" style="display:none">
  <tt>${escapeHtml(cellSynopsis(cell))}</tt>
</div>
</div>`;
  }

  // Private Instance Methods

  protected initializeFromObject(obj: NotebookObject): void {
    this.nextId = obj.nextId;
    this.pageConfig = obj.pageConfig;
    this.pages = obj.pages;
    this.cellMap = obj.cellMap;
  }

  // Change Application Methods.
  // DO NOT CALL DIRECTLY!

  private deleteCell(change: CellDeleted): void {
    const cellId = change.cellId;
    assert(this.cellMap[cellId]);
    // If this is a top-level style then remove it from the top-level style order first.
    const i = this.pages[0].cellIds.indexOf(cellId);
    assert(i>=0);
    this.pages[0].cellIds.splice(i,1);
    delete this.cellMap[cellId];
  }

  private deleteStroke(_change: StrokeDeleted): void {
    notImplemented();
  }

  private insertCell(change: CellInserted): void {
    const cellObject = change.cellObject;
    const afterId = change.afterId;
    this.cellMap[cellObject.id] = cellObject;
    // Insert top-level styles in the style order.
    if (!afterId || afterId===CellPosition.Top) {
      this.pages[0].cellIds.unshift(cellObject.id);
    } else if (afterId===CellPosition.Bottom) {
      this.pages[0].cellIds.push(cellObject.id);
    } else {
      const i = this.pages[0].cellIds.indexOf(afterId);
      if (i<0) { throw new Error(`Cannot insert thought after unknown thought ${afterId}`); }
      this.pages[0].cellIds.splice(i+1, 0, cellObject.id);
    }
  }

  private insertStroke(change: StrokeInserted): void {
    const cellObject = this.getCell<StylusCellObject>(change.cellId);
    assert(cellObject.inputType == InputType.Stylus);
    cellObject.stylusInput.strokeGroups[0].strokes.push(change.stroke);
    notImplemented();
  }

  private moveCell(change: CellMoved): void {
    this.pages[0].cellIds.splice(change.oldPosition, 1);
    this.pages[0].cellIds.splice(change.newPosition, 0, change.cellId);
  }

}

// Helper Classes

// Helper Functions

export function cellInsertedFromNotebookChange(change: NotebookChange): CellInserted {
  // TODO: Rename this function so it doesn't start with a capital letter.
  if (change.type != 'cellInserted') { throw new Error("Not StyleInserted change."); }
  return change;
}

export function cellMatchesPattern(cell: CellObject, options: FindCellOptions): boolean {
  return    (!options.source || cell.source == options.source)
         && (!options.notSource || cell.source != options.notSource);
}
