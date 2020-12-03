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

// REVIEW: Where should we be checking if this.terminated is set?

// Requirements

import * as debug1 from "debug";
const debug = debug1('client:client-notebook');

import { CellId, CellObject, CellOrdinalPosition, CellPosition, CellRelativePosition, CellType } from "./shared/cell";
import { assert, assertFalse, CssSize, Html, notImplemented } from "./shared/common";
import { notebookUpdateSynopsis } from "./shared/debug-synopsis";
import { NotebookName, NotebookNameFromNotebookPath, NotebookPath } from "./shared/folder";
import { FORMAT_VERSION, NotebookObject, PageMargins, Pagination } from "./shared/notebook";
import { NotebookChangeRequest, ChangeNotebook, UseTool, OpenNotebook, DeleteCell, ResizeCell, InsertStroke, InsertCell, MoveCell } from "./shared/client-requests";
import {
  NotebookUpdated, NotebookOpened, NotebookResponse, NotebookClosed, NotebookUpdate, CellInserted, CellDeleted, CellMoved
} from "./shared/server-responses";

import { createCell } from "./client-cell/instantiator";

import { appInstance } from "./app";
import { ClientCell } from "./client-cell";
import { Stroke } from "./shared/myscript-types";

// Types

export interface NotebookView {
  onUpdate(update: NotebookUpdate, ownRequest: boolean): void;
  onClosed(reason: string): void;
}

export interface ChangeRequestResults {
  changes: NotebookUpdate[];
  undoChangeRequests?: NotebookChangeRequest[];
}

interface OpenInfo {
  promise: Promise<ClientNotebook>;
  tally: number;
  views: Set<NotebookView>;
}

// interface UndoEntry {
//   changeRequests: NotebookChangeRequest[];
//   undoChangeRequests: NotebookChangeRequest[];
// }

// Constants

// Global Variables

// Exported Class

export class ClientNotebook {

  // Public Class Methods

  public static async open(path: NotebookPath, watcher: NotebookView): Promise<ClientNotebook> {
    // REVIEW: If open promise rejects, then we should purge it from
    //         the openMap so the open can be attempted again.
    //         Otherwise, all subsequent attempts at opening will fail
    //         on the same rejected promise.
    let openInfo = this.openMap.get(path);
    if (openInfo) {
      openInfo.tally++;
      openInfo.views.add(watcher);
    } else {
      openInfo = { promise: this.openNew(path), tally: 1, views: new Set([ watcher ]) };
      this.openMap.set(path, openInfo);
    }
    return openInfo.promise;
  }

  // Public Class Event Handlers

  public static onServerResponse(msg: NotebookResponse, ownRequest: boolean): void {
    // Opened response is handled when request promise is resolved.
    if (msg.operation == 'opened') { return; }
    const instance = this.instanceMap.get(msg.path)!;
    assert(instance);
    instance.onServerResponse(msg, ownRequest);
  }

  // Public Instance Properties

  public cells: ClientCell<any>[]; // REVIEW: Make function property that returns iterator?
  public readonly margins: PageMargins;
  public readonly path: NotebookPath;
  public readonly pageSize: CssSize;
  public readonly pagination: Pagination;

  // Public Instance Property Functions

  public getCell<O extends CellObject>(id: CellId): ClientCell<O> {
    const cell = <ClientCell<O>>this.cellMap.get(id);
    assert(cell);
    return cell;
  }

  public get notebookName(): NotebookName {
    // REVIEW: Rename to just "name"?
    return NotebookNameFromNotebookPath(this.path);
  }

  public toDebugHtml(): Html {
    return <Html>this.cells.map(cell=>{
      return cell.toDebugHtml();
    }).join('\n');
}

  // Public Instance Methods

  public close(watcher: NotebookView): void {
    assert(!this.terminated);
    const openInfo = ClientNotebook.openMap.get(this.path)!;
    assert(openInfo);
    const had = openInfo.views.delete(watcher);
    assert(had);
    if (openInfo.views.size == 0) {
      // LATER: Set timer to destroy in the future.
      this.terminate("Closed by client");
    }
  }

  public async deleteCell(cellId: CellId): Promise<void> {
    // TODO: Make this undoable.
    const changeRequest: DeleteCell = { type: 'deleteCell', cellId };
    await this.sendChangeRequest(changeRequest);
  }

  public export(): void {
    // NOTE: Notebook path starts with a slash.
    const url = `/export${this.path}`;
    // window.location.href = url;
    window.open(url, "_blank")
  }

  public async insertCell(cellType: CellType, afterId: CellRelativePosition): Promise<void> {
    const changeRequest: InsertCell = { type: 'insertCell', cellType, afterId };
    /* const undoChangeRequest = */await this.sendChangeRequest(changeRequest);
    // const cellId = (<DeleteCellRequest>undoChangeRequest).cellId;
  }

  public async insertStrokeIntoCell(cellId: CellId, stroke: Stroke): Promise<void> {
    // TODO: Undoable
    const changeRequest: InsertStroke = { type: 'insertStroke', cellId, stroke };
    await this.sendChangeRequest(changeRequest)
  }

  public async moveCell(cellId: CellId, targetCellId: CellId): Promise<void> {
    // The cell has been dragged onto the target cell.
    // If the cell was dragged down, then put the cell after the target.
    // If the cell was dragged up, then put the cell before the target.
    assert(cellId != targetCellId);
    const cellIndex = this.cellIndex(cellId);
    const targetIndex = this.cellIndex(targetCellId);
    // If dragging down, then put dragged cell below the cell that was dropped on.
    // If dragging up, then put dragged cell above the cell that was dropped on.
    let afterId: CellRelativePosition;
    if (cellIndex<targetIndex) { afterId = targetCellId; }
    else {
      if (targetIndex>0) { afterId = this.cells[targetIndex-1].id; }
      else { afterId = CellPosition.Top; }
    }
    const changeRequest: MoveCell = {
      type: 'moveCell',
      cellId: cellId,
      afterId,
    }
    /* const undoChangeRequest = */await this.sendChangeRequest(changeRequest);
  }

  public async redo(): Promise<boolean> {
    // Returns true if there are more redos available.
    notImplemented();
    // // Resubmit the change requests.
    // assert(this.topOfUndoStack < this.undoStack.length);
    // const entry = this.undoStack[this.topOfUndoStack++];
    // await this.sendUndoableChangeRequests(entry.changeRequests);

    // return this.topOfUndoStack < this.undoStack.length;
  }

  public async resizeCell(cellId: CellId, cssSize: CssSize): Promise<void> {
    // TODO: Make this undoable.
    const changeRequest: ResizeCell = { type: 'resizeCell', cellId, cssSize };
    await this.sendChangeRequest(changeRequest);
  }

  public async undo(): Promise<boolean> {
    // Returns true if there are more undos available.
    notImplemented();
    // // Undo the changes by making a set of counteracting changes.
    // assert(this.topOfUndoStack > 0);
    // const entry = this.undoStack[--this.topOfUndoStack];
    // await this.notebook.sendChangeRequests(entry.undoChangeRequests);
    // return this.topOfUndoStack > 0
  }

  public useTool(id: CellId): void {
    const msg: UseTool = { type: 'notebook', operation: 'useTool', path: this.path, cellId: id };
    appInstance.socket.sendMessage(msg);
  }

  // -- PRIVATE --

  // Private Class Properties

  protected static openMap: Map<NotebookPath, OpenInfo> = new Map();
  protected static instanceMap: Map<NotebookPath, ClientNotebook> = new Map();

  // Private Class Methods

  protected static getInstance(path: NotebookPath): ClientNotebook {
    const instance = this.instanceMap.get(path)!;
    assert(instance);
    return instance;
  }

  private static async openNew(path: NotebookPath): Promise<ClientNotebook> {
    const message: OpenNotebook = { type: 'notebook', operation: 'open', path };
    const responseMessages = await appInstance.socket.sendRequest<NotebookOpened>(message);
    const instance = new this(path, responseMessages[0].obj);
    this.instanceMap.set(path, instance);
    return instance;
  }

  // Private Class Event Handlers

  // Private Constructor

  private constructor(path: NotebookPath, notebookObject: NotebookObject) {
    assert(notebookObject.formatVersion == FORMAT_VERSION);
    this.path = path;
    this.cellMap = new Map();
    this.cells = [];
    this.margins = notebookObject.margins; // REVIEW: Deep copy?
    this.pageSize = notebookObject.pageSize; // REVIEW: Deep copy?
    this.pagination = notebookObject.pagination;
    this.terminated = false;

    // this.topOfUndoStack = 0;
    // this.undoStack = [];

    for (let cellIndex=0; cellIndex<notebookObject.cells.length; cellIndex++) {
      const cellObject = notebookObject.cells[cellIndex];
      const cellUpdate: CellInserted = { type: 'cellInserted', cellObject, cellIndex }
      this.onCellInserted(cellUpdate);
    }
  }

  // Private Instance Properties

  private cellMap: Map<CellId, ClientCell<any>>;
  private terminated: boolean;  // TODO: Where to assert(!this.terminated)?

  // private topOfUndoStack: number;       // Index of the top of the stack. May not be the length of the undoStack array if there have been some undos.
  // private undoStack: UndoEntry[];

  // Private Instance Property Functions

  private cellIndex(id: CellId): CellOrdinalPosition {
    const rval = this.cells.findIndex(cell=>cell.id===id);
    assert(rval>=0);
    return rval;
  }

  private get views(): Set<NotebookView> {
    const openInfo = ClientNotebook.openMap.get(this.path)!;
    assert(openInfo);
    return openInfo.views;
  }

  // Private Instance Methods

  private async sendChangeRequest(changeRequest: NotebookChangeRequest): Promise<ChangeRequestResults> {
    return this.sendChangeRequests([ changeRequest ]);
  }

  private async sendChangeRequests(changeRequests: NotebookChangeRequest[]): Promise<ChangeRequestResults> {
    assert(!this.terminated);
    assert(changeRequests.length>0);
    const msg: ChangeNotebook = {
      type: 'notebook',
      operation: 'change',
      path: this.path,
      changeRequests,
    }
    const responseMessages = await appInstance.socket.sendRequest<NotebookUpdated>(msg);
    assert(responseMessages.length>=1);
    if (responseMessages.length == 1) {
      const responseMessage = responseMessages[0];
      return { changes: responseMessage.updates, undoChangeRequests: responseMessage.undoChangeRequests };
    } else {
      const rval: ChangeRequestResults = {
        changes: [],
        undoChangeRequests: [],
      };
      for (const responseMessage of responseMessages) {
        rval.changes.push(...responseMessage.updates);
        if (responseMessage.undoChangeRequests) {
          rval.undoChangeRequests!.push(...responseMessage.undoChangeRequests);
        }
      }
      return rval;
    }
  }

  // private async sendUndoableChangeRequests(changeRequests: NotebookChangeRequest[]): Promise<NotebookChangeRequest[]> {
  //   // const { undoChangeRequests } = await this.sendTrackedChangeRequests(changeRequests);
  //   const results = await this.sendChangeRequests(changeRequests);
  //   const undoChangeRequests = results.undoChangeRequests!;
  //   assert(undoChangeRequests && undoChangeRequests.length>0);
  //   const entry: UndoEntry = { changeRequests, undoChangeRequests };
  //   while(this.undoStack.length > this.topOfUndoStack) { this.undoStack.pop(); }
  //   this.undoStack.push(entry);
  //   this.topOfUndoStack = this.undoStack.length;
  //   return undoChangeRequests;
  // }

  protected terminate(reason: string): void {
    assert(!this.terminated);
    this.terminated = true;
    ClientNotebook.instanceMap.delete(this.path);
    ClientNotebook.openMap.delete(this.path);
    for (const view of this.views) { view.onClosed(reason); }
  }

  // Private Event Handlers

  private onServerResponse(msg: NotebookResponse, ownRequest: boolean): void {
    // A notebook message was received from the server.
    switch(msg.operation) {
      case 'updated': this.onUpdated(msg, ownRequest); break;
      case 'closed':  this.onClosed(msg, ownRequest); break;
      case 'opened':
      default: assertFalse();
    }
  }

  private onClosed(msg: NotebookClosed, _ownRequest: boolean): void {
    // Message from the server that the notebook has been closed by the server.
    // For example, if the notebook was deleted or moved.
    this.terminate(msg.reason);
  }

  private onCellDeleted(update: CellDeleted): void {
    const { cellId } = update;
    this.cellMap.delete(cellId);
    const cellIndex = this.cellIndex(cellId);
    this.cells.splice(cellIndex, 1);
  }

  private onCellInserted(update: CellInserted): void {
    const { cellObject, cellIndex } = update;
    const cell = createCell(this, cellObject);
    this.cells.splice(cellIndex, 0, cell);
    this.cellMap.set(cell.id, cell);
  }

  private onCellMoved(update: CellMoved): void {
    const { cellId, newIndex } = update;

    // Remove cell from its existing position.
    const cellIndex = this.cellIndex(cellId);
    const cell = this.cells.splice(cellIndex, 1)[0];

    // Insert cell into its new position.
    this.cells.splice(newIndex, 0, cell);
  }


  private onUpdated(msg: NotebookUpdated, ownRequest: boolean): void {
    // Message from the server indicating this notebook has changed.
    for (const update of msg.updates) {
      this.onUpdate(update, ownRequest);
    }
  }

  private onUpdate(update: NotebookUpdate, ownRequest: boolean): void {
    debug(`onUpdate ${notebookUpdateSynopsis(update)}`);

    // Process an individual notebook change from the server.

    // Update our data structure
    switch (update.type) {

      case 'cellDeleted': { this.onCellDeleted(update); break; }
      case 'cellInserted': this.onCellInserted(update); break;
      case 'cellMoved': { this.onCellMoved(update); break; }

      case 'cellResized':
      case 'strokeDeleted':
      case 'strokeInserted': {
        const cell = this.getCell(update.cellId);
        cell.onUpdate(update, ownRequest);
        break;
      }
      default: assertFalse();
    }

    // Notify notebook views of the update.
    for (const views of this.views) {
      views.onUpdate(update, ownRequest);
    }
  }
}
