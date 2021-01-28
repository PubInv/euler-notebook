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

// TODO: Watch folder on disk. Generate change notifications if things are created, deleted, or renamed.
// TODO: Folder lifecycle. When and how are folders that are no longer used cleaned up?
// REVIEW: Where should we be checking if this.terminated is set?

// Requirements

import * as debug1 from "debug";
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

import { assert, ExpectedError } from "../shared/common";
import {
  Folder, FolderEntry, FolderName, FolderObject, FolderPath, FOLDER_PATH_RE, NotebookEntry,
  NotebookName, NotebookPath, FolderWatcher,
} from "../shared/folder";
import { ChangeFolder, CloseFolder, FolderRequest, OpenFolder, RequestId } from "../shared/client-requests";
import { FolderUpdated, FolderOpened, FolderResponse, FolderUpdate, FolderCollaboratorDisconnected, FolderCollaboratorConnected } from "../shared/server-responses";
import { UserPermission } from "../shared/permissions";

import { createDirectory, deleteDirectory, readDirectory, renameDirectory } from "../adapters/file-system";
import { ServerNotebook, notebookPath } from "./server-notebook";
import { OpenOptions } from "../shared/watched-resource";
import { logWarning } from "../error-handler";
import { ServerSocket } from "./server-socket";
import { Permissions } from "./permissions";
import { CollaboratorObject } from "../shared/user";

// Types

export interface OpenFolderOptions extends OpenOptions<ServerFolderWatcher> {
  ephemeral?: boolean;    // true iff notebook not persisted to the file system and disappears after last close.
}

export interface ServerFolderWatcher extends FolderWatcher {
  onChanged(msg: FolderUpdated): void;
}

// Exported Class

export class ServerFolder extends Folder<ServerFolderWatcher> {

  // Public Class Properties

  public static nameFromPath(path: FolderPath): FolderName {
    const match = FOLDER_PATH_RE.exec(path);
    if (!match) { throw new Error(`Invalid folder path: ${path}`); }
    return <FolderName>match[2] || 'Root'; // REVIEW: Could use user name for the Root folder?
  }

  // Public Class Property Functions

  // Public Class Methods

  public static async createOnDisk(path: FolderPath, permissions: Permissions): Promise<void> {
    await createDirectory(path);
    await Permissions.createOnDisk(path, permissions);
  }

  // Public Class Properties

  public static get allInstances(): ServerFolder[] /* LATER: IterableIterator<ServerFolder> */{
    // LATER: ServerFolder.instanceMap should only have folders, not notebooks and folders.
    return <ServerFolder[]>Array.from(this.instanceMap.values()).filter(r=>r instanceof ServerFolder);
  }

  public static async delete(path: FolderPath): Promise<void> {
    this.close(path, "Folder is deleted"); // no-op if the folder is not open.
    deleteDirectory(path, false /* not recursive */);
  }

  public static async move(oldPath: FolderPath, newPath: FolderPath): Promise<FolderEntry> {
    // Called by the containing ServerFolder when one of its subfolders is renamed.
    await this.close(newPath, `Folder moving to ${newPath}`);
    // REVIEW: If there is an existing *file* (not directory) at the new path then it will be overwritten silently.
    //         However, we don't expect random files to be floating around out notebook storage filesystem.
    await renameDirectory(oldPath, newPath);
    return { path: newPath, name: this.nameFromPath(newPath) }
  }

  public static open(path: FolderPath, options: OpenFolderOptions): Promise<ServerFolder> {
    // IMPORTANT: This is a standard open pattern that all WatchedResource-derived classes should use.
    //            Do not modify unless you know what you are doing!
    const isOpen = this.isOpen(path);
    const instance = isOpen ? this.getInstance(path) : new this(path, options);
    instance.open(options, isOpen);
    return instance.openPromise;
  }

  public static validateFolderName(name: FolderName): void {
    if (!this.isValidFolderName(name)) { throw new Error(`Invalid folder name: ${name}`); }
  }

  // Public Class Event Handlers

  public static async onClientRequest(socket: ServerSocket, msg: FolderRequest): Promise<void> {
    // Called by ServerSocket when a client sends a folder request.
    let instance = </* TYPESCRIPT: shouldn't have to cast. */ServerFolder>this.instanceMap.get(msg.path);
    if (!instance && msg.operation == 'open') {
      instance = await this.open(msg.path, { mustExist: true });
    }
    assert(instance);
    await instance.onClientRequest(socket, msg);
  }

  public static onSocketClosed(socket: ServerSocket): void {
    // REVIEW: If the server has a large number of folder instances, then
    //         we may want to create a map from sockets to lists of folder instances
    //         so we can handle this more efficiently.
    for (const instance of this.allInstances) {
      if (instance.sockets.has(socket)) {
        instance.onSocketClosed(socket);
      }
    }
  }

  public static onSocketUserLogin(socket: ServerSocket): void {
    // Note: see note for onSocketClosed.
    for (const instance of this.allInstances) {
      if (instance.sockets.has(socket)) {
        instance.onSocketUserLogin(socket);
      }
    }
  }

  public static onSocketUserLogout(socket: ServerSocket): void {
    // Note: see note for onSocketClosed.
    for (const instance of this.allInstances) {
      if (instance.sockets.has(socket)) {
        instance.onSocketUserLogout(socket);
      }
    }
  }

  // Public Instance Methods

  // Public Event Handlers

  // --- PRIVATE ---

  // Private Class Properties

  // Private Class Property Functions

  protected static getInstance(path: FolderPath): ServerFolder {
    return <ServerFolder>super.getInstance(path);
  }

  // Private Class Methods

  // Private Class Event Handlers

  // Private Constructor

  private constructor(path: FolderPath, _options: OpenFolderOptions) {
    super(path);
    this.sockets = new Set<ServerSocket>();
  }

  // Private Instance Properties

  private permissions!: Permissions;
  private sockets: Set<ServerSocket>;

  // Private Instance Property Functions

  // Private Instance Methods

  protected async initialize(options: OpenFolderOptions): Promise<void> {
    if (options.mustExist) {
      const notebooks: NotebookEntry[] = [];
      const folders: FolderEntry[] = [];

      const suffix = ServerNotebook.NOTEBOOK_DIR_SUFFIX;
      const suffixLen = suffix.length;

      const dirMap = await readDirectory(this.path);
      for (const [filename, stats] of dirMap.entries()) {

        // Skip hidden files and folders
        if (filename.startsWith(".")) { /* skip hidden */ continue; }

        // Skip non-directories
        if (!stats.isDirectory()) { continue; }

        // Notebooks are directories that end with .enb.
        // Folders are all other directories.
        if (filename.endsWith(suffix)) {
          const nameWithoutSuffix: NotebookName = <NotebookName>filename.slice(0, -suffixLen);
          if (!ServerFolder.isValidNotebookName(nameWithoutSuffix)) {
            logWarning(MODULE, `Skipping notebook with invalid name: '${filename}'`);
            continue;
          }
          notebooks.push({ name: nameWithoutSuffix, path: <NotebookPath>`${this.path}${filename}` })
        } else {
          if (!ServerFolder.isValidFolderName(<FolderName>filename)) {
            logWarning(MODULE, `Skipping folder with invalid name: '${filename}'`);
            continue;
          }
          folders.push({ name: <FolderName>filename, path: <FolderPath>`${this.path}${filename}/` })
        }
      }

      const obj: FolderObject = {
        path: this.path,
        folders,
        notebooks,
      };
      this.initializeFromObject(obj);

      this.permissions = await Permissions.load(this.path);
    } else {
      assert(false);
    }
  }

  private removeSocket(socket: ServerSocket): void {
    const hadSocket = this.sockets.delete(socket);
    assert(hadSocket);
    if (this.sockets.size == 0) {
      // TODO: purge this folder immediately or set a timer to purge it in the near future.
      console.warn(`Last socket removed from folder: "${this.path}"`)
    }
  }

  private sendCollaboratorConnectedMessage(socket: ServerSocket): void {
    const user = socket.user;
    if (!user) { return; }
    const collaboratorObj: CollaboratorObject = {
      clientId: socket.clientId,
      userId: user.id,
      userName: user?.userName,
    };
    const response2: FolderCollaboratorConnected = {
      type: 'folder',
      operation: 'collaboratorConnected',
      path: this.path,
      obj: collaboratorObj,
    };
    for (const otherSocket of this.sockets) {
      if (otherSocket === socket || !otherSocket.user) { continue; }
      otherSocket.sendMessage(response2);
    }
  }

  private sendCollaboratorDisconnectedMessage(socket: ServerSocket): void {
    const user = socket.user;
    if (!user) { return; }
    const response2: FolderCollaboratorDisconnected = {
      type: 'folder',
      operation: 'collaboratorDisconnected',
      path: this.path,
      clientId: socket.clientId,
    };
    for (const otherSocket of this.sockets) {
      if (otherSocket === socket || !otherSocket.user) { continue; }
      otherSocket.sendMessage(response2);
    }
  }

  private sendUpdateToAllSockets(update: FolderResponse, originatingSocket?: ServerSocket, requestId?: RequestId): void {
    for (const socket of this.sockets) {
      if (socket === originatingSocket) {
        socket.sendMessage({ requestId, ...update });
      } else {
        socket.sendMessage(update);
      }
    }
  }

  protected terminate(reason: string): void {
    super.terminate(reason);
  }

  // Private Instance Event Handlers

  private async onClientRequest(socket: ServerSocket, msg: FolderRequest): Promise<void> {
    assert(!this.terminated);
    switch(msg.operation) {
      case 'change': await this.onChangeRequest(socket, msg); break;
      case 'close':  this.onCloseRequest(socket, msg); break;
      case 'open':   this.onOpenRequest(socket, msg); break;
      default:       assert(false); break;
    }
  }

  private onSocketClosed(socket: ServerSocket): void {
    // NOTE: When *any* socket closes, this message is sent to *all* folders,
    //       so we need to check if we are actually interested in this socket.
    this.removeSocket(socket);
    this.sendCollaboratorDisconnectedMessage(socket);
  }

  private onSocketUserLogin(socket: ServerSocket): void {
    this.sendCollaboratorConnectedMessage(socket);
  }

  private onSocketUserLogout(socket: ServerSocket): void {
    this.sendCollaboratorDisconnectedMessage(socket);
  }

  // Client Message Event Handlers

  private async onChangeRequest(socket: ServerSocket, request: ChangeFolder): Promise<void> {
    // TODO: Undo?

    // Verify the user has permission to modify the folder.
    const user = socket.user;
    const permissions = this.permissions.getUserPermissions(user);
    if (!(permissions & UserPermission.Modify)) {
      const message = user ?
                      `You do not have permission to modify this folder.` :
                      `You must log in to modify this folder.`;
      throw new ExpectedError(message)
    }

    const changes: FolderUpdate[] = [];
    assert(request.changeRequests.length>0);
    for (const changeRequest of request.changeRequests) {
      let change: FolderUpdate;
      switch (changeRequest.type) {
        case 'createFolder': {
          const name = changeRequest.name;
          ServerFolder.validateFolderName(name)
          const path = childFolderPath(this.path, name);
          debug(`Creating folder: ${path}`);
          await ServerFolder.createOnDisk(path, this.permissions);
          change = { type: 'folderCreated', entry: { name, path }};
          break;
        }
        case 'createNotebook': {
          const name = changeRequest.name;
          ServerNotebook.validateNotebookName(name);
          const path = notebookPath(this.path, name);
          debug(`Creating notebook: ${path}`);
          await ServerNotebook.createOnDisk(path, this.permissions);
          change = { type: 'notebookCreated', entry: { name, path }};
          break;
        }
        case 'deleteFolder': {
          const name = changeRequest.name;
          const path = childFolderPath(this.path, name);
          ServerFolder.delete(path);
          change = { type: 'folderDeleted', entry: { name, path }};
          break;
        }
        case 'deleteNotebook': {
          const name = changeRequest.name;
          const path = notebookPath(this.path, name);
          await ServerNotebook.delete(path);
          change = { type: 'notebookDeleted', entry: { name, path }};
          break;
        }
        case 'renameFolder': {
          const oldName = changeRequest.name;
          const oldPath = childFolderPath(this.path, oldName);
          const newPath = childFolderPath(this.path, changeRequest.newName);
          const entry = await ServerFolder.move(oldPath, newPath);
          change = { type: 'folderRenamed', entry, oldName };
          break;
        }
        case 'renameNotebook': {
          const oldName = changeRequest.name;
          const oldPath = notebookPath(this.path, oldName);
          const newPath = notebookPath(this.path, changeRequest.newName);
          const entry = await ServerNotebook.move(oldPath, newPath);
          change = { type: 'notebookRenamed', entry, oldName };
          break;
        }
      }

      // REVIEW: Apply delete changes after notification?
      this.applyChange(change, false);
      changes.push(change);
    }
    const update: FolderUpdated = { type: 'folder', operation: 'updated', path: this.path, updates: changes, complete: true };
    this.sendUpdateToAllSockets(update, socket, request.requestId);
  }

  private onCloseRequest(socket: ServerSocket, _msg: CloseFolder): void {
    // NOTE: No response is expected for a close request.
    assert(this.sockets.has(socket));
    this.removeSocket(socket);
    this.sendCollaboratorDisconnectedMessage(socket);
  }

  private onOpenRequest(socket: ServerSocket, msg: OpenFolder): void {

    // Check if the user has permission to open this folder.
    const user = socket.user;
    const permissions = this.permissions.getUserPermissions(user);
    if (!(permissions & UserPermission.Read)) {
      const message = user ?
                      `This folder is not public and is not shared with you.` :
                      `You must log in to access this folder.`;
      throw new ExpectedError(message)
    }

    this.sockets.add(socket);

    // Send NotebookOpened message back to the requesting client.
    const obj = this.toJSON();
    const collaborators: CollaboratorObject[] = [];
    for (const otherSocket of this.sockets) {
      if (otherSocket == socket || !otherSocket.user) { continue; }
      const collaboratorObject: CollaboratorObject = {
        clientId: otherSocket.clientId,
        userId: otherSocket.user.id,
        userName: otherSocket.user.userName,
      };
      collaborators.push(collaboratorObject);
    }
    const response: FolderOpened = {
      requestId: msg.requestId,
      type: 'folder',
      operation: 'opened',
      path: this.path,
      collaborators,
      permissions,
      obj,
      complete: true
    };
    socket.sendMessage(response);

    this.sendCollaboratorConnectedMessage(socket);

  }

}

// Exported Functions

// REVIEW: Which of these should be class and instance methods or properties?

// Helper Functions

function childFolderPath(path: FolderPath, name: FolderName): FolderPath {
  return <FolderPath>`${path}${name}/`;
}

// function parentFolderPath(path: FolderPath): FolderPath {
//   if (<string>path == '/') { throw new Error("Root folder does not have a parent folder."); }
//   const pathSegments = path.split('/');
//   pathSegments.splice(-2, 1); // Modifies pathSegments as a side-effect.
//   return <FolderPath>pathSegments.join('/');
// }
