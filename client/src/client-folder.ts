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

import { Folder, FolderPath, NotebookName, FolderName, FolderChange, FolderCreated, NotebookCreated, FolderEntry, NotebookEntry, FolderRenamed, NotebookRenamed, FolderDeleted, NotebookDeleted, FolderWatcher } from "./shared/folder"
import {
  FolderChangeRequest, ClientFolderChangeMessage, ServerFolderChangedMessage, ClientFolderOpenMessage,
  ServerFolderMessage, ServerFolderOpenedMessage, ServerFolderClosedMessage, FolderCreateRequest, NotebookCreateRequest, FolderDeleteRequest, NotebookDeleteRequest, FolderRenameRequest, NotebookRenameRequest
} from "./shared/math-tablet-api"

import { appInstance } from "./app"
import { assert, assertFalse } from "./shared/common"
import { OpenOptions } from "./shared/watched-resource";

// Types

export interface ClientFolderWatcher extends FolderWatcher {
  onChangesFinished(): void;
}

export type OpenFolderOptions = OpenOptions<ClientFolderWatcher>;

// Constants

const MAX_UNTITLED_COUNT = 99;

// Global Variables

// Class

export class ClientFolder extends Folder<ClientFolderWatcher> {

  // Public Class Methods

  public static async open(path: FolderPath, options: OpenFolderOptions): Promise<ClientFolder> {
    // IMPORTANT: This is a standard open pattern that all WatchedResource-derived classes should use.
    //            Do not modify unless you know what you are doing!
    const isOpen = this.isOpen(path);
    const instance = isOpen ? this.getInstance(path) : new this(path, options);
    instance.open(options, isOpen);
    return instance.openPromise;
  }

  // Class Event Handlers

  public static smMessage(msg: ServerFolderMessage): void {
    // A folder message was received from the server.
    switch(msg.operation) {
      case 'changed': this.smChanged(msg); break;
      case 'closed':  this.smClosed(msg); break;
      default: assertFalse(); break;
    }
  }

  // Public Instance Properties

  // Public Instance Property Functions

  // Public Instance Methods

  public async newFolder(): Promise<FolderEntry> {
    assert(!this.closed);

    const name = this.getUntitledFolderName();
    const changeRequest: FolderCreateRequest = { type: 'createFolder', name };
    const msg: ClientFolderChangeMessage = {
      type: 'folder',
      operation: 'change',
      path: this.path,
      changeRequests: [ changeRequest ],
    };
    const response = await appInstance.socket.sendRequest<ServerFolderChangedMessage>(msg);
    // REVIEW: Change notification should not go out to watcher that requested the change.
    this.smChanged(response);
    assert(response.changes.length == 1);
    assert(response.changes[0].type == 'folderCreated');
    const change = <FolderCreated>response.changes[0];
    return change.entry;
  }

  public async newNotebook(): Promise<NotebookEntry> {
    assert(!this.closed);
    const name = this.getUntitledNotebookName();
    const changeRequest: NotebookCreateRequest = { type: 'createNotebook', name };
    const msg: ClientFolderChangeMessage = {
      type: 'folder',
      operation: 'change',
      path: this.path,
      changeRequests: [ changeRequest ],
    };
    const response = await appInstance.socket.sendRequest<ServerFolderChangedMessage>(msg);
    // REVIEW: Change notification should not go out to watcher that requested the change.
    this.smChanged(response);
    assert(response.changes.length == 1);
    assert(response.changes[0].type == 'notebookCreated');
    const change = <NotebookCreated>response.changes[0];
    return change.entry;
  }

  public async removeFolder(name: FolderName): Promise<void> {
    assert(!this.closed);
    assert(this.hasFolderNamed(name, true));
    const changeRequest: FolderDeleteRequest = { type: 'deleteFolder', name };
    const change = await this.sendChangeRequest<FolderDeleted>(changeRequest);
    assert(change.type == 'folderDeleted');
  }

  public async removeNotebook(name: NotebookName): Promise<void> {
    assert(!this.closed);
    assert(this.hasNotebookNamed(name, true));
    const changeRequest: NotebookDeleteRequest = { type: 'deleteNotebook', name };
    const change = await this.sendChangeRequest<NotebookDeleted>(changeRequest);
    assert(change.type == 'notebookDeleted');
  }

  public async renameFolder(name: FolderName, newName: FolderName): Promise<FolderRenamed> {
    assert(!this.closed);
    assert(this.hasFolderNamed(name, true));
    const changeRequest: FolderRenameRequest = { type: 'renameFolder', name, newName };
    const change = await this.sendChangeRequest<FolderRenamed>(changeRequest);
    assert(change.type == 'folderRenamed');
    return change;
  }

  public async renameNotebook(name: NotebookName, newName: NotebookName): Promise<NotebookRenamed> {
    assert(!this.closed);
    assert(this.hasNotebookNamed(name, true));
    const changeRequest: NotebookRenameRequest = { type: 'renameNotebook', name, newName };
    const change = await this.sendChangeRequest<NotebookRenamed>(changeRequest);
    assert(change.type == 'notebookRenamed');
    return change;
  }

  // -- PRIVATE --

  // Private Class Properties

  // Private Class Methods

  protected static getInstance(path: FolderPath): ClientFolder {
    return <ClientFolder>super.getInstance(path);
  }

  // Private Class Event Handlers

  private static smChanged(msg: ServerFolderChangedMessage): void {
    // A change message has come in that was not from our own change request.
    const instance = this.getInstance(msg.path);
    instance.smChanged(msg);
  }

  private static smClosed(msg: ServerFolderClosedMessage): void {
    // Message from the server that the folder has been closed by the server.
    // For example, if the folder was deleted or moved.
    const had = this.close(msg.path, msg.reason);
    assert(had);
  }

  // Private Constructor

  private constructor(path: FolderPath, _options: OpenFolderOptions) {
    super(path);
  }

  // Private Instance Properties

  private closed?: boolean;

  // Private Instance Property Functions

  // Private Instance Methods

  private getUntitledFolderName(): FolderName {
    // Returns "untitled_folder" if that name is not already used.
    // Otherwise, returns "untitled_folder_2", or "untitled_folder_3", etc.
    // Nearly identical implementation to getUntitledNotebookName.
    const baseName = <FolderName>"untitled_folder";
    if (!this.hasFolderNamed(baseName)) { return baseName; }
    else {
      for(let counter = 2; counter<MAX_UNTITLED_COUNT; counter++) {
        const derivedName = <FolderName>`${baseName}_${counter}`;
        if (!this.hasFolderNamed(derivedName)) { return derivedName; }
      }
      throw new Error("Maximum number of untitled folders reached.");
    }
  }

  private getUntitledNotebookName(): NotebookName {
    // Returns "untitled_notebook" if that name is not already used.
    // Otherwise, returns "untitled_notebook_2", or "untitled_notebook_3", etc.
    // Nearly identical implementation to getUntitledFolderName.
    const baseName = <NotebookName>"untitled_notebook";
    if (!this.hasNotebookNamed(baseName)) { return baseName; }
    else {
      for(let counter = 2; counter<MAX_UNTITLED_COUNT; counter++) {
        const derivedName = <NotebookName>`${baseName}_${counter}`;
        if (!this.hasNotebookNamed(derivedName)) { return derivedName; }
      }
      throw new Error("Maximum number of untitled folders reached.");
    }
  }

  protected async initialize(_options: OpenFolderOptions): Promise<void> {
    const message: ClientFolderOpenMessage = { type: 'folder', operation: 'open', path: this.path };
    const response = await appInstance.socket.sendRequest<ServerFolderOpenedMessage>(message);
    Folder.validateObject(response.obj);
    this.initializeFromObject(response.obj);
  }

  private async sendChangeRequest<T extends FolderChange>(changeRequest: FolderChangeRequest): Promise<T> {
    const changes = await this.sendChangeRequests([ changeRequest ]);
    assert(changes.length == 1);
    return <T>changes[0];
  }

  private async sendChangeRequests(changeRequests: FolderChangeRequest[]): Promise<FolderChange[]> {
    assert(!this.closed);
    assert(changeRequests.length>0); // was: if (changeRequests.length == 0) { return; }
    const msg: ClientFolderChangeMessage = {
      type: 'folder',
      operation: 'change',
      path: this.path,
      changeRequests,
    }
    const response = await appInstance.socket.sendRequest<ServerFolderChangedMessage>(msg);
    this.smChanged(response);
    return response.changes;
  }

  protected terminate(reason: string): void {
    super.terminate(reason);
  }

  // Private Event Handlers

  private smChanged(msg: ServerFolderChangedMessage): void {
    // Message from the server indicating the folder has changed.

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

  }

}
