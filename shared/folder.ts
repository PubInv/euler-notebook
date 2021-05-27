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

const NOTEBOOK_VIEWS = [ 'read', 'edit' ] as const;
export type NotebookView = typeof NOTEBOOK_VIEWS[number];

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

export const NOTEBOOK_DIR_SUFFIX = '.enb';
export const NOTEBOOK_DIR_SUFFIX_LENGTH = NOTEBOOK_DIR_SUFFIX.length;

// IMPORTANT: Do not allow a path segment that is just a period or just two periods.
const ALLOWABLE_FIRST_CHAR = "-_A-Za-z0-9";
const ALLOWABLE_REST_CHAR = `${ALLOWABLE_FIRST_CHAR}.`;
const FIRST_PIECE = `[${ALLOWABLE_FIRST_CHAR}][${ALLOWABLE_REST_CHAR}]*`;
const ADDITIONAL_PIECE = `[${ALLOWABLE_REST_CHAR}]+`;
const SEGMENT = `${FIRST_PIECE}( ${ADDITIONAL_PIECE})*`;
const NAME_RE = new RegExp(`^${SEGMENT}$`);

const FOLDER_PATH = `/(${SEGMENT}/)*`;
const NOTEBOOK_PATH = `${FOLDER_PATH}${SEGMENT}${NOTEBOOK_DIR_SUFFIX}`;

// These regular expressions are necessary, but not sufficient, to determine correctness.
// See additional checks in isValid(Folder|Notebook)Name.
const FOLDER_PATH_RE = new RegExp(`^${FOLDER_PATH}$`);
export const NOTEBOOK_PATH_RE = new RegExp(`^${NOTEBOOK_PATH}$`);

const ROOT_FOLDER_NAME = <FolderName>"Root";

const VIEW_RE = /^view=(\w+)$/;

// Exported Class

export class Folder {

  // Public Class Properties
  // Public Class Property Functions

  public static folderNameFromFolderPath(path: FolderPath): FolderName {
    const segments = path.split('/').slice(1,-1);
    if (segments.length == 0) { return ROOT_FOLDER_NAME }
    else { return <FolderName>segments[segments.length-1]; }
  }

  public static isValidFolderName(name: string): boolean {
    return NAME_RE.test(name) && !name.endsWith(NOTEBOOK_DIR_SUFFIX);
  }

  public static isValidFolderPath(path: string): boolean {
    return FOLDER_PATH_RE.test(path) && path.split('/').slice(1,-1).every(n=>this.isValidFolderName(n));
  }

  public static isValidNotebookName(name: string): boolean {
    return this.isValidFolderName(name);
  }

  public static isValidNotebookPath(path: string): boolean {
    if (!NOTEBOOK_PATH_RE.test(path)) { return false; }
    const segments = path.split('/').slice(1);
    if (!segments.slice(0,-1).every(n=>this.isValidFolderName(n))) { return false; }
    const name = segments[segments.length-1].slice(0, -NOTEBOOK_DIR_SUFFIX_LENGTH);
    if (!this.isValidNotebookName(name)) { return false };
    return true;
  }

  public static isValidNotebookPathWithView(pathWithView: string): { path: NotebookPath, view: NotebookView }|false {
    const parts = pathWithView.split('?');
    if (parts.length!=2) { return false };
    const path = <NotebookPath>parts[0];
    if (!this.isValidNotebookPath(path)) { return false; }
    const match = VIEW_RE.exec(parts[1]);
    if (!match) { return false; }
    const view = <NotebookView>match[1];
    if (NOTEBOOK_VIEWS.indexOf(view)<0) { return false; }
    return { path, view };
  }

  public static notebookNameFromNotebookPath(path: NotebookPath): NotebookName {
    const segments = path.split('/');
    assert(segments.length>0);
    return <NotebookName>segments[segments.length-1].slice(0, -NOTEBOOK_DIR_SUFFIX_LENGTH);
  }

  // Public Class Methods

  public static validateFolderName(name: FolderName): void {
    if (!this.isValidFolderName(name)) { throw new Error(`Invalid folder name: ${name}`); }
  }

  public static validateNotebookName(name: NotebookName): void {
    if (!this.isValidNotebookName(name)) { throw new Error(`Invalid notebook name: ${name}`); }
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

  // Private Instance Event Handlers

  protected /* overridable */ onUpdate(update: FolderUpdate, _ownRequest?: boolean): void {
    switch(update.type) {
      case 'folderCreated': {
        this.obj.folders.push(update.entry);
        break;
      }
      case 'folderDeleted': {
        const i = this.folderIndex(update.name);
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
        const i = this.notebookIndex(update.name);
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

}

