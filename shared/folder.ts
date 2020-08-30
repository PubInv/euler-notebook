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

import { assert } from './common';

// Types

export type FolderName = '{folder-name}'; // Name of a folder without any slashes.

// Folder paths start with a slash, and are followed by zero or more
// folder names, follewed by another slash. e.g. '/', '/foo/', or '/foo/bar/'
// Note that we always use forward slash, even on Windows where the filesystem
// separator is a backslash.
export type FolderPath = '{folder-path}';

export type NotebookName = '{notebook-name}';  // Just the name of the notebook, no .mtnb extension.

// Notebook paths are a FolderPath followed by a NotebookName, then a '.mtnb' extension.
// Note that we always use forward slash, even on Windows where the filesystem
// separator is a backslash.
export type NotebookPath = '{notebook-path}';

export type Path = FolderPath | NotebookPath;

export interface Entry<N,P> {
  name: N;
  path: P;
}

export type FolderEntry = Entry<FolderName, FolderPath>;

export type FolderChange = FolderCreated|FolderDeleted|FolderRenamed|NotebookCreated|NotebookDeleted|NotebookRenamed;
export interface FolderCreated {
  type: 'folderCreated';
  entry: FolderEntry;
}
export interface FolderDeleted {
  type: 'folderDeleted';
  entry: FolderEntry;
}
export interface FolderRenamed {
  type: 'folderRenamed';
  entry: FolderEntry;
  oldName: FolderName;
}
export interface NotebookCreated {
  type: 'notebookCreated';
  entry: NotebookEntry;
}
export interface NotebookDeleted {
  type: 'notebookDeleted';
  entry: NotebookEntry;
}
export interface NotebookRenamed {
  type: 'notebookRenamed';
  entry: NotebookEntry;
  oldName: NotebookName;
}

export interface FolderObject {
  name: FolderName;
  path: FolderPath;
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
export const NOTEBOOK_PATH_RE = /^\/((\w+\/)*)(\w+)\.mtnb$/;

// Exported Class

export class Folder implements FolderObject {

  // Public Class Property Functions

  public static isValidFolderName(name: FolderName): boolean {
    return FOLDER_NAME_RE.test(name);
  }

  // Public Instance Properties

  public name: FolderName;
  public path: FolderPath;
  public notebooks: NotebookEntry[];
  public folders: FolderEntry[];

  // Public Instance Property Functions

  public get isEmpty(): boolean {
    return (this.folders.length + this.notebooks.length == 0);
  }

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
    return !!this.folders.find(compareFn);
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
    return !!this.notebooks.find(compareFn);
  }

  // Public Instance Methods

  public applyChange(change: FolderChange): void {
    switch(change.type) {
      case 'folderCreated': {
        this.folders.push(change.entry);
        break;
      }
      case 'folderDeleted': {
        const i = this.folderIndex(change.entry.name);
        assert(i>=0);
        this.folders.splice(i,1);
        break;
      }
      case 'folderRenamed':  {
        const i = this.folderIndex(change.oldName);
        assert(i>=0);
        this.folders[i] = change.entry;
        break;
      }
      case 'notebookCreated': {
        this.notebooks.push(change.entry);
        break;
      }
      case 'notebookDeleted': {
        const i = this.notebookIndex(change.entry.name);
        assert(i>=0);
        this.folders.splice(i,1);
        break;
      }
      case 'notebookRenamed': {
        const i = this.notebookIndex(change.oldName);
        assert(i>=0);
        this.notebooks[i] = change.entry;
        break;
      }
      default:
        throw new Error(`Applying unexpected change type: ${(<any>change).type}`);
    }
  }

  public toJSON(): FolderObject {
    return { name: this.name, path: this.path, folders: this.folders, notebooks: this.notebooks };
  }

  // --- PRIVATE ---

  // Private Constructor

  public constructor(obj: FolderObject) {
    this.name = obj.name;
    this.path = obj.path;
    // REVIEW: Should we make a copy of these arrays? No guarantee the caller won't modify them.
    this.notebooks = obj.notebooks;
    this.folders = obj.folders;
  }

  // Private Instance Properties

  // Private Instance Property Functions

  private folderIndex(name: FolderName): number {
    return this.folders.findIndex(entry=>(entry.name==name));
  }

  private notebookIndex(name: NotebookName): number {
    return this.notebooks.findIndex(entry=>(entry.name==name));
  }

  // Private Instance Methods

}
