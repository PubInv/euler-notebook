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

import { assert, assertFalse } from "./common";
import { FolderUpdate } from "./server-responses";

// Requirements

// Types

export type FolderName = '{folder-name}'; // Name of a folder without any slashes.

// Folder paths start with a slash, and are followed by zero or more
// folder names, follewed by another slash. e.g. '/', '/foo/', or '/foo/bar/'
// Note that we always use forward slash, even on Windows where the filesystem
// separator is a backslash.
export type FolderPath = '{folder-path}';

export type NotebookName = '{notebook-name}';  // Just the name of the notebook, no .enb extension.

// Notebook paths are a FolderPath followed by a NotebookName, then a '.enb' extension.
// Note that we always use forward slash, even on filesystems with other separators (e.g. Windows)
export type NotebookPath = '{notebook-path}';

export type Path = FolderPath | NotebookPath;

export interface Entry<N,P> {
  name: N;
  path: P;
}

export type FolderEntry = Entry<FolderName, FolderPath>;

export interface FolderObject {
  notebooks: NotebookEntry[];
  folders: FolderEntry[];
}

// An entry in a list of notebooks.
// NOT an entry in a notebook.
export type NotebookEntry = Entry<NotebookName, NotebookPath>;

// Constants

// SECURITY: DO NOT ALLOW PERIODS IN FOLDER NAMES OR NOTEBOOK PATHS!!!
// SECURITY REVIEW: Any danger in allowing backslashes or forward slashes?
//         Maybe should customize the RE to the correct separator depending on the system.
export const FOLDER_NAME_RE = /^(\w+)$/;
export const FOLDER_PATH_RE = /^\/((\w+)\/)*$/;
export const NOTEBOOK_NAME_RE = /^(\w+)$/;
export const NOTEBOOK_PATH_RE = /^\/((\w+\/)*)(\w+)\.enb$/;

// Exported Class

export class Folder {

  // Public Class Properties
  // Public Class Property Functions

  public static folderNameFromFolderPath(path: FolderPath): FolderName {
    const match = FOLDER_PATH_RE.exec(path);
    if (!match) { throw new Error(`Invalid folder path: ${path}`); }
    return <FolderName>match[2] || 'Root'; // REVIEW: Could use user name for the Root folder?
  }

  public static isValidFolderName(name: FolderName): boolean {
    return FOLDER_NAME_RE.test(name);
  }

  public static isValidNotebookName(name: NotebookName): boolean {
    return NOTEBOOK_NAME_RE.test(name);
  }

  public static notebookNameFromNotebookPath(path: NotebookPath): NotebookName {
    const i = path.lastIndexOf('/');
    return <NotebookName>path.slice(i);
  }

  // Public Class Methods

  public static validateFolderName(name: FolderName): void {
    if (!Folder.isValidFolderName(name)) { throw new Error(`Invalid folder name: ${name}`); }
  }

  // Public Class Event Handlers

  // Public Instance Properties

  // REVIEW: Why not just have FolderObject?
  public readonly path: FolderPath;

  // Public Instance Property Functions

  // REVIEW: Should these return an iterator? Don't want caller modifying returned arrays.
  public get notebookEntries(): NotebookEntry[] { return this.obj.notebooks; }
  public get folderEntries(): FolderEntry[] { return this.obj.folders; }

  public hasFolderNamed(
    name: FolderName,
    sensitive?: boolean,    // true if strings much match exactly. false accommodates case insensitivity of the underlying filesystem.
  ): boolean {
    // REVIEW: JavaScript String's toUpperCase may not match exactly the file system's case insensitivity.
    // REVIEW: I18N issues?
    let nameUpperCase = !sensitive && name.toUpperCase();
    const compareFn = sensitive ?
                        (entry:FolderEntry)=>entry.name==name :
                        (entry:FolderEntry)=>entry.name.toUpperCase() == nameUpperCase;
    return !!this.obj.folders.find(compareFn);
  }

  public hasNotebookNamed(
    name: NotebookName,
    sensitive?: boolean,    // true if strings much match exactly. false accommodates case insensitivity of the underlying filesystem.
  ): boolean {
    // REVIEW: JavaScript String's toUpperCase may not match exactly the file system's case insensitivity.
    // REVIEW: I18N issues?
    let nameUpperCase = !sensitive && name.toUpperCase();
    const compareFn = sensitive ?
                        (entry:NotebookEntry)=>entry.name==name :
                        (entry:NotebookEntry)=>entry.name.toUpperCase() == nameUpperCase;
    return !!this.obj.notebooks.find(compareFn);
  }

  // Public Instance Methods

  // Public Instance Event Handlers

  // --- PRIVATE ---

  // Private Class Properties
  // Private Class Property Functions

  private folderIndex(name: FolderName): number {
    return this.obj.folders.findIndex(entry=>(entry.name==name));
  }

  private notebookIndex(name: NotebookName): number {
    return this.obj.notebooks.findIndex(entry=>(entry.name==name));
  }

  // Private Class Methods
  // Private Class Event Handlers

  // Private Constructor

  protected constructor(path: FolderPath, obj: FolderObject) {
    this.path = path;
    this.obj = obj;
  }

  // Private Instance Properties

  protected readonly obj: FolderObject;

  // Private Instance Property Functions

  // Private Instance Methods

  protected /* overridable */ applyUpdate(update: FolderUpdate, _ownRequest: boolean): void {
    switch(update.type) {
      case 'folderCreated': {
        this.obj.folders.push(update.entry);
        break;
      }
      case 'folderDeleted': {
        const i = this.folderIndex(update.entry.name);
        assert(i>=0);
        this.obj.folders.splice(i,1);
        break;
      }
      case 'folderRenamed':  {
        const i = this.folderIndex(update.oldName);
        assert(i>=0);
        this.obj.folders[i] = update.entry;
        break;
      }
      case 'notebookCreated': {
        this.obj.notebooks.push(update.entry);
        break;
      }
      case 'notebookDeleted': {
        const i = this.notebookIndex(update.entry.name);
        assert(i>=0);
        this.obj.notebooks.splice(i,1);
        break;
      }
      case 'notebookRenamed': {
        const i = this.notebookIndex(update.oldName);
        assert(i>=0);
        this.obj.notebooks[i] = update.entry;
        break;
      }
      default: assertFalse();
    }
  }

  // Private Instance Event Handlers

}

