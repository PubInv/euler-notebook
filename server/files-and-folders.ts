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

import { mkdir, readdir, readFile, rmdir, stat, writeFile } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

import * as debug1 from 'debug';
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);
import * as rimraf from 'rimraf';

import { NotebookName } from '../client/math-tablet-api';

const mkdir2 = promisify(mkdir);
const readdir2 = promisify(readdir);
const readFile2 = promisify(readFile);
const rmdir2 = promisify(rmdir);
const stat2 = promisify(stat);
const writeFile2 = promisify(writeFile);

const rimraf2 = promisify(rimraf);

// Types

export type AbsDirectoryPath = string; // Absolute path to a directory in the file system.
export type AbsFilePath = string; // Absolute path to a file in the file system.

export type FolderName = string;

// Folder paths start with a slash, and are followed by zero or more
// folder names, follewed by another slash. e.g. '/', '/foo/', or '/foo/bar/'
// Note that we always use forward slash, even on Windows where the filesystem
// separator is a backslash.
export type FolderPath = string;

// Notebook paths are a FolderPath (see files-and-folders.ts) followed by a NotebookName,
// then a '.mtnb' extension, and a slash.
// Note that we always use forward slash, even on Windows where the filesystem
// separator is a backslash.
export type NotebookPath = string;

interface FolderEntry {
  name: FolderName;
  path: FolderPath;
}

// An entry in a list of notebooks.
// NOT an entry in a notebook.
export interface NotebookEntry {
  name: NotebookName;
  path: NotebookPath;
}

interface NotebooksAndFolders {
  notebooks: NotebookEntry[];
  folders: FolderEntry[];
}

// Constants

const NOTEBOOK_DIR_SUFFIX = '.mtnb';
const NOTEBOOK_DIR_SUFFIX_LEN = NOTEBOOK_DIR_SUFFIX.length;
const NOTEBOOK_ENCODING = 'utf8';
const NOTEBOOK_FILE_NAME = 'notebook.json';
const ROOT_DIR_NAME = 'math-tablet-usr';
const ROOT_DIR_PATH = join(process.env.HOME!, ROOT_DIR_NAME);

// SECURITY: DO NOT ALLOW PERIODS IN FOLDER NAMES OR NOTEBOOK PATHS!!!
// SECURITY REVIEW: Any danger in allowing backslashes or forward slashes?
//         Maybe should customize the RE to the correct separator depending on the system.
const FOLDER_NAME_RE = /^(\w+)$/;
export const FOLDER_PATH_RE = /^\/(\w+\/)*$/;
const NOTEBOOK_NAME_RE = /^(\w+)$/;
export const NOTEBOOK_PATH_RE = /^\/(\w+\/)*\w+\.mtnb\/$/;

// Exported functions

export function absDirPathFromNotebookPath(notebookPath: FolderPath|NotebookPath): AbsDirectoryPath {
  //(Slice is to remove the leading and trailing slashes.)
  const pathSegments = notebookPath.slice(1, -1).split('/');
  return join(ROOT_DIR_PATH, ...pathSegments);
}

export async function createFolder(folderPath: FolderPath): Promise<void> {
  const absPath = absDirPathFromNotebookPath(folderPath);
  await mkdir2(absPath);
}

export async function deleteFolder(folderPath: FolderPath): Promise<undefined|string> {
  const path = absDirPathFromNotebookPath(folderPath);
  debug(`Deleting folder directory ${path}`);
  try { await rmdir2(path); }
  catch(err) { return err.code; }
  return undefined;
}

export async function deleteNotebook(notebookPath: NotebookPath): Promise<undefined|string> {
  const absPath = absDirPathFromNotebookPath(notebookPath);
  debug(`Deleting notebook directory ${absPath}`);
  try { await rimraf2(absPath); }
  catch(err) { return err.code; }
  return undefined;
}

// TYPESCRIPT: file path type?
export async function getListOfNotebooksAndFoldersInFolder(folderPath: FolderPath): Promise<NotebooksAndFolders> {
  const absPath = absDirPathFromNotebookPath(folderPath);
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
    const path = `${folderPath}${name}/`;
    if (name.endsWith(NOTEBOOK_DIR_SUFFIX)) {
      const nameWithoutSuffix = name.slice(0, -NOTEBOOK_DIR_SUFFIX_LEN);
      notebooks.push({ name: nameWithoutSuffix, path })
    } else {
      folders.push({ name, path })
    }
  }
  return { notebooks, folders };
}

export function isValidFolderName(folderName: FolderName): boolean {
  return FOLDER_NAME_RE.test(folderName);
}

export function isValidFolderPath(folderPath: FolderPath): boolean {
  return FOLDER_PATH_RE.test(folderPath);
}

export function isValidNotebookName(notebookName: NotebookName): boolean {
  return NOTEBOOK_NAME_RE.test(notebookName);
}

export function isValidNotebookPath(notebookPath: NotebookPath): boolean {
  return NOTEBOOK_PATH_RE.test(notebookPath);
}

export function notebookPathFromFolderPathAndName(folderPath: FolderPath, notebookName: NotebookName): NotebookPath {
  return `${folderPath}${notebookName}${NOTEBOOK_DIR_SUFFIX}/`;
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

function absFilePathFromNotebookPath(notebookPath: NotebookPath): AbsFilePath {
  const absPath = absDirPathFromNotebookPath(notebookPath);
  return join(absPath, NOTEBOOK_FILE_NAME);
}

