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

import { assert, errorCode } from "../shared/common";
import { ExpectedError } from "../shared/expected-error";
import {
  Folder, FolderEntry, FolderName, FolderObject, FolderPath, NotebookEntry,
  NotebookName, NotebookPath, NOTEBOOK_DIR_SUFFIX, NOTEBOOK_DIR_SUFFIX_LENGTH,
} from "../shared/folder";
import { ChangeFolder, CloseFolder, FolderRequest, OpenFolder, RequestId } from "../shared/client-requests";
import { FolderUpdated, FolderOpened, FolderResponse, FolderUpdate, FolderCollaboratorDisconnected, FolderCollaboratorConnected } from "../shared/server-responses";
import { UserPermission } from "../shared/permissions";

import { createDirectory, deleteDirectory, FileName, readDirectory, renameDirectory } from "../adapters/file-system";
import { ServerNotebook, notebookPath } from "./server-notebook";
import { logWarning } from "../error-handler";
import { ServerSocket } from "./server-socket";
import { Permissions } from "./permissions";
import { CollaboratorObject } from "../shared/user";
import { Stats } from "fs";

// Types

interface OpenInfo {
  promise: Promise<ServerFolder>;
  tally: number;
}

// Exported Class

export class ServerFolder extends Folder {

  // Public Class Properties

  // Public Class Properties

  // Public Class Property Functions

  public static get allInstances(): IterableIterator<ServerFolder> {
    return this.instanceMap.values()
  }

  // public static isOpen(path: FolderPath): boolean {
  //   return this.instanceMap.has(path);
  // }

  // Public Class Methods

  public static async close(path: FolderPath, reason: string): Promise<void> {
    const info = this.openMap.get(path);
    if (!info) { return; }
    const instance = await info.promise;
    instance.terminate(reason);
  }

  public static async createOnDisk(path: FolderPath, permissions: Permissions): Promise<void> {
    await createDirectory(path);
    await Permissions.createOnDisk(path, permissions);
  }

  public static async delete(path: FolderPath): Promise<void> {
    // REVIEW: Folder could fail to be deleted because it is not empty, for instance.
    //         Would it be better to "close" only on successful deletion?
    await this.close(path, "Folder is being deleted"); // no-op if the folder is not open.
    await Permissions.deleteOnDisk(path);
    try {
      await deleteDirectory(path); // Note: not recursive. Will fail if directory not empty.
    } catch (err) {
      if (errorCode(err) == 'ENOTEMPTY') {
        throw new ExpectedError('cannotRemoveNonemptyFolder');
      }
      throw err;
    }
  }

  public static async move(oldPath: FolderPath, newPath: FolderPath): Promise<FolderEntry> {
    // Called by the containing ServerFolder when one of its subfolders is renamed.
    await this.close(newPath, `Folder is moving to ${newPath}.`);
    // REVIEW: If there is an existing *file* (not directory) at the new path then it will be overwritten silently.
    //         However, we don't expect random files to be floating around out notebook storage filesystem.
    await renameDirectory(oldPath, newPath);
    return { path: newPath, name: Folder.folderNameFromFolderPath(newPath) }
  }

  public static async open(path: FolderPath): Promise<ServerFolder> {
    let openInfo = this.openMap.get(path);
    if (openInfo) {
      openInfo.tally++;
    } else {
      const promise = this.openFirst(path);
      openInfo = {
        promise,
        tally: 1,
      };
      this.openMap.set(path, openInfo);
      promise.catch(_err=>{ this.openMap.delete(path); });
    };
    return openInfo.promise;
  }

  // Public Class Event Handlers

  public static async onClientRequest(socket: ServerSocket, msg: FolderRequest): Promise<void> {
    // Called by ServerSocket when a client sends a folder request.
    const info = this.openMap.get(msg.path);
    const instance = await(info ? info.promise : this.open(msg.path));
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

  // Public Instance Properties

  // Public Instance Methods

  public close(): void {
    assert(!this.terminated);
    const openInfo = ServerFolder.openMap.get(this.path)!;
    assert(openInfo);
    openInfo.tally--;
    if (openInfo.tally == 0) {
      // LATER: Set timer to destroy in the future.
      this.terminate("Closed by all clients");
    }
  }

  // Public Event Handlers

  // --- PRIVATE ---

  // Private Class Properties

  private static openMap = new Map<FolderPath, OpenInfo>();
  private static instanceMap = new Map<FolderPath, ServerFolder>();

  // Private Class Property Functions

  // Private Class Methods

  private static async openFirst(path: FolderPath): Promise<ServerFolder> {

    let dirMap: Map<FileName, Stats>;
    try {
      dirMap = await readDirectory(path);
    } catch(err) {
      if (errorCode(err) == 'ENOENT') { throw new ExpectedError('folderDoesntExist'); }
      else { throw err; }
    }

    const notebooks: NotebookEntry[] = [];
    const folders: FolderEntry[] = [];
    for (const [filename, stats] of dirMap.entries()) {

      // Skip hidden files and folders
      if (filename.startsWith(".")) { /* skip hidden */ continue; }

      // Skip non-directories
      if (!stats.isDirectory()) { continue; }

      // Notebooks are directories that end with .enb.
      // Folders are all other directories.
      if (filename.endsWith(NOTEBOOK_DIR_SUFFIX)) {
        const nameWithoutSuffix: NotebookName = <NotebookName>filename.slice(0, -NOTEBOOK_DIR_SUFFIX_LENGTH);
        if (!Folder.isValidNotebookName(nameWithoutSuffix)) {
          logWarning(MODULE, `Skipping notebook with invalid name: '${filename}'`);
          continue;
        }
        notebooks.push({ name: nameWithoutSuffix, path: <NotebookPath>`${path}${filename}` })
      } else {
        if (!Folder.isValidFolderName(<FolderName>filename)) {
          logWarning(MODULE, `Skipping folder with invalid name: '${filename}'`);
          continue;
        }
        folders.push({ name: <FolderName>filename, path: <FolderPath>`${path}${filename}/` })
      }
    }

    const obj: FolderObject = { folders, notebooks };
    const permissions = await Permissions.load(path);
    // REVIEW: validate folderObject?
    const instance = new this(path, obj, permissions);
    this.instanceMap.set(path, instance);
    return instance;
  }

  // Private Class Event Handlers

  // Private Constructor

  private constructor(
    path: FolderPath,
    obj: FolderObject,
    permissions: Permissions,
  ) {
    super(path, obj);
    this.permissions = permissions;
    this.sockets = new Set<ServerSocket>();
  }

  // Private Instance Properties

  private permissions: Permissions;
  private sockets: Set<ServerSocket>;
  private terminated?: boolean;

  // Private Instance Property Functions

  // Private Instance Methods

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

  private terminate(_reason: string): void {
    assert(!this.terminated);
    this.terminated = true;
    ServerFolder.openMap.delete(this.path);
    ServerFolder.instanceMap.delete(this.path);
  }

  // Private Instance Event Handlers

  private async onClientRequest(socket: ServerSocket, msg: FolderRequest): Promise<void> {
    assert(!this.terminated);
    switch(msg.operation) {
      case 'change': await this.onClientChangeRequest(socket, msg); break;
      case 'close':  this.onClientCloseRequest(socket, msg); break;
      case 'open':   this.onClientOpenRequest(socket, msg); break;
      default:       assert(false); break;
    }
  }

  private async onClientChangeRequest(socket: ServerSocket, request: ChangeFolder): Promise<void> {
    // TODO: Undo?

    // Verify the user has permission to modify the folder.
    const user = socket.user;
    const permissions = this.permissions.getUserPermissions(user);
    if (!(permissions & UserPermission.Modify)) {
      throw new ExpectedError(user ? 'cannotModifyFolder' : 'logInToModifyFolder')
    }

    const changes: FolderUpdate[] = [];
    assert(request.changeRequests.length>0);
    for (const changeRequest of request.changeRequests) {
      let change: FolderUpdate;
      switch (changeRequest.type) {
        case 'createFolder': {
          // REVIEW: Check if another folder of the same name exists?
          const name = changeRequest.name;
          ServerFolder.validateFolderName(name)
          const path = childFolderPath(this.path, name);
          debug(`Creating folder: ${path}`);
          await ServerFolder.createOnDisk(path, this.permissions);
          change = { type: 'folderCreated', entry: { name, path }};
          break;
        }
        case 'createNotebook': {
          // REVIEW: Check if another notebook of the same name exists?
          const name = changeRequest.name;
          ServerFolder.validateNotebookName(name);
          const path = notebookPath(this.path, name);
          debug(`Creating notebook: ${path}`);
          await ServerNotebook.createOnDisk(path, this.permissions);
          change = { type: 'notebookCreated', entry: { name, path }};
          break;
        }
        case 'deleteFolder': {
          const name = changeRequest.name;
          const path = childFolderPath(this.path, name);
          await ServerFolder.delete(path);
          change = { type: 'folderDeleted', name };
          break;
        }
        case 'deleteNotebook': {
          const name = changeRequest.name;
          const path = notebookPath(this.path, name);
          await ServerNotebook.delete(path);
          change = { type: 'notebookDeleted', name };
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
      this.onUpdate(change, false);
      changes.push(change);
    }
    const update: FolderUpdated = { type: 'folder', operation: 'updated', path: this.path, updates: changes, complete: true };
    this.sendUpdateToAllSockets(update, socket, request.requestId);
  }

  private onClientCloseRequest(socket: ServerSocket, _msg: CloseFolder): void {
    // NOTE: No response is expected for a close request.
    assert(this.sockets.has(socket));
    this.removeSocket(socket);
    this.sendCollaboratorDisconnectedMessage(socket);
  }

  private onClientOpenRequest(socket: ServerSocket, msg: OpenFolder): void {

    // Check if the user has permission to open this folder.
    const user = socket.user;
    const permissions = this.permissions.getUserPermissions(user);
    if (!(permissions & UserPermission.Read)) {
      throw new ExpectedError(user ? 'cannotReadFolder' : 'logInToReadFolder')
    }

    this.sockets.add(socket);

    // Send NotebookOpened message back to the requesting client.
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
      obj: this.obj,
      complete: true
    };
    socket.sendMessage(response);

    this.sendCollaboratorConnectedMessage(socket);
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
