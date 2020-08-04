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

// Types

export type FolderName = string; // Name of a folder without any slashes.

// Folder paths start with a slash, and are followed by zero or more
// folder names, follewed by another slash. e.g. '/', '/foo/', or '/foo/bar/'
// Note that we always use forward slash, even on Windows where the filesystem
// separator is a backslash.
export type FolderPath = '{folder-path}';

export type NotebookName = string;  // Just the name of the notebook, no .mtnb extension.

// Notebook paths are a FolderPath followed by a NotebookName, then a '.mtnb' extension.
// Note that we always use forward slash, even on Windows where the filesystem
// separator is a backslash.
export type NotebookPath = '{notebook-path}';

export type Path = FolderPath | NotebookPath;

export interface FolderEntry {
  name: FolderName;
  path: FolderPath;
}

export type FolderChange = FolderCreated|FolderDeleted|NotebookCreated|NotebookDeleted;
export interface FolderCreated {
  type: 'folderCreated';
  folderName: FolderName;
}
export interface FolderDeleted {
  type: 'folderDeleted';
  folderName: FolderName;
}
export interface NotebookCreated {
  type: 'notebookCreated';
  notebookName: NotebookName;
}
export interface NotebookDeleted {
  type: 'notebookDeleted';
  notebookName: NotebookName;
}

export interface FolderObject {
  name: FolderName;
  path: FolderPath;
  notebooks: NotebookEntry[];
  folders: FolderEntry[];
}

// An entry in a list of notebooks.
// NOT an entry in a notebook.
export interface NotebookEntry {
  name: NotebookName;
  path: NotebookPath;
}

// Constants

// SECURITY: DO NOT ALLOW PERIODS IN FOLDER NAMES OR NOTEBOOK PATHS!!!
// SECURITY REVIEW: Any danger in allowing backslashes or forward slashes?
//         Maybe should customize the RE to the correct separator depending on the system.
export const FOLDER_NAME_RE = /^(\w+)$/;
export const FOLDER_PATH_RE = /^\/(\w+\/)*$/;
export const NOTEBOOK_NAME_RE = /^(\w+)$/;
export const NOTEBOOK_PATH_RE = /^\/((\w+\/)*)(\w+)$/;

// Exported Class

export class Folder implements FolderObject {

  // Public Instance Properties

  public name: FolderName;
  public path: FolderPath;
  public notebooks: NotebookEntry[];
  public folders: FolderEntry[];

  public get isEmpty(): boolean {
    return (this.folders.length + this.notebooks.length == 0);
  }

  // Public Instance Methods

  public applyChange(change: FolderChange): void {
    switch(change.type) {
      case 'folderCreated':     this.createFolder(change); break;
      case 'folderDeleted':     this.deleteFolder(change); break;
      case 'notebookCreated':   this.createNotebook(change); break;
      case 'notebookDeleted':   this.deleteNotebook(change); break;
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

  // Private Instance Methods

  private createFolder(_change: FolderCreated): void {
    throw new Error("NOT YET IMPLEMENTED");
  }

  private deleteFolder(_change: FolderDeleted): void {
    throw new Error("NOT YET IMPLEMENTED");
  }

  private createNotebook(_change: NotebookCreated): void {
    throw new Error("NOT YET IMPLEMENTED");
  }

  private deleteNotebook(_change: NotebookDeleted): void {
    throw new Error("NOT YET IMPLEMENTED");
  }
}
