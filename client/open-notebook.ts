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

// import { $ } from './dom.js';
import { assert } from './common.js';
import { NotebookChanged, NotebookName, Tracker, NotebookChangeRequest, ChangeNotebook, UseTool, ChangeNotebookOptions, } from './math-tablet-api.js';
import { Notebook, NotebookObject, NotebookChange, StyleId } from './notebook.js';
import { NotebookView } from './notebook-view.js';
import { ServerSocket } from './server-socket.js';

// Types

export interface TrackedChangesResults {
  changes: NotebookChange[];
  undoChangeRequests: NotebookChangeRequest[];
}

// Constants

// Global Variables

// Class

// TODO: Rename to "ClientNotebook" to parallel "ServerNotebook"
export class OpenNotebook extends Notebook {

  // Class Methods

  public static create(socket: ServerSocket, notebookName: NotebookName, obj: NotebookObject): OpenNotebook {
    assert(!this.notebooks.has(notebookName));
    const instance = new this(socket, notebookName, obj);
    this.notebooks.set(notebookName, instance);
    return instance;
  }

  public static open(socket: ServerSocket, notebookName: NotebookName, tDoc: NotebookObject): OpenNotebook {
    return this.notebooks.get(notebookName) || this.create(socket, notebookName, tDoc);
  }

  public static get(notebookName: NotebookName): OpenNotebook|undefined {
    return this.notebooks.get(notebookName);
  }

  // Instance Properties

  public notebookName: NotebookName;

  // Instance Property Methods

  // Instance Methods

  // REVIEW: When is this called?
  public close() {
    // TODO: mark closed?
    OpenNotebook.notebooks.delete(this.notebookName);
  }

  public connect(notebookView: NotebookView): void {
    this.notebookView = notebookView;
  }

  public sendChangeRequest(changeRequest: NotebookChangeRequest, options: ChangeNotebookOptions): void {
    this.sendChangeRequests([ changeRequest ], options);
  }

  public sendChangeRequests(changeRequests: NotebookChangeRequest[], options: ChangeNotebookOptions): void {
    if (changeRequests.length == 0) { return; }
    const msg: ChangeNotebook = {
      type: 'changeNotebook',
      notebookName: this.notebookName,
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
    const msg: UseTool = { type: 'useTool', notebookName: this.notebookName, styleId: id };
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
      if (change.type != 'relationshipDeleted' && change.type != 'styleDeleted') {
        this.applyChange(change);
        this.notebookView.smChange(change);
      } else {
        this.notebookView.smChange(change);
        this.applyChange(change);
      }
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
      previousResults.undoChangeRequests = previousResults.undoChangeRequests.concat(msg.undoChangeRequests!);
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

  private static notebooks: Map<NotebookName, OpenNotebook> = new Map();

  // Private Constructor

  private constructor(socket: ServerSocket, notebookName: NotebookName, obj: NotebookObject) {
    super(obj);
    this.socket = socket;
    this.notebookName = notebookName;
    this.trackedChangeRequests = new Map();
    this.trackedChangeResponses = new Map();
  }

  // Private Instance Properties

  // REVIEW: Could there be more than one notebookView attached to this openNotebook?
  private notebookView!: NotebookView;
  private socket: ServerSocket;
  private trackedChangeRequests: Map<Tracker, { resolve: (results: TrackedChangesResults)=>void, reject: (reason: any)=>void }>;
  private trackedChangeResponses: Map<Tracker, TrackedChangesResults>;

  // Private Instance Methods

  // Private Change Event Handlers

}
