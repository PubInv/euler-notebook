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

// import { $ } from './dom';
import { assert } from './common';
import { NotebookChanged, NotebookPath, Tracker, NotebookChangeRequest, ChangeNotebook, UseTool, ChangeNotebookOptions, NotebookName } from './shared/math-tablet-api';
import { Notebook, NotebookObject, NotebookChange, StyleId } from './shared/notebook';
import { NotebookView } from './notebook-view';
import { ServerSocket } from './server-socket';

// Types

export interface TrackedChangesResults {
  changes: NotebookChange[];
  undoChangeRequests: NotebookChangeRequest[];
}

// Constants

// Global Variables

// Class

export class ClientNotebook extends Notebook {

  // Class Methods

  public static create(socket: ServerSocket, notebookPath: NotebookPath, obj: NotebookObject): ClientNotebook {
    assert(!this.notebooks.has(notebookPath));
    const instance = new this(socket, notebookPath, obj);
    this.notebooks.set(notebookPath, instance);
    return instance;
  }

  public static open(socket: ServerSocket, notebookPath: NotebookPath, tDoc: NotebookObject): ClientNotebook {
    return this.notebooks.get(notebookPath) || this.create(socket, notebookPath, tDoc);
  }

  public static get(notebookName: NotebookPath): ClientNotebook|undefined {
    return this.notebooks.get(notebookName);
  }

  // Instance Properties

  // Instance Property Functions

  public get notebookName(): NotebookName {
    const i = this.notebookPath.lastIndexOf('/');
    return <NotebookName>this.notebookPath.slice(i, -5); // -5 == '.mtnb'.length
  }

  // Instance Methods

  // REVIEW: When is this called?
  public close() {
    // TODO: mark closed?
    ClientNotebook.notebooks.delete(this.notebookPath);
  }

  public connect(notebookView: NotebookView): void {
    this.notebookView = notebookView;
  }

  public export(): void {
    // NOTE: Notebook path starts with a slash.
    const url = `/export${this.notebookPath}`;
    // window.location.href = url;
    window.open(url, "_blank")
  }

  public sendChangeRequest(changeRequest: NotebookChangeRequest, options: ChangeNotebookOptions): void {
    this.sendChangeRequests([ changeRequest ], options);
  }

  public sendChangeRequests(changeRequests: NotebookChangeRequest[], options: ChangeNotebookOptions): void {
    if (changeRequests.length == 0) { return; }
    const msg: ChangeNotebook = {
      type: 'changeNotebook',
      notebookPath: this.notebookPath,
      changeRequests,
      options,
    }
    this.socket.sendMessage(msg);
  }

  public sendTrackedChangeRequest(changeRequest: NotebookChangeRequest, options?: ChangeNotebookOptions): Promise<TrackedChangesResults> {
    return this.sendTrackedChangeRequests([ changeRequest ], options);
  }

  public sendTrackedChangeRequests(changeRequests: NotebookChangeRequest[], options?: ChangeNotebookOptions): Promise<TrackedChangesResults> {
    options = options || {};
    return new Promise((resolve, reject)=>{
      // REVIEW: Could multiple requests occur in the same millisecond?
      const tracker: Tracker = Date.now().toString();
      this.trackedChangeRequests.set(tracker, { resolve, reject });
      this.trackedChangeResponses.set(tracker, { changes: [], undoChangeRequests: [] });
      options = { tracker, ...options };
      this.sendChangeRequests(changeRequests, options);
    });
  }

  public useTool(id: StyleId): void {
    const msg: UseTool = { type: 'useTool', notebookPath: this.notebookPath, styleId: id };
    this.socket.sendMessage(msg);
  }

  // Server Message Event Handlers

  public smChange(msg: NotebookChanged): void {

    // Apply changes to the notebook data structure, and notify the view of the change.
    // If the change is not a delete, then update the data structure first, then notify the view.
    // Otherwise, notify the view of the change, then update the data structure.
    // (The view needs to trace the deleted style or relationship to the top-level style to
    //  determine what cell to update. If the style has been deleted from the notebook already
    //  then it cannot do that.)
    for (const change of msg.changes) {
      const isDelete = (change.type == 'relationshipDeleted' || change.type == 'styleDeleted');
      if (!isDelete) { this.applyChange(change); }
      try {
        this.notebookView.smChange(change);
      } catch(err) {
        console.error(`Error applying change to notebookView: "${err.message}", ${JSON.stringify(change)}`);
      }
      if (isDelete) { this.applyChange(change); }
    }

    // Update the notebooks view
    // REVIEW: Might we want to postpone updating the view until the tracker promises are resolved?
    this.notebookView.updateView();

    // If the changes were tracked then accumulate the changes
    // and resolve the tracking promise if complete.
    if (msg.tracker) {
      const previousResults = this.trackedChangeResponses.get(msg.tracker);
      if (!previousResults) { throw new Error("No previous results for tracker."); }
      previousResults.changes = previousResults.changes.concat(msg.changes);
      if (msg.undoChangeRequests) {
        previousResults.undoChangeRequests = previousResults.undoChangeRequests.concat(msg.undoChangeRequests);
      }
      if (msg.complete) {
        this.trackedChangeResponses.delete(msg.tracker);
        const fns = this.trackedChangeRequests.get(msg.tracker);
        this.trackedChangeRequests.delete(msg.tracker);
        if (!fns) { throw new Error(`Missing tracker promise functions for ${msg.tracker}`); }
        // REVIEW: Is there any way the promise could be rejected?
        fns.resolve(previousResults);
      }
    }
  }

  public smClose(): void { return this.close(); }

  // -- PRIVATE --

  // Private Class Properties

  private static notebooks: Map<NotebookPath, ClientNotebook> = new Map();

  // Private Constructor

  private constructor(socket: ServerSocket, notebookPath: NotebookPath, obj: NotebookObject) {
    super(obj);
    this.socket = socket;
    this.notebookPath = notebookPath;
    this.trackedChangeRequests = new Map();
    this.trackedChangeResponses = new Map();
  }

  // Private Instance Properties

  private notebookPath: NotebookPath;
  // REVIEW: Could there be more than one notebookView attached to this openNotebook?
  private notebookView!: NotebookView;
  private socket: ServerSocket;
  private trackedChangeRequests: Map<Tracker, { resolve: (results: TrackedChangesResults)=>void, reject: (reason: any)=>void }>;
  private trackedChangeResponses: Map<Tracker, TrackedChangesResults>;

  // Private Instance Methods

  // Private Change Event Handlers

}
