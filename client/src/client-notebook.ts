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

import { CellId } from "./shared/cell";
import { Notebook, NotebookChange, NotebookWatcher } from "./shared/notebook";
import {
  ServerNotebookChangedMessage, NotebookChangeRequest, ClientNotebookChangeMessage, ClientNotebookUseToolMessage,
  ClientNotebookOpenMessage, ServerNotebookOpenedMessage, ServerNotebookMessage, ServerNotebookClosedMessage,
} from "./shared/math-tablet-api";
import { OpenOptions } from "./shared/watched-resource";

import { appInstance } from "./app";
import { NotebookName, NotebookPath } from "./shared/folder";
import { assert, assertFalse } from "./shared/common";

// Types

export interface ClientNotebookWatcher extends NotebookWatcher {
  onChangesFinished(ownRequest: boolean): void;
}

export type OpenNotebookOptions = OpenOptions<ClientNotebookWatcher>;

interface ChangeRequestResults {
  changes: NotebookChange[];
  undoChangeRequests?: NotebookChangeRequest[];
}

// Constants

// Global Variables

// Class

export class ClientNotebook extends Notebook<ClientNotebookWatcher> {

  // Class Methods

  public static async open(path: NotebookPath, options: OpenNotebookOptions): Promise<ClientNotebook> {
    // IMPORTANT: This is a standard open pattern that all WatchedResource-derived classes should use.
    //            Do not modify unless you know what you are doing!
    const isOpen = this.isOpen(path);
    const instance = isOpen ? this.getInstance(path) : new this(path, options);
    instance.open(options, isOpen);
    return instance.openPromise;
  }

  // Class Event Handlers

  public static smMessage(msg: ServerNotebookMessage, ownRequest: boolean): void {
    // A notebook message was received from the server.
    switch(msg.operation) {
      case 'changed': this.smChanged(msg, ownRequest); break;
      case 'closed':  this.smClosed(msg, ownRequest); break;
      case 'opened':  break; // Nothing to do. Opened response is handled when request promise is resolved.
      default: assertFalse();
    }
  }

  // Instance Properties

  // Instance Property Functions

  public get notebookName(): NotebookName {
    const i = this.path.lastIndexOf('/');
    return <NotebookName>this.path.slice(i);
  }

  // Instance Methods

  // public connect(screen: NotebookBasedScreen): void {
  //   this.screen = screen;
  // }

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
    const msg: ClientNotebookChangeMessage = {
      type: 'notebook',
      operation: 'change',
      path: this.path,
      changeRequests,
    }
    const responseMessages = await appInstance.socket.sendRequest<ServerNotebookChangedMessage>(msg);
    assert(responseMessages.length>=1);
    if (responseMessages.length == 1) {
      const responseMessage = responseMessages[0];
      return { changes: responseMessage.changes, undoChangeRequests: responseMessage.undoChangeRequests };
    } else {
      const rval: ChangeRequestResults = {
        changes: [],
        undoChangeRequests: [],
      };
      for (const responseMessage of responseMessages) {
        rval.changes.push(...responseMessage.changes);
        if (responseMessage.undoChangeRequests) {
          rval.undoChangeRequests!.push(...responseMessage.undoChangeRequests);
        }
      }
      return rval;
    }
  }

  public useTool(id: CellId): void {
    const msg: ClientNotebookUseToolMessage = { type: 'notebook', operation: 'useTool', path: this.path, cellId: id };
    appInstance.socket.sendMessage(msg);
  }

  // -- PRIVATE --

  // Private Class Properties

  // Private Class Methods

  protected static getInstance(path: NotebookPath): ClientNotebook {
    return <ClientNotebook>super.getInstance(path);
  }

  // Private Class Event Handlers

  private static smChanged(msg: ServerNotebookChangedMessage, ownRequest: boolean): void {
    // Message from the server that the notebook has changed.
    const instance = this.getInstance(msg.path);
    instance.smChanged(msg, ownRequest);
  }

  private static smClosed(msg: ServerNotebookClosedMessage, _ownRequest: boolean): void {
    // Message from the server that the notebook has been closed by the server.
    // For example, if the notebook was deleted or moved.
    const had = this.close(msg.path, msg.reason);
    assert(had);
  }

  // Private Constructor

  private constructor(path: NotebookPath, _options: OpenNotebookOptions) {
    super(path);
  }

  // Private Instance Properties

  // Private Instance Methods

  protected async initialize(_options: OpenNotebookOptions): Promise<void> {
    const message: ClientNotebookOpenMessage = { type: 'notebook', operation: 'open', path: this.path };
    const responseMessages = await appInstance.socket.sendRequest<ServerNotebookOpenedMessage>(message);
    assert(responseMessages.length == 1);
    Notebook.validateObject(responseMessages[0].obj);
    this.initializeFromObject(responseMessages[0].obj);
  }

  protected terminate(reason: string): void {
    super.terminate(reason);
  }

  // Private Event Handlers

  private smChanged(msg: ServerNotebookChangedMessage, ownRequest: boolean): void {
    // Message from the server indicating this notebook has changed.

    // Apply changes to the notebook data structure, and notify the view of the change.
    // If the change is not a delete, then update the data structure first, then notify the view.
    // Otherwise, notify the view of the change, then update the data structure.
    // (The view needs to trace the deleted cell or relationship to the top-level cell to
    //  determine what cell to update. If the cell has been deleted from the notebook already
    //  then it cannot do that.)
    for (const change of msg.changes) {
      this.applyChange(change, ownRequest);
    }

    for (const watcher of this.watchers) {
      watcher.onChangesFinished(ownRequest);
    }
  }


}
