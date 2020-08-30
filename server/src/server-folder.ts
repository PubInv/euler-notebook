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

// TODO: Watch folder on disk. Generate change notifications if things are created, deleted, or renamed.
// TODO: Folder lifecycle. When and how are folders that are no longer used cleaned up?

// Requirements

import * as debug1 from 'debug';
import { join } from 'path';

import { assert } from './shared/common';
import {
  Folder, FolderEntry, FolderName, FolderObject, FolderPath, FOLDER_PATH_RE, NotebookEntry,
  NotebookName, NotebookPath, FolderChange,
} from './shared/folder';
import { ClientFolderChangeMessage, ServerFolderChangedMessage, ServerFolderMovedMessage } from './shared/math-tablet-api';

import { AbsDirectoryPath, ROOT_DIR_PATH, dirStat, mkDir, readDir, rename, rmDir } from './file-system';
import { ServerNotebook, notebookPath } from './server-notebook';

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);


// Types

interface InstanceInfo {
  openTally: number;
  promise: Promise<ServerFolder>; // Promise for the instance returned from 'watch'.
  watchers: Set<Watcher>;
}

interface OpenOptions {
  mustExist: true;
  watcher?: Watcher
}

export interface Watcher {
  onChanged(msg: ServerFolderChangedMessage): void;
  onClosed(): void;
  onMoved(msg: ServerFolderMovedMessage): void;
}

// Exported Class

export class ServerFolder extends Folder {

  // Public Class Properties

  public static nameFromPath(path: FolderPath): FolderName {
    const match = FOLDER_PATH_RE.exec(path);
    if (!match) { throw new Error(`Invalid folder path: ${path}`); }
    return <FolderName>match[2] || 'Root'; // REVIEW: Could use user name for the Root folder?
  }

  // Public Class Property Functions

  public static isOpen(path: FolderPath): boolean {
    return this.instanceMap.has(path);
  }

  // Public Class Methods

  public static async close(path: FolderPath): Promise<boolean> {
    // Closes the specified folder.
    // All watchers are notified.
    // Has no effect if the folder is not open.
    // Returns true iff the folder was open.
    if (!this.isOpen(path)) { return false; }
    const info = this.instanceMap.get(path)!;
    const folder = await info.promise;
    folder.destroyInstance();
    return true;
  }

  public static async delete(path: FolderPath): Promise<void> {
    this.close(path); // no-op if the folder is not open.
    const absPath = absDirPathFromFolderPath(path);
    debug(`Deleting folder directory ${absPath}`);
    await rmDir(absPath); // TODO: Handle failure.
  }

  public static async move(oldPath: FolderPath, newPath: FolderPath): Promise<FolderEntry> {
    // Called by the containing ServerFolder when one of its subfolders is renamed.

    const oldAbsPath = absDirPathFromFolderPath(oldPath);
    const newAbsPath = absDirPathFromFolderPath(newPath);

    // REVIEW: If there is an existing *file* (not directory) at the new path then it will be overwritten silently.
    //         However, we don't expect random files to be floating around out notebook storage filesystem.
    await rename(oldAbsPath, newAbsPath);

    if (this.isOpen(oldPath)) {
      const info = this.instanceMap.get(oldPath)!;
      this.instanceMap.delete(oldPath);
      this.instanceMap.set(newPath, info);
      // REVIEW: Could there be a race condition due to the async interval waiting on the open promise?
      const instance = await info.promise;
      instance.moved(newPath);
    }

    return { path: newPath, name: this.nameFromPath(newPath) }
  }

  public static open(path: FolderPath, options: OpenOptions): Promise<ServerFolder> {
    let info = this.instanceMap.get(path);
    if (!info) {
      // This notebook is not already open. Create the instance.
      const promise = this.createInstance(path, options);
      const watchers = new Set<Watcher>();
      if (options.watcher) { watchers.add(options.watcher); }
      info = { openTally: 1, promise, watchers };
      this.instanceMap.set(path, info);
    } else {
      // This notebook is already open. Tally and add the watcher if there is one.
      info.openTally++;
      if (options.watcher) { info.watchers.add(options.watcher); }
    }
    return info.promise;
  }

  public static validateFolderName(name: FolderName): void {
    if (!this.isValidFolderName(name)) { throw new Error(`Invalid folder name: ${name}`); }
  }

  // Class Event Handlers

  // Public Instance Methods

  public close(watcher?: Watcher): void {
    assert(!this.destroyed);
    const info = ServerFolder.instanceMap.get(this.path)!;
    assert(info);
    if (watcher) {
      const had = info.watchers.delete(watcher);
      assert(had);
    }
    if (--info.openTally == 0) {
      // LATER: Set timer to destroy in the future.
      this.destroyInstance();
    }
  }

  // Event Handlers

  public async onFolderChangeMessage(
    originatingWatcher: Watcher,
    msg: ClientFolderChangeMessage
  ): Promise<ServerFolderChangedMessage> {
    // TODO: Undo?
    assert(!this.destroyed);

    const changes: FolderChange[] = [];
    assert(msg.changeRequests.length>0);
    for (const changeRequest of msg.changeRequests) {
      let change: FolderChange;
      switch (changeRequest.type) {
        case 'createFolder': {
          const name = changeRequest.name;
          ServerFolder.validateFolderName(name)
          const path = childFolderPath(this.path, name);
          debug(`Creating folder: ${path}`);
          const absPath = absDirPathFromFolderPath(path);
          console.log(absPath);
          await mkDir(absPath);  // TODO: Handle failure.
          change = { type: 'folderCreated', entry: { name, path }};
          break;
        }
        case 'createNotebook': {
          const name = changeRequest.name;
          ServerNotebook.validateNotebookName(name);
          const path = notebookPath(this.path, name);
          debug(`Creating notebook: ${path}`);
          const notebook = await ServerNotebook.open(path, { mustNotExist: true });
          notebook.close();
          debug(`Notebook created.`);
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
      this.applyChange(change);
      changes.push(change);
    }
    const response: ServerFolderChangedMessage = { type: 'folder', operation: 'changed', path: this.path, changes };

    // Notify other watchers
    for (const watcher of this.watchers) {
      if (watcher === originatingWatcher) { continue; }
      watcher.onChanged(response);
    }

    return response;
  }

  // --- PRIVATE ---

  // Private Class Properties

  private static instanceMap: Map<FolderPath, InstanceInfo> = new Map();

  // Private Class Methods

  private static async createInstance(path: FolderPath, options: OpenOptions): Promise<ServerFolder> {
    assert(options.mustExist);

    const absPath = absDirPathFromFolderPath(path);
    debug(`Opening folder from filesystem: "${absPath}"`)
    const listings = await readDir(absPath);
    const notebooks: NotebookEntry[] = [];
    const folders: FolderEntry[] = [];

    const suffix = ServerNotebook.NOTEBOOK_DIR_SUFFIX;
    const suffixLen = suffix.length;

    for (const listing of listings) {

      // Skip hidden files and folders
      if (listing.startsWith(".")) { /* skip hidden */ continue; }

      // Skip non-directories
      const stats = await(dirStat(join(absPath, listing)));
      if (!stats.isDirectory()) { continue; }

      // Notebooks are directories that end with .mtnb.
      // Folders are all other directories.
      if (listing.endsWith(suffix)) {
        const nameWithoutSuffix: NotebookName = <NotebookName>listing.slice(0, -suffixLen);
        if (!ServerNotebook.isValidNotebookName(nameWithoutSuffix)) {
          console.warn(`Skipping notebook with invalid name: '${listing}'`);
          continue;
        }
        notebooks.push({ name: nameWithoutSuffix, path: <NotebookPath>`${path}${listing}` })
      } else {
        if (!this.isValidFolderName(<FolderName>listing)) {
          console.warn(`Skipping folder with invalid name: '${listing}'`);
          continue;
        }
        folders.push({ name: <FolderName>listing, path: <FolderPath>`${path}${listing}/` })
      }
    }

    const obj: FolderObject = {
      name: this.nameFromPath(path),
      path,
      folders,
      notebooks,
    };
    const instance = new this(obj);
    return instance;
  }

  // Private Class Event Handlers

  // Private Constructor

  private constructor(obj: FolderObject) {
    super(obj);
  }

  // Private Instance Properties

  private destroyed?: boolean;

  // Private Instance Property Functions

  private get watchers(): IterableIterator<Watcher> {
    return ServerFolder.instanceMap.get(this.path)!.watchers.values();
  }

  // Private Instance Methods

  private destroyInstance(): void {
    // TODO: Should be async and wait for any operations in progress?
    assert(!this.destroyed);
    this.destroyed = true;
    const info = ServerFolder.instanceMap.get(this.path)!;
    assert(info);
    ServerFolder.instanceMap.delete(this.path);
    for (const watcher of info.watchers) { watcher.onClosed(); }
  }

  private moved(newPath: FolderPath): void {
    const msg: ServerFolderMovedMessage = {
      type: 'folder',
      path: this.path,
      operation: 'moved',
      newPath,
    };
    this.path = newPath;
    for (const watcher of this.watchers) {
      // if (watcher === originatingWatcher) { continue; }
      watcher.onMoved(msg);
    }
    // TODO: recursively "move" open child folders and notebooks.
  }

}

// Exported Functions

// REVIEW: Which of these should be class and instance methods or properties?

// REVIEW: Memoize or save in global?
export function rootDir(): AbsDirectoryPath {
  return ROOT_DIR_PATH;
}

// Helper Functions

function absDirPathFromFolderPath(path: FolderPath): AbsDirectoryPath {
  const pathSegments = path.split('/').slice(1, -1);
  return join(ROOT_DIR_PATH, ...pathSegments);
}

function childFolderPath(path: FolderPath, name: FolderName): FolderPath {
  return <FolderPath>`${path}${name}/`;
}

// function parentFolderPath(path: FolderPath): FolderPath {
//   if (<string>path == '/') { throw new Error("Root folder does not have a parent folder."); }
//   const pathSegments = path.split('/');
//   pathSegments.splice(-2, 1); // Modifies pathSegments as a side-effect.
//   return <FolderPath>pathSegments.join('/');
// }
