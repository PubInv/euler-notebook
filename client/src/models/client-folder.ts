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

import { assert, assertFalse, ClientId } from "../shared/common";
import { FolderPath, NotebookName, FolderName, FolderEntry, NotebookEntry, Folder } from "../shared/folder";
import {
  FolderChangeRequest, ChangeFolder, OpenFolder,
  FolderCreateRequest, NotebookCreateRequest, FolderDeleteRequest, NotebookDeleteRequest, FolderRenameRequest, NotebookRenameRequest
} from "../shared/client-requests";
import {
  FolderUpdated, FolderResponse, FolderOpened, FolderClosed, FolderCollaboratorConnected, FolderCollaboratorDisconnected,
  FolderUpdate, FolderCreated, NotebookCreated, FolderRenamed, NotebookRenamed, FolderDeleted, NotebookDeleted,
} from "../shared/server-responses"
import { folderUpdateSynopsis } from "../shared/debug-synopsis";

import { appInstance } from "../app";
import { CollaboratorObject } from "../shared/user";
import { logWarning } from "../error-handler";

// Types

export interface FolderWatcher {
  onUpdate(update: FolderUpdate, ownRequest?: boolean): void
  onClosed(reason: string): void;
  onCollaboratorConnected(msg: FolderCollaboratorConnected): void;
  onCollaboratorDisconnected(msg: FolderCollaboratorDisconnected): void;
}

interface OpenInfo {
  promise: Promise<ClientFolder>;
  watchers: Set<FolderWatcher>;
}

// Constants

const MAX_UNTITLED_COUNT = 99;

// Global Variables

// Class

export class ClientFolder extends Folder {

  // Public Class Properties

  // Public Class Property Functions

  // Public Class Methods

  public static async open(path: FolderPath, watcher: FolderWatcher): Promise<ClientFolder> {
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
    };
    return openInfo.promise;
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

  public close(watcher: FolderWatcher): void {
    assert(!this.terminated);
    const had = this.watchers.delete(watcher);
    assert(had);
    if (this.watchers.size == 0) {
      // LATER: Set timer to destroy in the future.
      this.terminate("Closed by all clients");
    }
  }

  public async newFolderRequest(): Promise<FolderEntry> {
    const name = this.getUntitledFolderName();
    const changeRequest: FolderCreateRequest = { type: 'createFolder', name };
    const change = await this.sendChangeRequest<FolderCreated>(changeRequest);
    return change.entry;
  }

  public async newNotebookRequest(): Promise<NotebookEntry> {
    const name = this.getUntitledNotebookName();
    const changeRequest: NotebookCreateRequest = { type: 'createNotebook', name };
    const change = await this.sendChangeRequest<NotebookCreated>(changeRequest);
    return change.entry;
  }

  public async removeFolderRequest(name: FolderName): Promise<void> {
    assert(this.hasFolderNamed(name, true));
    const changeRequest: FolderDeleteRequest = { type: 'deleteFolder', name };
    const change = await this.sendChangeRequest<FolderDeleted>(changeRequest);
    assert(change.type == 'folderDeleted');
  }

  public async removeNotebookRequest(name: NotebookName): Promise<void> {
    assert(this.hasNotebookNamed(name, true));
    const changeRequest: NotebookDeleteRequest = { type: 'deleteNotebook', name };
    const change = await this.sendChangeRequest<NotebookDeleted>(changeRequest);
    assert(change.type == 'notebookDeleted');
  }

  public async renameFolderRequest(name: FolderName, newName: FolderName): Promise<FolderRenamed> {
    assert(this.hasFolderNamed(name, true));
    const changeRequest: FolderRenameRequest = { type: 'renameFolder', name, newName };
    const change = await this.sendChangeRequest<FolderRenamed>(changeRequest);
    assert(change.type == 'folderRenamed');
    return change;
  }

  public async renameNotebookRequest(name: NotebookName, newName: NotebookName): Promise<NotebookRenamed> {
    assert(this.hasNotebookNamed(name, true));
    const changeRequest: NotebookRenameRequest = { type: 'renameNotebook', name, newName };
    const change = await this.sendChangeRequest<NotebookRenamed>(changeRequest);
    assert(change.type == 'notebookRenamed');
    return change;
  }

  // -- PRIVATE --

  // Private Class Properties

  private static openMap = new Map<FolderPath, OpenInfo>();
  private static instanceMap = new Map<FolderPath, ClientFolder>();

  // Private Class Property Functions

  private static getInstance(path: FolderPath): ClientFolder {
    const instance = this.instanceMap.get(path)!;
    assert(instance);
    return instance;
  }

  // Private Class Methods

  private static async openFirst(path: FolderPath): Promise<ClientFolder> {
    const message: OpenFolder = { type: 'folder', operation: 'open', path };
    const responseMessages = await appInstance.socket.sendRequest<FolderOpened>(message);
    assert(responseMessages.length == 1);
    const responseMessage = responseMessages[0];
    const instance = new this(path, responseMessage);
    this.instanceMap.set(path, instance);
    return instance;
  }

  // Private Class Event Handlers

  // Private Constructor

  private constructor(path: FolderPath, msg: FolderOpened) {
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

  private get watchers(): Set<FolderWatcher> {
    const openInfo = ClientFolder.openMap.get(this.path)!;
    assert(openInfo);
    return openInfo.watchers;
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
    ClientFolder.instanceMap.delete(this.path);
    ClientFolder.openMap.delete(this.path);
    for (const watcher of this.watchers) { watcher.onClosed(reason); }
  }

  // Private Instance Event Handlers

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

  protected /* override */ onUpdate(update: FolderUpdate, ownRequest?: boolean): void {
    // Process an individual update from the server.
    debug(`onUpdate ${folderUpdateSynopsis(update)}`);

    // Update the folder data structure
    super.onUpdate(update);

    // // Update our extensions to the folder data structure.
    // switch (update.type) {
    // }

    // Notify folder watchers of the update.
    for (const watcher of this.watchers) {
      watcher.onUpdate(update, ownRequest);
    }
  }

  private onUpdated(msg: FolderUpdated, ownRequest: boolean): void {
    // Message from the server indicating the folder has changed.
     // Dispatch each update in turn.
     for (const update of msg.updates) {
      this.onUpdate(update, ownRequest);
    }
  }

}
