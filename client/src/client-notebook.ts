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

import { PromiseResolver } from './shared/common';
import { Notebook, NotebookObject, NotebookChange, StyleId } from './shared/notebook';
import { ServerNotebookChangedMessage, NotebookChangeRequest, ClientNotebookChangeMessage, ClientNotebookUseToolMessage, RequestId, ClientNotebookOpenMessage, ServerNotebookOpenedMessage, ServerNotebookMessage, ServerNotebookClosedMessage } from './shared/math-tablet-api';

import { appInstance } from './app';
import { NotebookName, NotebookPath } from './shared/folder';
import { NotebookBasedScreen } from './screen';
import { assert } from './shared/common';

// Types

interface InstanceInfo {
  promise: Promise<ClientNotebook>;           // Promise for the instance returned from 'open'.
  resolver?: PromiseResolver<ClientNotebook>;
  instance?: ClientNotebook;
}

export interface TrackedChangesResults {
  changes: NotebookChange[];
  undoChangeRequests: NotebookChangeRequest[];
}

// Constants

// Global Variables

// Class

export class ClientNotebook extends Notebook {

  // Class Methods

  public static async open(path: NotebookPath): Promise<ClientNotebook> {
    let existingInfo = this.instanceMap.get(path);
    if (!existingInfo) {
      const message: ClientNotebookOpenMessage = { type: 'notebook', operation: 'open', path };
      appInstance.socket.sendMessage(message);
      let resolver: PromiseResolver<ClientNotebook>;
      const promise = new Promise<ClientNotebook>((resolve, reject)=>{ resolver = { resolve, reject }; });
      // Ignoring: "Variable 'resolver' is used before being assigned.
      // Resolver is set when promise is constructed.
      // @ts-ignore
      existingInfo = { promise, resolver };
      this.instanceMap.set(path, existingInfo);
    }
    return existingInfo.promise;
  }

  // Class Event Handlers

  public static onMessage(msg: ServerNotebookMessage): void {
    // A notebook message was received from the server.
    switch(msg.operation) {
      case 'changed': this.smChanged(msg); break;
      case 'closed':  this.smClosed(msg); break;
      case 'opened': this.smOpened(msg); break;
      default: assert(false); break;
    }
  }

  // Instance Properties

  public path: NotebookPath;

  // Instance Property Functions

  public get notebookName(): NotebookName {
    const i = this.path.lastIndexOf('/');
    return <NotebookName>this.path.slice(i);
  }

  // Instance Methods

  public connect(screen: NotebookBasedScreen): void {
    this.screen = screen;
  }

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

  private static instanceMap: Map<NotebookPath, InstanceInfo> = new Map();

  // Private Class Methods

  private static smChanged(msg: ServerNotebookChangedMessage): void {
    const info = this.instanceMap.get(msg.path);
    assert(info && info.instance && !info.resolver);
    info!.instance!.onChanged(msg);
  }

  private static smClosed(msg: ServerNotebookClosedMessage): void {
    const info = this.instanceMap.get(msg.path);
    assert(info && info.instance && !info.resolver);
    this.instanceMap.delete(msg.path);
    info!.instance!.onClosed(msg);
  }

  private static smOpened(msg: ServerNotebookOpenedMessage): void {
    // TODO: Handle if there is an error opening the folder.
    const info = this.instanceMap.get(msg.path);
    assert(info && !info.instance && info.resolver);
    const instance = info!.instance = new this(msg.path, msg.obj);
    info!.resolver!.resolve(instance);
    delete info!.resolver;
  }

  // Private Constructor

  private constructor(path: NotebookPath, obj: NotebookObject) {
    super(obj);
    this.path = path;
    this.trackedChangeRequests = new Map();
    this.trackedChangeResponses = new Map();
  }

  // Private Instance Properties

  // REVIEW: Could there be more than one screen attached to this openNotebook?
  private screen?: NotebookBasedScreen;
  private trackedChangeRequests: Map<RequestId, { resolve: (results: TrackedChangesResults)=>void, reject: (reason: any)=>void }>;
  private trackedChangeResponses: Map<RequestId, TrackedChangesResults>;

  // Private Instance Methods

  // Private Event Handlers

  // Private Event Handlers

  private onChanged(msg: ServerNotebookChangedMessage): void {
    // Message from the server indicating this notebook has changed.

    // Apply changes to the notebook data structure, and notify the view of the change.
    // If the change is not a delete, then update the data structure first, then notify the view.
    // Otherwise, notify the view of the change, then update the data structure.
    // (The view needs to trace the deleted style or relationship to the top-level style to
    //  determine what cell to update. If the style has been deleted from the notebook already
    //  then it cannot do that.)
    for (const change of msg.changes) {
      const isDelete = (change.type == 'relationshipDeleted' || change.type == 'styleDeleted');
      if (!isDelete) { this.applyChange(change); }
      if (this.screen) { this.screen.smChange(change); }
      if (isDelete) { this.applyChange(change); }
    }

    // Update the notebooks view
    // REVIEW: Might we want to postpone updating the view until the tracker promises are resolved?
    // TODO: convert to "Watcher" like ClientFolder
    //       if (this.screen) { this.screen.updateView(); }

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

  public onClosed(_msg: ServerNotebookClosedMessage): void {
    // TODO: Notify our screen client that we are closing?
  }

}
