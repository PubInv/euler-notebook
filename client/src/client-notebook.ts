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

import { CellId, CellObject } from "./shared/cell";
import { assert, assertFalse, CssSize, notImplemented } from "./shared/common";
import { NotebookName, NotebookNameFromNotebookPath, NotebookPath } from "./shared/folder";
import { FORMAT_VERSION, NotebookObject, PageMargins } from "./shared/notebook";
import {
  NotebookChangeRequest, ChangeNotebook, UseTool,
  OpenNotebook,
} from "./shared/client-requests";
import { NotebookUpdated, NotebookOpened, NotebookResponse, NotebookClosed, NotebookUpdate } from "./shared/server-responses";

import { createCell } from "./client-cell/instantiator";

import { appInstance } from "./app";
import { ClientCell } from "./client-cell";

// Types

export interface ClientNotebookWatcher {
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
  watchers: Set<ClientNotebookWatcher>;
}

interface Page {
  cells: ClientCell<any>[];
  margins: PageMargins;
  size: CssSize;
}

// Constants

// Global Variables

// Exported Class

export class ClientNotebook {

  // Public Class Methods

  public static async open(path: NotebookPath, watcher: ClientNotebookWatcher): Promise<ClientNotebook> {
    // REVIEW: If open promise rejects, then we should purge it from
    //         the openMap so the open can be attempted again.
    //         Otherwise, all subsequent attempts at opening will fail
    //         on the same rejected promise.
    let openInfo = this.openMap.get(path);
    if (openInfo) {
      openInfo.tally++;
      openInfo.watchers.add(watcher);
    } else {
      openInfo = { promise: this.openNew(path), tally: 1, watchers: new Set([ watcher ]) };
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

  public readonly path: NotebookPath;
  public pages: Page[];

  // Public Instance Property Functions

  // public compareCellPositions(id1: CellId, id2: CellId): number {
  //   // Returns a negative number if style1 is before style2,
  //   // zero if they are the same styles,
  //   // or a positive number if style1 is after style2.

  //   return cellPosition(id1) - cellPosition(id2);
  // }
  // public cellPosition(id: CellId): CellOrdinalPosition {
  //   // TODO: On different pages.
  //   return this.pages[0].cellIds.indexOf(id);
  // }

  public get notebookName(): NotebookName {
    // REVIEW: Rename to just "name"?
    return NotebookNameFromNotebookPath(this.path);
  }

  public getCell<O extends CellObject>(id: CellId): ClientCell<O> {
    const cell = <ClientCell<O>>this.cellMap.get(id);
    assert(cell);
    return cell;
  }

  // Public Instance Methods

  public close(watcher: ClientNotebookWatcher): void {
    assert(!this.terminated);
    const openInfo = ClientNotebook.openMap.get(this.path)!;
    assert(openInfo);
    const had = openInfo.watchers.delete(watcher);
    assert(had);
    if (openInfo.watchers.size == 0) {
      // LATER: Set timer to destroy in the future.
      this.terminate("Closed by client");
    }
  }

  public export(): void {
    // NOTE: Notebook path starts with a slash.
    const url = `/export${this.path}`;
    // window.location.href = url;
    window.open(url, "_blank")
  }

  public async sendChangeRequest(changeRequest: NotebookChangeRequest): Promise<ChangeRequestResults> {
    return this.sendChangeRequests([ changeRequest ]);
  }

  public async sendChangeRequests(changeRequests: NotebookChangeRequest[]): Promise<ChangeRequestResults> {
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
    const cellMap = this.cellMap = new Map();
    this.terminated = false;

    this.pages = notebookObject.pages.map(pageObject=>{
      const cells = pageObject.cells.map(cellObject=>{
        const cell = createCell(this, cellObject);
        cellMap.set(cell.id, cell);
        return cell;
      });
      const page: Page = { ...pageObject, cells };
      return page;
    })
  }

  // Private Instance Properties

  private cellMap: Map<CellId, ClientCell<any>>;
  private terminated: boolean;  // TODO: Where to assert(!this.terminated)?

  // Private Instance Property Functions

  private get watchers(): Set<ClientNotebookWatcher> {
    const openInfo = ClientNotebook.openMap.get(this.path)!;
    assert(openInfo);
    return openInfo.watchers;
  }

  // Private Instance Methods

  protected terminate(reason: string): void {
    assert(!this.terminated);
    this.terminated = true;
    ClientNotebook.instanceMap.delete(this.path);
    ClientNotebook.openMap.delete(this.path);
    for (const watcher of this.watchers) { watcher.onClosed(reason); }
  }

  // Private Event Handlers

  private onServerResponse(msg: NotebookResponse, ownRequest: boolean): void {
    // A notebook message was received from the server.
    switch(msg.operation) {
      case 'updated': this.onUpdated(msg, ownRequest); break;
      case 'closed':  this.onClosedByServer(msg, ownRequest); break;
      case 'opened':
      default: assertFalse();
    }
  }

  private onClosedByServer(msg: NotebookClosed, _ownRequest: boolean): void {
    // Message from the server that the notebook has been closed by the server.
    // For example, if the notebook was deleted or moved.
    this.terminate(msg.reason);
  }

  private onUpdated(msg: NotebookUpdated, ownRequest: boolean): void {
    // Message from the server indicating this notebook has changed.

    // Apply changes to the notebook data structure, and notify the view of the change.
    // If the change is not a delete, then update the data structure first, then notify the view.
    // Otherwise, notify the view of the change, then update the data structure.
    // (The view needs to trace the deleted cell or relationship to the top-level cell to
    //  determine what cell to update. If the cell has been deleted from the notebook already
    //  then it cannot do that.)
    for (const update of msg.updates) {
      this.onUpdate(update, ownRequest);
    }
  }

  private onUpdate(update: NotebookUpdate, ownRequest: boolean): void {

    // Update our data structure
    switch (update.type) {
      case 'cellDeleted': {
        notImplemented();
        // // If a substyle is deleted then mark the cell as dirty.
        // // If a top-level style is deleted then remove the cell.
        // const cellView = this.cellViews.get(update.cellId);
        // assert(cellView);
        // this.deleteCell(cellView!);
        break;
      }
      case 'cellInserted': {
        notImplemented();
        // this.createCell(change.cellObject, change.afterId!);
        break;
      }
      case 'cellMoved': {
        notImplemented();
        // const movedCell = this.cellViews.get(update.cellId);
        // assert(movedCell);
        // // Note: DOM methods ensure the element will be removed from
        // //       its current parent.
        // this.insertCellView(movedCell!, update.afterId);
        // // REVIEW: We do not pass the changed event to the moved cell, assuming it does not change. Safe assumption?
        break;
      }
      default: assertFalse();
    }

    // Notify watchers of the update.
    for (const watcher of this.watchers) {
      watcher.onUpdate(update, ownRequest);
    }
  }
}
