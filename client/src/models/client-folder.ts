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

import { FolderPath, NotebookName, FolderName, FolderEntry, NotebookEntry, Folder } from "../shared/folder";
import {
  FolderChangeRequest, ChangeFolder, OpenFolder,
  FolderCreateRequest, NotebookCreateRequest, FolderDeleteRequest, NotebookDeleteRequest, FolderRenameRequest, NotebookRenameRequest
} from "../shared/client-requests";
import {
  FolderUpdated, FolderResponse, FolderOpened, FolderClosed, FolderCollaboratorConnected, FolderCollaboratorDisconnected,
  FolderUpdate, FolderCreated, NotebookCreated, FolderRenamed, NotebookRenamed, FolderDeleted, NotebookDeleted,
} from "../shared/server-responses"

import { appInstance } from "../app";
import { assert, assertFalse, ClientId } from "../shared/common";
import { CollaboratorObject } from "../shared/user";
import { logWarning } from "../error-handler";

// Types

interface InstanceInfo {
  instance?: ClientFolder;
  openPromise: Promise<ClientFolder>;
  openTally: number;
  watchers: Set<ClientFolderWatcher>;
}

export interface ClientFolderWatcher {
  onChange(change: FolderUpdate, ownRequest: boolean): void
  // onChanged(msg: FolderUpdated): void;
  onClosed(reason: string): void;
  onCollaboratorConnected(msg: FolderCollaboratorConnected): void;
  onCollaboratorDisconnected(msg: FolderCollaboratorDisconnected): void;
}

export interface OpenFolderOptions {
  watcher?: ClientFolderWatcher;
}

// Constants

const MAX_UNTITLED_COUNT = 99;

// Global Variables

// Class

export class ClientFolder extends Folder {

  // Public Class Properties

  // Public Class Property Functions

  // Public Class Methods

  public static async open(path: FolderPath, options: OpenFolderOptions): Promise<ClientFolder> {
    let info = this.instanceMap.get(path);
    if (info) {
      info.openTally++;
    } else {
      info = {
        openPromise: this.openFirst(path, options),
        openTally: 1,
        watchers: new Set(),
      };
      this.instanceMap.set(path, info);
    };
    if (options.watcher) { info.watchers.add(options.watcher); }
    return info.openPromise;
  }

  private static async openFirst(path: FolderPath, _options: OpenFolderOptions): Promise<ClientFolder> {
    const message: OpenFolder = { type: 'folder', operation: 'open', path };
    const responseMessages = await appInstance.socket.sendRequest<FolderOpened>(message);
    assert(responseMessages.length == 1);
    // REVIEW: validate folderObject?
    const info = this.getInfo(path);
    assert(info);
    const instance = info.instance = new this(path, responseMessages[0]);
    return instance;
  }

  // Public Class Event Handlers

  public static onServerResponse(msg: FolderResponse, ownRequest: boolean): void {
    // Opened response is handled when request promise is resolved.
    // All other responses are forwarded to the instance.
    if (msg.operation == 'opened') { return; }
    const instance = this.getInstance(msg.path);
    instance.onServerResponse(msg, ownRequest);
  }

  // Public Instance Properties

  // Public Instance Property Functions

  public get collaborators(): IterableIterator<CollaboratorObject> {
    return this.collaboratorMap.values();
  }

  // Public Instance Methods

  public /* override */ applyChange(change: FolderUpdate, ownRequest: boolean): void {
    // Send deletion change notifications.
    // Deletion change notifications are sent before the change happens so the watcher can
    // examine the style or relationship being deleted before it disappears from the notebook.
    const notifyBefore = (change.type == 'folderDeleted' || change.type == 'notebookDeleted');
    if (notifyBefore) {
      for (const watcher of this.watchers) { watcher.onChange(change, ownRequest); }
    }

    super.applyChange(change, ownRequest);

    // Send non-deletion change notification.
    if (!notifyBefore) {
      for (const watcher of this.watchers) { watcher.onChange(change, ownRequest); }
    }
  }

  public close(watcher?: ClientFolderWatcher): void {
    assert(!this.terminated);
    const info = ClientFolder.instanceMap.get(this.path)!;
    assert(info);
    if (watcher) {
      const had = info.watchers.delete(watcher);
      assert(had);
    }
    info.openTally--;
    if (info.openTally == 0) {
      // LATER: Set timer to destroy in the future.
      this.terminate("Closed by all clients");
    }
  }

  public async newFolder(): Promise<FolderEntry> {
    const name = this.getUntitledFolderName();
    const changeRequest: FolderCreateRequest = { type: 'createFolder', name };
    const change = await this.sendChangeRequest<FolderCreated>(changeRequest);
    return change.entry;
  }

  public async newNotebook(): Promise<NotebookEntry> {
    const name = this.getUntitledNotebookName();
    const changeRequest: NotebookCreateRequest = { type: 'createNotebook', name };
    const change = await this.sendChangeRequest<NotebookCreated>(changeRequest);
    return change.entry;
  }

  public async removeFolder(name: FolderName): Promise<void> {
    assert(this.hasFolderNamed(name, true));
    const changeRequest: FolderDeleteRequest = { type: 'deleteFolder', name };
    const change = await this.sendChangeRequest<FolderDeleted>(changeRequest);
    assert(change.type == 'folderDeleted');
  }

  public async removeNotebook(name: NotebookName): Promise<void> {
    assert(this.hasNotebookNamed(name, true));
    const changeRequest: NotebookDeleteRequest = { type: 'deleteNotebook', name };
    const change = await this.sendChangeRequest<NotebookDeleted>(changeRequest);
    assert(change.type == 'notebookDeleted');
  }

  public async renameFolder(name: FolderName, newName: FolderName): Promise<FolderRenamed> {
    assert(this.hasFolderNamed(name, true));
    const changeRequest: FolderRenameRequest = { type: 'renameFolder', name, newName };
    const change = await this.sendChangeRequest<FolderRenamed>(changeRequest);
    assert(change.type == 'folderRenamed');
    return change;
  }

  public async renameNotebook(name: NotebookName, newName: NotebookName): Promise<NotebookRenamed> {
    assert(this.hasNotebookNamed(name, true));
    const changeRequest: NotebookRenameRequest = { type: 'renameNotebook', name, newName };
    const change = await this.sendChangeRequest<NotebookRenamed>(changeRequest);
    assert(change.type == 'notebookRenamed');
    return change;
  }

  // -- PRIVATE --

  // Private Class Properties

  private static instanceMap = new Map<FolderPath, InstanceInfo>();

  // Private Class Property Functions

  private static getInfo(path: FolderPath): InstanceInfo {
    const rval = this.instanceMap.get(path)!;
    assert(rval);
    return rval;
  }

  private static getInstance(path: FolderPath): ClientFolder {
    const info = this.getInfo(path);
    assert(info.instance);
    return info.instance!;
  }

  // Private Class Methods

  // Private Class Event Handlers

  // Private Constructor

  private constructor(
    path: FolderPath,
    msg: FolderOpened,
  ) {
    super(path, msg.obj);
    this.collaboratorMap = new Map();
    for (const collaborator of msg.collaborators) {
      this.collaboratorMap.set(collaborator.clientId, collaborator);
    }
  }

  // Private Instance Properties

  private readonly collaboratorMap: Map<ClientId, CollaboratorObject>;
  private terminated?: boolean;

  // Private Instance Property Functions

  private get watchers(): IterableIterator<ClientFolderWatcher> {
    const info = ClientFolder.getInfo(this.path);
    return info.watchers.values();
  }

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

  private async sendChangeRequest<T extends FolderUpdate>(changeRequest: FolderChangeRequest): Promise<T> {
    const changes = await this.sendChangeRequests([ changeRequest ]);
    assert(changes.length == 1);
    return <T>changes[0];
  }

  private async sendChangeRequests(changeRequests: FolderChangeRequest[]): Promise<FolderUpdate[]> {
    assert(!this.terminated);
    assert(changeRequests.length>0);
    const msg: ChangeFolder = {
      type: 'folder',
      operation: 'change',
      path: this.path,
      changeRequests,
    }
    const responseMessages = await appInstance.socket.sendRequest<FolderUpdated>(msg);
    assert(responseMessages.length == 1);
    return responseMessages[0].updates;
  }

  private terminate(reason: string): void {
    assert(!this.terminated);
    this.terminated = true;
    const info = ClientFolder.getInfo(this.path);
    ClientFolder.instanceMap.delete(this.path);
    for (const watcher of info.watchers) { watcher.onClosed(reason); }
  }

  // Private Event Handlers

  private onClosed(msg: FolderClosed, _ownRequest: boolean): void {
    // Message from the server that the folder has been closed by the server.
    // For example, if the folder was deleted or moved.
    this.terminate(msg.reason);
  }

  private onCollaboratorConnected(msg: FolderCollaboratorConnected): void {
    // Message from the server indicating a user has connected to the notebook.
    const clientId = msg.obj.clientId;
    if (this.collaboratorMap.has(clientId)) {
      logWarning(`Ignoring duplicate collaborator connected message for folder: ${clientId} ${this.path}`);
      return;
    }
    this.collaboratorMap.set(clientId, msg.obj);
    for (const watcher of this.watchers) { watcher.onCollaboratorConnected(msg); }
  }

  private onCollaboratorDisconnected(msg: FolderCollaboratorDisconnected): void {
    // Message from the server indicating a user has connected to the notebook.
    const clientId = msg.clientId;
    if (!this.collaboratorMap.has(clientId)) {
      logWarning(`Ignoring duplicate collaborator disconnected message for folder: ${clientId} ${this.path}`);
      return;
    }
    this.collaboratorMap.delete(clientId);
    for (const watcher of this.watchers) { watcher.onCollaboratorDisconnected(msg); }
  }

  private onServerResponse(msg: FolderResponse, ownRequest: boolean): void {
    // A folder message was received from the server.
    switch(msg.operation) {
      case 'closed':  this.onClosed(msg, ownRequest); break;
      case 'collaboratorConnected':     this.onCollaboratorConnected(msg); break;
      case 'collaboratorDisconnected':  this.onCollaboratorDisconnected(msg); break;
      case 'updated': this.onUpdated(msg, ownRequest); break;
      case 'opened':
      default: assertFalse();
    }
  }

  private onUpdated(msg: FolderUpdated, ownRequest: boolean): void {
    // Message from the server indicating the folder has changed.

    // Apply changes to the notebook data structure, and notify the view of the change.
    // If the change is not a delete, then update the data structure first, then notify the view.
    // Otherwise, notify the view of the change, then update the data structure.
    for (const change of msg.updates) {
      this.applyChange(change, ownRequest);
    }

    // REVIEW: Notify watchers?
  }

}
