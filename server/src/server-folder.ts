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

import * as debug1 from 'debug';
import { /* mkdir, */ readdir, readFile, /* rmdir, */ stat, writeFile } from 'fs';
import { join } from 'path';
import { promisify } from 'util';
//import * as rimraf from 'rimraf';

import {
  Folder, FolderEntry, FolderName, FolderObject, FolderPath, FOLDER_PATH_RE, NotebookEntry,
  NotebookName, NotebookPath, NOTEBOOK_PATH_RE,
} from './shared/folder';

import { ClientObserver } from './observers/client-observer';
import { ClientId } from './client-socket';

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

//const mkdir2 = promisify(mkdir);
const readdir2 = promisify(readdir);
const readFile2 = promisify(readFile);
//const rmdir2 = promisify(rmdir);
//const rimraf2 = promisify(rimraf);
const stat2 = promisify(stat);
const writeFile2 = promisify(writeFile);

// Types

export type AbsDirectoryPath = string; // Absolute path to a directory in the file system.
type AbsFilePath = string; // Absolute path to a file in the file system.

// Constants

const NOTEBOOK_DIR_SUFFIX = '.mtnb';
const NOTEBOOK_DIR_SUFFIX_LEN = NOTEBOOK_DIR_SUFFIX.length;
const NOTEBOOK_ENCODING = 'utf8';
const NOTEBOOK_FILE_NAME = 'notebook.json';
const ROOT_DIR_NAME = 'math-tablet-usr';
const ROOT_DIR_PATH = join(process.env.HOME!, ROOT_DIR_NAME);

// Exported Class

export class ServerFolder extends Folder {

  // Public Class Methods

  public static async open(folderPath: FolderPath): Promise<ServerFolder> {
    // REVIEW: Lifecycle. When and how are obsolete folders cleaned up?

    // If the document is already open, then return the existing instance.
    const openFolder = this.openFolders.get(folderPath);
    if (openFolder) {
      debug(`Opening in-memory folder: "${folderPath}"`);
      return openFolder;
    }
    debug(`Opening folder from filesystem: "${folderPath}"`)
    const data = await getListOfNotebooksAndFoldersInFolder(folderPath);
    const obj: FolderObject = {
      name: folderNameFromFolderPath(folderPath),
      path: folderPath,
      folders: data.folders,
      notebooks: data.notebooks,
    };
    const folder = new this(obj);
    this.openFolders.set(folderPath, folder);
    return folder;
  }

  // Public Instance Methods

  public deregisterClientObserver(clientId: ClientId): void {
    const deleted = this.clientObservers.delete(clientId);
    if (!deleted) {
      console.error(`Cannot deregister non-registered client observer: ${clientId}`);
    }
  }

  public registerClientObserver(clientId: ClientId, instance: ClientObserver): void {
    this.clientObservers.set(clientId, instance)
  }


  // --- PRIVATE ---

  // Private Class Properties

  private static openFolders = new Map<FolderPath, ServerFolder>();

  // Private Class Methods

  // Private Constructor

  private constructor(obj: FolderObject) {
    super(obj);
    this.clientObservers = new Map();
  }

  // Private Instance Properties

  private clientObservers: Map<ClientId, ClientObserver>;

}

// Exported Functions

// REVIEW: Which of these should be class and instance methods or properties?

export function absDirPathFromNotebookPath(path: NotebookPath): AbsDirectoryPath {
  //(Slice is to remove the leading and trailing slashes.)
  const pathSegments = path.split('/').slice(1);
  pathSegments[pathSegments.length-1] += NOTEBOOK_DIR_SUFFIX;
  return join(ROOT_DIR_PATH, ...pathSegments);
}

export function isValidNotebookPath(notebookPath: NotebookPath): boolean {
  return NOTEBOOK_PATH_RE.test(notebookPath);
}

export function notebookNameFromNotebookPath(notebookPath: NotebookPath): NotebookName {
  const match = NOTEBOOK_PATH_RE.exec(notebookPath);
  if (!match) { throw new Error(`Invalid notebook path: ${notebookPath}`); }
  return <NotebookName>match[3];
}

export async function readNotebookFile(notebookPath: NotebookPath): Promise<string> {
  if (!isValidNotebookPath(notebookPath)) {
    throw new Error(`Invalid notebook path: ${notebookPath}`);
  }
  const filePath = absFilePathFromNotebookPath(notebookPath);
  const json = await readFile2(filePath, NOTEBOOK_ENCODING);
  return json;
}

// REVIEW: Memoize or save in global?
export function rootDir(): AbsDirectoryPath {
  return ROOT_DIR_PATH;
}

export async function writeNotebookFile(notebookPath: NotebookPath, json: string): Promise<void> {
  if (!isValidNotebookPath(notebookPath)) {
    throw new Error(`Invalid notebook path: ${notebookPath}`);
  }
  const filePath = absFilePathFromNotebookPath(notebookPath);
  await writeFile2(filePath, json, NOTEBOOK_ENCODING)
}

// Helper Functions

function absDirPathFromFolderPath(path: FolderPath): AbsDirectoryPath {
  const pathSegments = path.split('/').slice(1, -1);
  return join(ROOT_DIR_PATH, ...pathSegments);
}

function absFilePathFromNotebookPath(notebookPath: NotebookPath): AbsFilePath {
  const absPath = absDirPathFromNotebookPath(notebookPath);
  return join(absPath, NOTEBOOK_FILE_NAME);
}

// async function createFolder(folderPath: FolderPath|NotebookPath): Promise<void> {
//   const absPath = absDirPathFromNotebookPath(folderPath);
//   await mkdir2(absPath);
// }

// async function deleteFolder(folderPath: FolderPath): Promise<undefined|string> {
//   const path = absDirPathFromNotebookPath(folderPath);
//   debug(`Deleting folder directory ${path}`);
//   try { await rmdir2(path); }
//   catch(err) { return err.code; }
//   return undefined;
// }

// async function deleteNotebook(notebookPath: NotebookPath): Promise<undefined|string> {
//   const absPath = absDirPathFromNotebookPath(notebookPath);
//   debug(`Deleting notebook directory ${absPath}`);
//   try { await rimraf2(absPath); }
//   catch(err) { return err.code; }
//   return undefined;
// }

function folderNameFromFolderPath(folderPath: FolderPath): FolderName {
  const match = FOLDER_PATH_RE.exec(folderPath);
  if (!match) { throw new Error(`Invalid notebook path: ${folderPath}`); }
  return <FolderName>match[3] || 'Root'; // REVIEW: Could use user name?
}

// TYPESCRIPT: file path type?
async function getListOfNotebooksAndFoldersInFolder(path: FolderPath): Promise<FolderObject> {
  const absPath = absDirPathFromFolderPath(path);
  const names = await readdir2(absPath);
  const notebooks: NotebookEntry[] = [];
  const folders: FolderEntry[] = [];

  for (const name of names) {

    // Skip hidden files and folders
    if (name.startsWith(".")) { /* skip hidden */ continue; }

    // Skip non-directories
    const stats = await(stat2(join(absPath, name)));
    if (!stats.isDirectory()) { continue; }

    // Notebooks are directories that end with .mtnb.
    // Folders are all other directories.
    if (name.endsWith(NOTEBOOK_DIR_SUFFIX)) {
      const nameWithoutSuffix: NotebookName = <NotebookName>name.slice(0, -NOTEBOOK_DIR_SUFFIX_LEN);
      notebooks.push({ name: nameWithoutSuffix, path: <NotebookPath>`${path}${nameWithoutSuffix}` })
    } else {
      folders.push({ name: <FolderName>name, path: <FolderPath>`${path}${name}/` })
    }
  }
  const name = folderNameFromFolderPath(path);
  return { name, path, notebooks, folders };
}

// function isValidFolderName(folderName: FolderName): boolean {
//   return FOLDER_NAME_RE.test(folderName);
// }

// function isValidFolderPath(folderPath: FolderPath): boolean {
//   return FOLDER_PATH_RE.test(folderPath);
// }

// function isValidNotebookName(notebookName: NotebookName): boolean {
//   return NOTEBOOK_NAME_RE.test(notebookName);
// }

// function notebookPathFromFolderPathAndName(folderPath: FolderPath, notebookName: NotebookName): NotebookPath {
//   return <NotebookPath>`${folderPath}${notebookName}${NOTEBOOK_DIR_SUFFIX}`;
// }
