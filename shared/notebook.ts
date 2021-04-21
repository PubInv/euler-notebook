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

// Requirements

import { CellId, CellIndex, CellObject, CellPosition, CellRelativePosition } from "./cell";
import { arrayFilterOutInPlace, assert, assertFalse } from "./common";
import { CssLength, CssSize } from "./css";
import { FigureCellObject } from "./figure";
import { NotebookPath } from "./folder";
import { FormulaCellObject } from "./formula";
import { NotebookUpdate } from "./server-responses";

// Types

// Number of cells on each page.
export type Pagination = number[];

export interface NotebookObject {
  cells: CellObject[];
  margins: PageMargins;
  pageSize: CssSize;
  pagination: Pagination;
}

export interface NotebookWatcher {
  onChange(change: NotebookUpdate, ownRequest: boolean): void;
  onClosed(reason: string): void;
}

export interface PageMargins {
  bottom: CssLength;
  left: CssLength;
  right: CssLength;
  top: CssLength;
}

// Constants

// Exported Class

export class Notebook {

  // Public Class Properties
  // Public Class Property Functions
  // Public Class Methods
  // Public Class Event Handlers

  // Public Instance Properties

  public readonly path: NotebookPath;

  // Public Instance Property Functions

  public afterIdForCell(cellId: CellId): CellRelativePosition {
    const cellIndex = this.cellIndex(cellId);
    let rval: CellRelativePosition;
    if (cellIndex == 0) { rval = CellPosition.Top }
    else if (cellIndex == this.obj.cells.length-1) { rval = CellPosition.Bottom }
    else { rval = this.obj.cells[cellIndex-1].id; }
    return rval;
  }

  public cellIndex(id: CellId): CellIndex {
    const rval = this.obj.cells.findIndex(cell=>cell.id===id);
    assert(rval>=0);
    return rval;
  }

  // REVIEW: Return an iterator?
  public cellObjects(): CellObject[] {
    return this.obj.cells;
  }

  public isEmpty(): boolean {
    return this.obj.cells.length == 0;
  }

  public lastCellId(): CellId {
    // Throws if notebook doesn't have any cells.
    const cells = this.obj.cells;
    assert(cells.length>0);
    return cells[cells.length-1].id;
  }

  public get margins(): PageMargins { return this.obj.margins; };
  public get pageSize(): CssSize { return this.obj.pageSize; };
  public get pagination(): Pagination { return this.obj.pagination; };


  // Public Instance Methods
  // Public Instance Event Handlers

  // --- PRIVATE ---

  // Private Class Properties
  // Private Class Property Functions
  // Private Class Methods
  // Private Class Event Handlers

  // Private Constructor

  protected constructor(path: NotebookPath, obj: NotebookObject) {
    this.path = path;
    this.obj = obj;
    this.cellObjectMap = new Map(this.obj.cells.map(cellObject=>[ cellObject.id, cellObject ]));
  }

  // Private Instance Properties

  protected readonly obj: NotebookObject;
  protected readonly cellObjectMap: Map<CellId, CellObject>;

  // Private Instance Property Functions

  // Private Instance Methods

  protected getCellObject<T extends CellObject>(cellId: CellId): T {
    const rval = this.cellObjectMap.get(cellId)!;
    assert(rval);
    return <T>rval;
  }

  protected /* overridable */ applyUpdate(update: NotebookUpdate): void {
    switch (update.type) {
      case 'cellDeleted': {
        const { cellId } = update;
        this.deleteCellObject(cellId);
        break;
      }
      case 'cellInserted': {
        const { cellObject, afterId } = update;
        this.insertCellObject(cellObject, afterId);
        break;
      }
      case 'cellMoved': {
        const { cellId, afterId } = update;
        const cellObject = this.deleteCellObject(cellId);
        this.insertCellObject(cellObject, afterId);
        break;
      }
      case 'cellResized': {
        const { cellId, cssSize } = update;
        const cellObject = this.getCellObject(cellId);
        cellObject.cssSize.width = cssSize.width;
        cellObject.cssSize.height = cssSize.height;
        break;
      }
      case 'figureTypeset': {
        const { cellId, figure, strokeData } = update;
        const cellObject = this.getCellObject<FigureCellObject>(cellId);
        cellObject.figure = figure;
        cellObject.strokeData = strokeData;
        break;
      }
      case 'formulaTypeset': {
        const { cellId, formula, strokeData } = update;
        const cellObject = this.getCellObject<FormulaCellObject>(cellId);
        cellObject.formula = formula;
        cellObject.strokeData = strokeData;
        break;
      }
      case 'strokeDeleted': {
        const { cellId, strokeId } = update;
        const cellObject = this.getCellObject(cellId);
        const strokes = cellObject.strokeData.strokes;
        const strokeIndex = strokes.findIndex(stroke=>stroke.id==strokeId);
        assert(strokeIndex>=0);
        strokes.splice(strokeIndex, 1);
        break;
      }
      case 'strokeInserted': {
        const { cellId, stroke } = update;
        const cellObject = this.getCellObject(cellId);
        cellObject.strokeData.strokes.push(stroke);
        break;
      }
      case 'suggestionAdded': {
        const { cellId, suggestionObject } = update;
        const cellObject = this.getCellObject(cellId);
        cellObject.suggestions.push(suggestionObject);
        break;
      }
      case 'suggestionRemoved': {
        const { cellId, suggestionId } = update;
        const cellObject = this.getCellObject(cellId);
        const removed = arrayFilterOutInPlace(cellObject.suggestions, s=>s.id==suggestionId);
        if (removed.length == 0) {
          // TODO: Logging that works in both browser and server.
          console.warn(`WARNING: No suggestions with ID '${suggestionId}' to remove.`);
        } else if (removed.length>1) {
          console.warn(`WARNING: Multiple (${removed.length}) suggestions with same ID '${suggestionId}' removed.`);
        }
        break;
      }
      case 'textTypeset': {
        const { cellId, text, strokeData } = update;
        const cellObject = this.getCellObject(cellId);
        cellObject.inputText = text;
        cellObject.strokeData = strokeData;
        break;
      }
      default: assertFalse();
    }
  }

  private deleteCellObject(cellId: CellId): CellObject {
    const cellIndex = this.cellIndex(cellId);
    const cellObject = this.obj.cells[cellIndex];
    this.obj.cells.splice(cellIndex, 1);
    this.cellObjectMap.delete(cellId);
    return cellObject;
}

  private insertCellObject(cellObject: CellObject, afterId: CellRelativePosition): void {
    if (afterId == CellPosition.Top) {
      this.obj.cells.unshift(cellObject);
    } else if (afterId == CellPosition.Bottom) {
      this.obj.cells.push(cellObject);
    } else {
      const cellIndex = this.cellIndex(afterId);
      this.obj.cells.splice(cellIndex+1, 0, cellObject);
    }
    this.cellObjectMap.set(cellObject.id, cellObject);
  }

  // Private Instance Event Handlers

}

// Helper Functions

