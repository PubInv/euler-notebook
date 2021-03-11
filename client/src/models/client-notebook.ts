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

// REVIEW: Where should we be checking if this.terminated is set?

// Requirements

import * as debug1 from "debug";
const debug = debug1('client:client-notebook');

import { CellId, CellObject, CellIndex, CellPosition, CellRelativePosition, CellType, PageIndex } from "../shared/cell";
import { assert, assertFalse, ClientId, CssSize, Html } from "../shared/common";
import { notebookUpdateSynopsis } from "../shared/debug-synopsis";
import { Folder, NotebookName, NotebookPath } from "../shared/folder";
import { PageMargins, Pagination } from "../shared/notebook";
import { NotebookChangeRequest, ChangeNotebook, OpenNotebook, DeleteCell, ResizeCell, InsertStroke, InsertEmptyCell, MoveCell, DeleteStroke, TypesetFormula, RecognizeFormula } from "../shared/client-requests";
import {
  NotebookUpdated, NotebookOpened, NotebookResponse, NotebookClosed, NotebookUpdate, CellInserted, CellDeleted, CellMoved, NotebookCollaboratorConnected, NotebookCollaboratorDisconnected, FormulaRecognized
} from "../shared/server-responses";
import { Stroke, StrokeId } from "../shared/stylus";
import { CollaboratorObject } from "../shared/user";

import { appInstance } from "../app";

import { ClientCell } from "./client-cell";
import { createCell } from "./client-cell/instantiator";
import { logWarning } from "../error-handler";
import { ClientPage } from "./client-page";
import { FormulaRecognitionAlternative } from "../shared/formula";

// Types

type NotebookId = number;

export interface NotebookView {
  onClosed(reason: string): void;
  onRedoStateChange(enabled: boolean): void;
  onUndoStateChange(enabled: boolean): void;
  onUpdate(update: NotebookUpdate, ownRequest: boolean): void;
  onCollaboratorConnected(msg: NotebookCollaboratorConnected): void;
  onCollaboratorDisconnected(msg: NotebookCollaboratorDisconnected): void;
}

interface OpenInfo {
  promise: Promise<ClientNotebook>;
  tally: number;
  views: Set<NotebookView>;
}

interface UndoEntry {
  changeRequests: NotebookChangeRequest[];
  undoChangeRequests: NotebookChangeRequest[];
}

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
    // Opened response is handled when open request promise is resolved.
    // All other responses are forwarded to the instance.
    if (msg.operation == 'opened') { return; }
    const instance = this.instanceMap.get(msg.path)!;
    assert(instance);
    instance.onServerResponse(msg, ownRequest);
  }

  // Public Instance Properties

  public cells: ClientCell<CellObject>[]; // REVIEW: Make function property that returns iterator?
  public pages: ClientPage[];
  public readonly id: NotebookId;
  public readonly margins: PageMargins;
  public readonly path: NotebookPath;
  public readonly pageSize: CssSize;
  public readonly pagination: Pagination;

  // Public Instance Property Functions

  public get collaborators(): IterableIterator<CollaboratorObject> {
    return this.collaboratorMap.values();
  }

  public getCell<O extends CellObject>(id: CellId): ClientCell<O> {
    const cell = <ClientCell<O>>this.cellMap.get(id);
    assert(cell);
    return cell;
  }

  public get notebookName(): NotebookName {
    // REVIEW: Rename to just "name"?
    return Folder.notebookNameFromNotebookPath(this.path);
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

  public async deleteCellRequest(cellId: CellId): Promise<void> {
    const changeRequest: DeleteCell = { type: 'deleteCell', cellId };
    await this.sendUndoableChangeRequest(changeRequest);
  }

  public async typesetFormulaRequest(cellId: CellId, alternative: FormulaRecognitionAlternative): Promise<void> {
    const changeRequest: TypesetFormula = { type: 'typesetFormula', cellId, alternative };
    await this.sendUndoableChangeRequest(changeRequest);
  }

  public async deleteStrokeFromCellRequest(cellId: CellId, strokeId: StrokeId): Promise<void> {
    const changeRequest: DeleteStroke = { type: 'deleteStroke', cellId, strokeId };
    await this.sendUndoableChangeRequest(changeRequest)
  }

  public async insertCellRequest(cellType: CellType, afterId: CellRelativePosition): Promise<void> {
    const changeRequest: InsertEmptyCell = { type: 'insertEmptyCell', cellType, afterId };
    await this.sendUndoableChangeRequest(changeRequest);
  }

  public async insertStrokeIntoCellRequest(cellId: CellId, stroke: Stroke): Promise<void> {
    const changeRequest: InsertStroke = { type: 'insertStroke', cellId, stroke };
    await this.sendUndoableChangeRequest(changeRequest)
  }

  public async moveCellRequest(cellId: CellId, targetCellId: CellId): Promise<void> {
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
    await this.sendUndoableChangeRequest(changeRequest);
  }

  public async recognizeFormulaRequest(cellId: CellId): Promise<FormulaRecognized> {
    const msg: RecognizeFormula = {
      type: 'notebook',
      path: this.path,
      operation: 'recognizeFormula',
      cellId,
    };
    const response = await appInstance.socket.sendRequest<FormulaRecognized>(msg);
    assert(response.length == 1);
    return response[0];
  }

  public async redoRequest(): Promise<void> {
    // Returns true if there are more redos available.
    // Resubmit the change requests.
    assert(this.topOfUndoStack < this.undoStack.length);
    const entry = this.undoStack[this.topOfUndoStack++];
    await this.sendChangeRequests(entry.changeRequests);

    // If the are no more undos to redo, then notify the views to disable redo.
    if (this.topOfUndoStack == this.undoStack.length) {
      for (const view of this.views) { view.onRedoStateChange(false); }
    }

    // If we redid the first availabe undo, then notify the views to enable undo.
    if (this.topOfUndoStack == 1) {
      for (const view of this.views) { view.onUndoStateChange(true); }
    }
  }

  public async resizeCellRequest(cellId: CellId, cssSize: CssSize): Promise<void> {
    const changeRequest: ResizeCell = { type: 'resizeCell', cellId, cssSize };
    await this.sendUndoableChangeRequest(changeRequest);
  }

  public async undoRequest(): Promise<void> {
    // Returns true if there are more undos available.
    assert(this.topOfUndoStack > 0);
    const entry = this.undoStack[--this.topOfUndoStack];
    await this.sendChangeRequests(entry.undoChangeRequests);

    // If there are no more operations that can be undone, then notify the views to disable undo.
    if (this.topOfUndoStack == 0) {
      for (const view of this.views) { view.onUndoStateChange(false); }
    }

    // If this is the first undo of a possible sequence of undos, then notify the views to enable redo.
    if (this.topOfUndoStack == this.undoStack.length-1) {
      for (const view of this.views) { view.onRedoStateChange(true); }
    }

  }

  // -- PRIVATE --

  // Private Class Properties

  private static nextId: NotebookId = 1;
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
    assert(responseMessages.length == 1);
    const responseMessage = responseMessages[0];
    const instance = new this(path, responseMessage);
    this.instanceMap.set(path, instance);
    return instance;
  }

  // Private Class Event Handlers

  // Private Constructor

  private constructor(path: NotebookPath, msg: NotebookOpened) { //notebookObject: NotebookObject) {
    const obj = msg.obj;
    this.path = path;
    this.cellMap = new Map();
    this.cells = [];
    this.id = ClientNotebook.nextId++;
    this.margins = obj.margins; // REVIEW: Deep copy?
    this.pageSize = obj.pageSize; // REVIEW: Deep copy?
    this.pagination = obj.pagination;
    this.terminated = false;
    this.topOfUndoStack = 0;
    this.undoStack = [];

    this.collaboratorMap = new Map(msg.collaborators.map(c=>[c.clientId,c]));

    for (let cellIndex=0; cellIndex<obj.cells.length; cellIndex++) {
      const cellObject = obj.cells[cellIndex];
      this.insertCell(cellObject, cellIndex);
    }

    this.pages = [];
    // let cellIndex = 0;
    for (let pageIndex: PageIndex = 0;
         pageIndex < 6; // TODO this.pagination.length;
         pageIndex++)
    {
      // const numCells = pagination[pageIndex];
      const page = new ClientPage(this, pageIndex, 0 /* TODO: cellIndex */, this.cells.length/* TODO: numCells */);
      this.pages.push(page);
      // cellIndex += pagination[pageIndex];
    }
  }

  // Private Instance Properties

  private cellMap: Map<CellId, ClientCell<CellObject>>;
  private readonly collaboratorMap: Map<ClientId, CollaboratorObject>;
  private terminated: boolean;  // TODO: Where to assert(!this.terminated)?
  private topOfUndoStack: number;       // Index of the top of the stack. May not be the length of the undoStack array if there have been some undos.
  private undoStack: UndoEntry[];

  // Private Instance Property Functions

  private cellIndex(id: CellId): CellIndex {
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

  private insertCell(cellObject: CellObject, cellIndex: CellIndex): void {
    // Do not call this method unless you are sure of what you are doing.
    // You probably want to call insertCellRequest instead.
    const cell = createCell(this, cellObject);
    this.cells.splice(cellIndex, 0, cell);
    this.cellMap.set(cell.id, cell);
  }

  // private async sendChangeRequest(changeRequest: NotebookChangeRequest): Promise<ChangeRequestResults> {
  //   return this.sendChangeRequests([ changeRequest ]);
  // }

  private async sendChangeRequests(changeRequests: NotebookChangeRequest[]): Promise<NotebookUpdated> {
    assert(!this.terminated);
    assert(changeRequests.length>0);
    const msg: ChangeNotebook = {
      type: 'notebook',
      operation: 'change',
      path: this.path,
      changeRequests,
    };
    const responseMessages = await appInstance.socket.sendRequest<NotebookUpdated>(msg);
    assert(responseMessages.length>=1);
    if (responseMessages.length == 1) {
      return responseMessages[0];
    } else {
      const rval: NotebookUpdated = {
        type: 'notebook',
        path: this.path,
        operation: 'updated',
        updates: [],
        undoChangeRequests: [],
      };
      for (const responseMessage of responseMessages) {
        rval.updates.push(...responseMessage.updates);
        // Undo change requests have to go in reverse order.
        for (let i=responseMessage.undoChangeRequests.length; i>0; --i) {
          const undoChangeRequest = responseMessage.undoChangeRequests[i-1];
          rval.undoChangeRequests.unshift(undoChangeRequest);
        }
      }
      return rval;
    }
  }

  private async sendUndoableChangeRequest(changeRequest: NotebookChangeRequest): Promise<NotebookChangeRequest[]> {
    return this.sendUndoableChangeRequests([changeRequest]);
  }

  private async sendUndoableChangeRequests(changeRequests: NotebookChangeRequest[]): Promise<NotebookChangeRequest[]> {
    // TODO: Enable undo buttons, enable redo buttons?
    const results = await this.sendChangeRequests(changeRequests);
    const undoChangeRequests = results.undoChangeRequests!;
    // TODO: assert(undoChangeRequests && undoChangeRequests.length>0);
    const entry: UndoEntry = { changeRequests, undoChangeRequests };
    while(this.undoStack.length > this.topOfUndoStack) { this.undoStack.pop(); }
    this.undoStack.push(entry);
    const stackLength = this.topOfUndoStack = this.undoStack.length;

    // If the undo stack was empty before this operation, then notify the views to enable undo.
    if (stackLength == 1) {
      for (const view of this.views) { view.onUndoStateChange(true); }
    }

    return undoChangeRequests;
  }

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
      case 'closed':                    this.onClosed(msg, ownRequest); break;
      case 'collaboratorConnected':     this.onCollaboratorConnected(msg); break;
      case 'collaboratorDisconnected':  this.onCollaboratorDisconnected(msg); break;
      case 'updated':                   this.onUpdated(msg, ownRequest); break;

      // The following are handled when their request promise resolves.
      case 'formulaRecognized': break;

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
    const cell = this.getCell(cellId);
    cell.onCellDeleted(update);
    this.cellMap.delete(cell.id);
    const cellIndex = this.cellIndex(cell.id);
    this.cells.splice(cellIndex, 1);
  }

  private onCellInserted(update: CellInserted): void {
    const { cellObject, cellIndex } = update;
    this.insertCell(cellObject, cellIndex);
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
    // Process an individual notebook change from the server.
    debug(`onUpdate ${notebookUpdateSynopsis(update)}`);

    // Update our data structure
    switch (update.type) {

      case 'cellDeleted':   this.onCellDeleted(update); break;
      case 'cellInserted':  this.onCellInserted(update); break;
      case 'cellMoved':     this.onCellMoved(update); break;

      case 'cellResized':
      case 'formulaTypeset':
      case 'strokeDeleted':
      case 'strokeInserted': {
        const cell = this.getCell(update.cellId);
        cell.onUpdate(update, ownRequest);
        break;
      }
      default: assertFalse();
    }

    // Notify notebook views of the update.
    // REVIEW: for deletions should we update the view before updating the model?
    for (const views of this.views) {
      views.onUpdate(update, ownRequest);
    }
  }

  private onCollaboratorConnected(msg: NotebookCollaboratorConnected): void {
    // Message from the server indicating a user has connected to the notebook.
    const clientId = msg.obj.clientId;
    if (this.collaboratorMap.has(clientId)) {
      logWarning(`Ignoring duplicate collaborator connected message for notebook: ${clientId} ${this.path}`);
      return;
    }
    this.collaboratorMap.set(clientId, msg.obj);
    for (const views of this.views) { views.onCollaboratorConnected(msg); }
  }

  private onCollaboratorDisconnected(msg: NotebookCollaboratorDisconnected): void {
    // Message from the server indicating a user has connected to the notebook.
    const clientId = msg.clientId;
    if (!this.collaboratorMap.has(clientId)) {
      logWarning(`Ignoring duplicate collaborator disconnected message for notebook: ${clientId} ${this.path}`);
      return;
    }
    this.collaboratorMap.delete(clientId);
    for (const views of this.views) { views.onCollaboratorDisconnected(msg); }
  }

}
