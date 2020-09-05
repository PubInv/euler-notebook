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

import { OpenOptions } from "./shared/watched-resource"
import { Notebook, NotebookChange, StyleId, NotebookWatcher } from "./shared/notebook"
import { ServerNotebookChangedMessage, NotebookChangeRequest, ClientNotebookChangeMessage, ClientNotebookUseToolMessage, RequestId, ClientNotebookOpenMessage, ServerNotebookOpenedMessage, ServerNotebookMessage, ServerNotebookClosedMessage } from "./shared/math-tablet-api"

import { appInstance } from "./app"
import { NotebookName, NotebookPath } from "./shared/folder"
import { assert } from "./shared/common"

// Types

export interface TrackedChangesResults {
  changes: NotebookChange[];
  undoChangeRequests: NotebookChangeRequest[];
}

export interface ClientNotebookWatcher extends NotebookWatcher {
  onChangesFinished(): void;
}


export type OpenNotebookOptions = OpenOptions<ClientNotebookWatcher>;

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

  public static smMessage(msg: ServerNotebookMessage): void {
    // A notebook message was received from the server.
    switch(msg.operation) {
      case 'changed': this.smChanged(msg); break;
      case 'closed':  this.smClosed(msg); break;
      default: assert(false, `Client notebook received unexpected '${msg.operation}' message.`); break;
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

  public sendChangeRequest(changeRequest: NotebookChangeRequest): void {
    this.sendChangeRequests([ changeRequest ]);
  }

  public sendChangeRequests(changeRequests: NotebookChangeRequest[]): void {
    if (changeRequests.length == 0) { return; }
    const msg: ClientNotebookChangeMessage = {
      type: 'notebook',
      operation: 'change',
      path: this.path,
      changeRequests,
    }
    appInstance.socket.sendMessage(msg);
  }

  public sendTrackedChangeRequest(changeRequest: NotebookChangeRequest): Promise<TrackedChangesResults> {
    return this.sendTrackedChangeRequests([ changeRequest ]);
  }

  public sendTrackedChangeRequests(changeRequests: NotebookChangeRequest[]): Promise<TrackedChangesResults> {
    return new Promise((resolve, reject)=>{
      const tracker: RequestId = appInstance.socket.generateRequestId();
      this.trackedChangeRequests.set(tracker, { resolve, reject });
      this.trackedChangeResponses.set(tracker, { changes: [], undoChangeRequests: [] });
      this.sendChangeRequests(changeRequests);
    });
  }

  public useTool(id: StyleId): void {
    const msg: ClientNotebookUseToolMessage = { type: 'notebook', operation: 'useTool', path: this.path, styleId: id };
    appInstance.socket.sendMessage(msg);
  }

  // -- PRIVATE --

  // Private Class Properties

  // Private Class Methods

  protected static getInstance(path: NotebookPath): ClientNotebook {
    return <ClientNotebook>super.getInstance(path);
  }

  // Private Class Event Handlers

  private static smChanged(msg: ServerNotebookChangedMessage): void {
    // Message from the server that the notebook has changed.
    const instance = this.getInstance(msg.path);
    instance.smChanged(msg);
  }

  private static smClosed(msg: ServerNotebookClosedMessage): void {
    // Message from the server that the notebook has been closed by the server.
    // For example, if the notebook was deleted or moved.
    const had = this.close(msg.path, msg.reason);
    assert(had);
  }

  // Private Constructor

  private constructor(path: NotebookPath, _options: OpenNotebookOptions) {
    super(path);
    this.trackedChangeRequests = new Map();
    this.trackedChangeResponses = new Map();
  }

  // Private Instance Properties

  // REVIEW: Could there be more than one screen attached to this openNotebook?
  private trackedChangeRequests: Map<RequestId, { resolve: (results: TrackedChangesResults)=>void, reject: (reason: any)=>void }>;
  private trackedChangeResponses: Map<RequestId, TrackedChangesResults>;

  // Private Instance Methods

  protected async initialize(_options: OpenNotebookOptions): Promise<void> {
    const message: ClientNotebookOpenMessage = { type: 'notebook', operation: 'open', path: this.path };
    const response = await appInstance.socket.sendRequest<ServerNotebookOpenedMessage>(message);
    Notebook.validateObject(response.obj);
    this.initializeFromObject(response.obj);
  }

  protected terminate(reason: string): void {
    super.terminate(reason);
  }

  // Private Event Handlers

  private smChanged(msg: ServerNotebookChangedMessage): void {
    // Message from the server indicating this notebook has changed.

    // Apply changes to the notebook data structure, and notify the view of the change.
    // If the change is not a delete, then update the data structure first, then notify the view.
    // Otherwise, notify the view of the change, then update the data structure.
    // (The view needs to trace the deleted style or relationship to the top-level style to
    //  determine what cell to update. If the style has been deleted from the notebook already
    //  then it cannot do that.)
    for (const change of msg.changes) {
      this.applyChange(change);
    }

    for (const watcher of this.watchers) {
      watcher.onChangesFinished();
    }

    // If the changes were tracked then accumulate the changes
    // and resolve the tracking promise if complete.
    if (msg.requestId) {
      const previousResults = this.trackedChangeResponses.get(msg.requestId);
      if (!previousResults) { throw new Error("No previous results for tracker."); }
      previousResults.changes = previousResults.changes.concat(msg.changes);
      if (msg.undoChangeRequests) {
        previousResults.undoChangeRequests = previousResults.undoChangeRequests.concat(msg.undoChangeRequests);
      }
      if (msg.complete) {
        this.trackedChangeResponses.delete(msg.requestId);
        const fns = this.trackedChangeRequests.get(msg.requestId);
        this.trackedChangeRequests.delete(msg.requestId);
        if (!fns) { throw new Error(`Missing tracker promise functions for ${msg.requestId}`); }
        // REVIEW: Is there any way the promise could be rejected?
        fns.resolve(previousResults);
      }
    }
  }

}
