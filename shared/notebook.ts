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

import { CellId, CellIndex, CellObject, CellPosition, CellRelativePosition, CellType } from "./cell";
import { arrayFilterOutInPlace, assert, assertFalse } from "./common";
import { CssLength, cssLengthInPixels, CssSize, LengthInPixels } from "./css";
import { FigureCellObject, renderFigureCell } from "./figure";
import { NotebookPath } from "./folder";
import { FormulaCellObject, FormulaNumber, renderFormulaCell } from "./formula";
import { PlotCellObject, renderPlotCell } from "./plot";
import { NotebookUpdate } from "./server-responses";
import { SvgMarkup } from "./svg";
import { renderTextCell, TextCellObject } from "./text";

// Types

type PageNumber = number;

export interface NotebookObject {
  cells: CellObject[];
  margins: PageMargins;
  pageSize: CssSize;
}

export interface PageInfo {
  numCells: number;
  pageNumber: PageNumber;
  startingCellIndex: CellIndex;
  startingFormulaNumber: FormulaNumber;
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

  public static renderCellToSvg(x: LengthInPixels, y: LengthInPixels, cellObject: CellObject, formulaNumber: FormulaNumber): SvgMarkup {
    let rval: SvgMarkup;
    switch(cellObject.type) {
      case CellType.Figure: rval = renderFigureCell(x, y, <FigureCellObject>cellObject); break;
      case CellType.Formula: rval = renderFormulaCell(x, y, <FormulaCellObject>cellObject, formulaNumber); break;
      case CellType.Plot: rval = renderPlotCell(x, y, <PlotCellObject>cellObject); break;
      case CellType.Text: rval = renderTextCell(x, y, <TextCellObject>cellObject); break;
    }
    return rval;
  }

  // Public Class Event Handlers

  // Public Instance Properties

  public readonly path: NotebookPath;

  // Public Instance Property Functions

  public get margins(): PageMargins { return this.obj.margins; }
  // public get numberOfCells(): number { return this.obj.cells.length; }
  public get pageSize(): CssSize { return this.obj.pageSize; }

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

  public pages(): PageInfo[] {
    if (this.obj.cells.length == 0) { return []; }

    // REVIEW: Implement using a generator?
    const pageHeight = cssLengthInPixels(this.pageSize.height);
    const topMargin = cssLengthInPixels(this.margins.top);
    const bottomMargin = cssLengthInPixels(this.margins.bottom);
    const usableHeight = pageHeight - topMargin - bottomMargin;

    const rval: PageInfo[] = [];
    let pageNumber: PageNumber = 1;
    let formulaNumber: FormulaNumber = 1;
    const numCells = this.obj.cells.length;
    let pageInfo: PageInfo;
    for (let cellIndex = 0; cellIndex < numCells; cellIndex += pageInfo.numCells) {

      // Start a new page.
      pageInfo = {
        numCells: 1,
        pageNumber: pageNumber++,
        startingCellIndex: cellIndex,
        startingFormulaNumber: formulaNumber,
      };

      const firstCellObject = this.obj.cells[cellIndex];
      if (firstCellObject.type == CellType.Formula) { formulaNumber++ };
      let dy = cssLengthInPixels(firstCellObject.cssSize.height);

      // Add cells to the page until it exceeds the cell height.
      while (dy<usableHeight && cellIndex + pageInfo.numCells < numCells) {
        const additionalCellObject = this.obj.cells[cellIndex + pageInfo.numCells];
        dy += cssLengthInPixels(additionalCellObject.cssSize.height);
        if (dy <= usableHeight) {
          // Cell fits, add it to the page.
          pageInfo.numCells++;
          if (additionalCellObject.type == CellType.Formula) { formulaNumber++ };
        }
      }

      rval.push(pageInfo);
    }
    return rval;
  }

  // Public Instance Methods

  public renderPageToSvg(pageInfo: PageInfo): SvgMarkup {
    let rval: SvgMarkup = <SvgMarkup>'';
    let x: LengthInPixels = cssLengthInPixels(this.margins.left);
    let y: LengthInPixels = cssLengthInPixels(this.margins.top);
    let formulaNumber = pageInfo.startingFormulaNumber;
    const endingCellIndex = pageInfo.startingCellIndex + pageInfo.numCells;
    for (let cellIndex=pageInfo.startingCellIndex; cellIndex < endingCellIndex; cellIndex++) {
      const cellObject = this.obj.cells[cellIndex];
      const cellMarkup = Notebook.renderCellToSvg(x, y, cellObject, formulaNumber);
      rval += cellMarkup;
      y += cssLengthInPixels(cellObject.cssSize.height);
      if (cellObject.type == CellType.Formula) { formulaNumber++; }
    }
    return rval;
  }

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

  protected getCellObject<T extends CellObject>(cellId: CellId): T {
    const rval = this.cellObjectMap.get(cellId)!;
    assert(rval);
    return <T>rval;
  }

  // Private Instance Methods

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

  protected /* overridable */ onUpdate(update: NotebookUpdate): void {
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

}

// Helper Functions

