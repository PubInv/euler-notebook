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

import { CellId, CellObject, CellPosition, CellRelativePosition, CellType } from "../shared/cell";
import { assert, assertFalse, ClientId, Html, PlainText } from "../shared/common";
import { CssSize } from "../shared/css";
import { notebookUpdateSynopsis } from "../shared/debug-synopsis";
import { NotebookPath } from "../shared/folder";
import { ImageInfo, PositionInfo as ImagePositionInfo } from "../shared/image-cell";
import { Notebook } from "../shared/notebook";
import {
  NotebookChangeRequest, ChangeNotebook, OpenNotebook, DeleteCell, ResizeCell,
  InsertStroke, MoveCell, DeleteStroke, InsertEmptyCell, InsertCell, ChangeImage
} from "../shared/client-requests";
import {
  NotebookUpdated, NotebookOpened, NotebookResponse, NotebookClosed, NotebookUpdate,
  NotebookCollaboratorConnected, NotebookCollaboratorDisconnected
} from "../shared/server-responses";
import { Stroke, StrokeId } from "../shared/stylus";
import { CollaboratorObject } from "../shared/user";

import { appInstance } from "../app";

import { ClientCell } from "./client-cell";
import { createCell } from "./client-cell/instantiator";
import { logWarning } from "../error-handler";

// Types

type NotebookId = number;

export interface NotebookWatcher {
  onClosed(reason: string): void;
  onRedoStateChange(enabled: boolean): void;
  onUndoStateChange(enabled: boolean): void;
  onUpdate(update: NotebookUpdate, ownRequest?: boolean): void;
  onCollaboratorConnected(msg: NotebookCollaboratorConnected): void;
  onCollaboratorDisconnected(msg: NotebookCollaboratorDisconnected): void;
}

interface OpenInfo {
  promise: Promise<ClientNotebook>;
  watchers: Set<NotebookWatcher>;
}

interface UndoEntry {
  changeRequests: NotebookChangeRequest[];
  undoChangeRequests: NotebookChangeRequest[];
}

// Constants

// Global Variables

// Exported Class

export class ClientNotebook extends Notebook {

  // Public Class Methods

  public static async open(path: NotebookPath, watcher: NotebookWatcher): Promise<ClientNotebook> {
    let openInfo = this.openMap.get(path);
    if (openInfo) {
      openInfo.watchers.add(watcher);
    } else {
      const promise = this.openFirst(path);
      openInfo = {
        promise,
        watchers: new Set([ watcher ]),
      };
      this.openMap.set(path, openInfo);
      promise.catch(_err=>{ this.openMap.delete(path); });
    }
    return openInfo.promise;
  }

  // Public Class Event Handlers

  public static onServerResponse(msg: NotebookResponse, ownRequest: boolean): void {
    // Opened response is handled when open request promise is resolved.
    // All other responses are forwarded to the instance.
    if (msg.operation == 'opened') { return; }
    const instance = this.getInstance(msg.path)!;
    instance.onServerResponse(msg, ownRequest);
  }

  // Public Instance Properties

  public readonly id: NotebookId;

  // Public Instance Property Functions

  public *cells(): Iterable<ClientCell<CellObject>> {
    for (const cellObject of this.obj.cells) {
      const cell = this.cellMap.get(cellObject.id)!;
      assert(cell);
      yield cell;
    }
  }

  public get collaborators(): IterableIterator<CollaboratorObject> {
    return this.collaboratorMap.values();
  }

  public getCell<O extends CellObject>(id: CellId): ClientCell<O> {
    const cell = <ClientCell<O>>this.cellMap.get(id);
    assert(cell);
    return cell;
  }

  // public get notebookName(): NotebookName {
  //   // REVIEW: Rename to just "name"?
  //   return Folder.notebookNameFromNotebookPath(this.path);
  // }

  public toDebugHtml(): Html {
    return <Html>this.obj.cells.map(cellObject=>{
      const cell = this.getCell(cellObject.id);
      return cell.toDebugHtml();
    }).join('\n');
  }

  // Public Instance Methods

  public close(watcher: NotebookWatcher): void {
    assert(!this.terminated);
    const had = this.watchers.delete(watcher);
    assert(had);
    if (this.watchers.size == 0) {
      // LATER: Set timer to destroy in the future.
      this.terminate("Closed by all clients");
    }
  }

  public async changeImageRequest(cellId: CellId, imageInfo: ImageInfo, positionInfo: ImagePositionInfo, cssSize?: CssSize): Promise<void> {
    const changeRequest: ChangeImage = { type: 'changeImage', cellId, imageInfo, positionInfo, cssSize };
    await this.sendUndoableChangeRequest(changeRequest);
  }

  public async deleteCellRequest(cellId: CellId): Promise<void> {
    const changeRequest: DeleteCell = { type: 'deleteCell', cellId };
    await this.sendUndoableChangeRequest(changeRequest);
  }

  public async deleteStrokeFromCellRequest(cellId: CellId, strokeId: StrokeId): Promise<void> {
    const changeRequest: DeleteStroke = { type: 'deleteStroke', cellId, strokeId };
    await this.sendUndoableChangeRequest(changeRequest)
  }

  public async insertCellRequest(cellObject: CellObject, afterId: CellRelativePosition): Promise<void> {
    const changeRequest: InsertCell = { type: 'insertCell', cellObject, afterId };
    await this.sendUndoableChangeRequest(changeRequest);
  }

  public async insertEmptyCellRequest(cellType: CellType, afterId: CellRelativePosition): Promise<void> {
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
      if (targetIndex>0) { afterId = this.obj.cells[targetIndex-1].id; }
      else { afterId = CellPosition.Top; }
    }
    const changeRequest: MoveCell = {
      type: 'moveCell',
      cellId: cellId,
      afterId,
    }
    await this.sendUndoableChangeRequest(changeRequest);
  }

  public async redoRequest(): Promise<void> {
    // Returns true if there are more redos available.
    // Resubmit the change requests.
    assert(this.topOfUndoStack < this.undoStack.length);
    const entry = this.undoStack[this.topOfUndoStack++];
    await this.sendChangeRequests(entry.changeRequests);

    // If the are no more undos to redo, then notify the watchers to disable redo.
    if (this.topOfUndoStack == this.undoStack.length) {
      for (const watcher of this.watchers) { watcher.onRedoStateChange(false); }
    }

    // If we redid the first availabe undo, then notify the watchers to enable undo.
    if (this.topOfUndoStack == 1) {
      for (const watcher of this.watchers) { watcher.onUndoStateChange(true); }
    }
  }

  public async requestChanges(changeRequests: NotebookChangeRequest[]): Promise<void> {
    await this.sendChangeRequests(changeRequests);
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

    // If there are no more operations that can be undone, then notify the watchers to disable undo.
    if (this.topOfUndoStack == 0) {
      for (const watcher of this.watchers) { watcher.onUndoStateChange(false); }
    }

    // If this is the first undo of a possible sequence of undos, then notify the watchers to enable redo.
    if (this.topOfUndoStack == this.undoStack.length-1) {
      for (const watcher of this.watchers) { watcher.onRedoStateChange(true); }
    }

  }

  // -- PRIVATE --

  // Private Class Properties

  private static nextId: NotebookId = 1;
  private static openMap = new Map<NotebookPath, OpenInfo>();
  private static instanceMap = new Map<NotebookPath, ClientNotebook>();

  // Private Class Methods

  private static getInstance(path: NotebookPath): ClientNotebook {
    const instance = this.instanceMap.get(path)!;
    assert(instance);
    return instance;
  }

  private static async openFirst(path: NotebookPath): Promise<ClientNotebook> {
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

  private constructor(path: NotebookPath, msg: NotebookOpened) {
    super(path, msg.obj);

    this.id = ClientNotebook.nextId++;
    this.cellMap = new Map(this.obj.cells.map(cellObject=>[ cellObject.id, createCell(this, cellObject) ]));
    this.terminated = false;
    this.topOfUndoStack = 0;
    this.undoStack = [];

    this.collaboratorMap = new Map();
    for (const collaborator of msg.collaborators) {
      this.collaboratorMap.set(collaborator.clientId, collaborator);
    }
  }

  // Private Instance Properties

  private cellMap: Map<CellId, ClientCell<CellObject>>;
  private readonly collaboratorMap: Map<ClientId, CollaboratorObject>;
  private terminated: boolean;  // TODO: Where to assert(!this.terminated)?
  private topOfUndoStack: number;       // Index of the top of the stack. May not be the length of the undoStack array if there have been some undos.
  private undoStack: UndoEntry[];

  // Private Instance Property Functions

  private get watchers(): Set<NotebookWatcher> {
    const openInfo = ClientNotebook.openMap.get(this.path)!;
    assert(openInfo);
    return openInfo.watchers;
  }

  // Private Instance Methods

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
      // We received multiple NotebookUpdated responses. Combine them into a single one.
      // REVIEW: Not sure this is the proper way to handle this. We should dispatch messages
      //         as soon as they are received. Maybe the return value from a "request" (vs. "message")
      //         is the last response received (i.e. the one with the 'complete' flag set).
      //         Note that most requests are expected to have only one response anyway.
      const rval: NotebookUpdated = {
        type: 'notebook',
        path: this.path,
        operation: 'updated',
        updates: [],
        undoChangeRequests: [],
      };
      for (const responseMessage of responseMessages) {
        rval.updates.push(...responseMessage.updates);
      }
      // Undo change requests have to go in reverse order.
      for (let i=responseMessages.length; i>0; --i) {
        const responseMessage = responseMessages[i];
        rval.undoChangeRequests.push(...responseMessage.undoChangeRequests);
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

    // If the undo stack was empty before this operation, then notify the watchers to enable undo.
    if (stackLength == 1) {
      for (const watcher of this.watchers) { watcher.onUndoStateChange(true); }
    }

    return undoChangeRequests;
  }

  private terminate(reason: string): void {
    assert(!this.terminated);
    this.terminated = true;
    ClientNotebook.instanceMap.delete(this.path);
    ClientNotebook.openMap.delete(this.path);
    for (const watcher of this.watchers) { watcher.onClosed(reason); }
  }

  // Private Instance Event Handlers

  private onClosed(msg: NotebookClosed, _ownRequest: boolean): void {
    // Message from the server that the notebook has been closed by the server.
    // For example, if the notebook was deleted or moved.
    this.terminate(msg.reason);
  }

  private onCollaboratorConnected(msg: NotebookCollaboratorConnected): void {
    // Message from the server indicating a user has connected to the notebook.
    const clientId = msg.obj.clientId;
    if (this.collaboratorMap.has(clientId)) {
      logWarning(<PlainText>`Ignoring duplicate collaborator connected message for notebook: ${clientId} ${this.path}`);
      return;
    }
    this.collaboratorMap.set(clientId, msg.obj);
    for (const watcher of this.watchers) { watcher.onCollaboratorConnected(msg); }
  }

  private onCollaboratorDisconnected(msg: NotebookCollaboratorDisconnected): void {
    // Message from the server indicating a user has connected to the notebook.
    const clientId = msg.clientId;
    if (!this.collaboratorMap.has(clientId)) {
      logWarning(<PlainText>`Ignoring duplicate collaborator disconnected message for notebook: ${clientId} ${this.path}`);
      return;
    }
    this.collaboratorMap.delete(clientId);
    for (const watcher of this.watchers) { watcher.onCollaboratorDisconnected(msg); }
  }

  private onServerResponse(msg: NotebookResponse, ownRequest: boolean): void {
    // A notebook message was received from the server.
    switch(msg.operation) {
      case 'closed':                    this.onClosed(msg, ownRequest); break;
      case 'collaboratorConnected':     this.onCollaboratorConnected(msg); break;
      case 'collaboratorDisconnected':  this.onCollaboratorDisconnected(msg); break;
      case 'updated':                   this.onUpdated(msg, ownRequest); break;
      case 'opened':
      default: assertFalse();
    }
  }

  protected /* override */ onUpdate(update: NotebookUpdate, ownRequest?: boolean): void {
    // Process an individual update from the server.
    debug(`onUpdate ${notebookUpdateSynopsis(update)}`);

    // Update the notebook data structure
    super.onUpdate(update);

    // Update our extensions to the notebook data structure.
    switch (update.type) {
      case 'cellDeleted': {
        const { cellId } = update;
        const cell = this.getCell(cellId);
        cell.onUpdate(update, ownRequest);
        this.cellMap.delete(cell.id);
        break;
      }
      case 'cellInserted': {
        const { cellObject } = update;
        const cell = createCell(this, cellObject);
        this.cellMap.set(cell.id, cell);
        break;
      }
      default: {
        if (update.hasOwnProperty('cellId')) {
          const cell = this.getCell((<any/* TYPESCRIPT: */>update).cellId);
          cell.onUpdate(update, ownRequest);
        }
        break;
      }
    }

    // Notify notebook watchers of the update.
    for (const watcher of this.watchers) {
      watcher.onUpdate(update, ownRequest);
    }
  }

  private onUpdated(msg: NotebookUpdated, ownRequest: boolean): void {
    // Message from the server indicating this notebook has changed.
    // Dispatch each update in turn.
    for (const update of msg.updates) {
      this.onUpdate(update, ownRequest);
    }
  }

}
