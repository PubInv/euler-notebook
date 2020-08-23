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

import { Folder, FolderObject, FolderPath, NotebookName, FolderName, FolderChange, NotebookPath, FolderCreated, NotebookCreated } from './shared/folder';
import {
  FolderChangeRequest, ClientFolderChangeMessage, ServerFolderChangedMessage, ClientFolderOpenMessage,
  ServerFolderMessage, ServerFolderOpenedMessage, ServerFolderClosedMessage, ClientFolderCloseMessage, FolderCreateRequest, NotebookCreateRequest, FolderDeleteRequest, NotebookDeleteRequest
} from './shared/math-tablet-api';

import { appInstance } from './app';
import { assert } from './shared/common';

// Types

interface InstanceInfo {
  instance?: ClientFolder;
  promise: Promise<ClientFolder>;           // Promise for the instance returned from 'open'.
  watchers: Set<Watcher>;
}

export interface Watcher {
  onChange(change: FolderChange): void;
  onChangesComplete(): void;
  onClosed(): void; // TODO: implement.
}

// Constants

const MAX_UNTITLED_COUNT = 99;

// Global Variables

// Class

export class ClientFolder extends Folder {

  // Public Class Methods

  private static async open(path: FolderPath): Promise<ClientFolder> {
    const msg: ClientFolderOpenMessage = { type: 'folder', operation: 'open', path };
    const response = await appInstance.socket.sendRequest<ServerFolderOpenedMessage>(msg);
    const info = this.instanceMap.get(path)!;
    assert(info);
    const instance = info.instance = new this(msg.path, response.obj);
    return instance;
  }

  public static watch(path: FolderPath, watcher: Watcher): Promise<ClientFolder> {
    let info = this.instanceMap.get(path);
    if (!info) {
      const watchers = new Set([watcher]);
      const promise = this.open(path);
      info = { promise, watchers };
      this.instanceMap.set(path, info);
    } else {
      info.watchers.add(watcher);
    }
    return info.promise;
  }

  // Class Event Handlers

  public static onMessage(msg: ServerFolderMessage): void {
    // A folder message was received from the server.
    switch(msg.operation) {
      case 'changed': this.onChanged(msg); break;
      case 'closed':  this.onClosed(msg); break;
      default: assert(false); break;
    }
  }

  // Public Instance Properties

  public path: FolderPath;

  // Public Instance Property Functions

  // Public Instance Methods

  public async newFolder(): Promise<FolderPath> {
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
    this.onChanged(response);
    assert(response.changes.length == 1);
    assert(response.changes[0].type == 'folderCreated');
    const change = <FolderCreated>response.changes[0];
    return change.entry.path;
  }

  public async newNotebook(): Promise<NotebookPath> {
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
    this.onChanged(response);
    assert(response.changes.length == 1);
    assert(response.changes[0].type == 'notebookCreated');
    const change = <NotebookCreated>response.changes[0];
    return change.entry.path;
  }

  public async removeFolder(name: FolderName): Promise<void> {
    assert(!this.closed);
    assert(this.folders.find(entry=>entry.name==name));
    const changeRequest: FolderDeleteRequest = { type: 'deleteFolder', name };
    const change = await this.sendChangeRequest(changeRequest);
    assert(change.type == 'folderDeleted');
  }

  public async removeNotebook(name: NotebookName): Promise<void> {
    assert(!this.closed);
    assert(this.notebooks.find(entry=>entry.name==name));
    const changeRequest: NotebookDeleteRequest = { type: 'deleteNotebook', name };
    const change = await this.sendChangeRequest(changeRequest);
    assert(change.type == 'notebookDeleted');
  }

  public unwatch(watcher: Watcher): void {
    assert(!this.closed);
    const info = ClientFolder.instanceMap.get(this.path)!;
    assert(info);
    const had = info.watchers.delete(watcher);
    assert(had);
    if (info.watchers.size == 0) {
      // TODO: this.close();

      // Nothing is watching this folder any more so we can close it.
      // REVIEW: In the future we could delay this a while in case the folder is reopened in the near future.
      ClientFolder.instanceMap.delete(this.path);
      this.closed = true;
      const msg: ClientFolderCloseMessage = { type: 'folder', operation: 'close', path: this.path };
      appInstance.socket.sendMessage(msg);
    }
  }

  // -- PRIVATE --

  // Private Class Properties

  private static instanceMap: Map<FolderPath, InstanceInfo> = new Map();

  // Private Class Methods

  private static onChanged(msg: ServerFolderChangedMessage): void {
    // A change message has come in that was not from our own change request.
    const info = this.instanceMap.get(msg.path);
    assert(info && info.instance);
    info!.instance!.onChanged(msg);
  }

  private static onClosed(msg: ServerFolderClosedMessage): void {
    const info = this.instanceMap.get(msg.path);
    assert(info && info.instance);
    this.instanceMap.delete(msg.path);
    info!.instance!.onClosed(msg);
  }

  // Private Constructor

  private constructor(path: FolderPath, obj: FolderObject) {
    super(obj);
    this.path = path;
  }

  // Private Instance Properties

  private closed?: boolean;

  // Private Instance Property Functions

  private hasFolderNamed(name: FolderName): boolean {
    // I18N:
    return !!this.folders.find(e=>name.localeCompare(e.name, 'en', { sensitivity: 'base' })==0);
  }

  private hasNotebookNamed(name: NotebookName): boolean {
    // I18N:
    return !!this.notebooks.find(e=>name.localeCompare(e.name, 'en', { sensitivity: 'base' })==0);
  }

  private get watchers(): IterableIterator<Watcher> {
    return ClientFolder.instanceMap.get(this.path)!.watchers.values();
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

  private async sendChangeRequest(changeRequest: FolderChangeRequest): Promise<FolderChange> {
    const changes = await this.sendChangeRequests([ changeRequest ]);
    assert(changes.length == 1);
    return changes[0];
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
    this.onChanged(response);
    return response.changes;
  }

  // Private Event Handlers

  private onChanged(msg: ServerFolderChangedMessage): void {
    // Message from the server indicating the folder has changed.

    // Apply changes to the notebook data structure, and notify the view of the change.
    // If the change is not a delete, then update the data structure first, then notify the view.
    // Otherwise, notify the view of the change, then update the data structure.
    // (The view needs to trace the deleted style or relationship to the top-level style to
    //  determine what cell to update. If the style has been deleted from the notebook already
    //  then it cannot do that.)
    for (const change of msg.changes) {
      this.applyChange(change);
      for (const watcher of this.watchers) {
        watcher.onChange(change);
      }
    }
    for (const watcher of this.watchers) {
      watcher.onChangesComplete();
    }
  }

  private onClosed(_msg: ServerFolderClosedMessage): void {
    // The folder was closed from the server side.
    // Notify our watchers, then
    for (const watcher of this.watchers) { watcher.onClosed(); }
    ClientFolder.instanceMap.get(this.path)!.watchers.clear();
    this.closed = true;
  }

}
