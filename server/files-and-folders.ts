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
const MODULE = __filename.split('/').slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);
import * as rimraf from 'rimraf';

import { NotebookName, NotebookPath, MyScriptServerKeys } from '../client/math-tablet-api';

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

// Folder paths are always relative to root dir.
export type FolderName = string;
export type FolderPath = string;

export interface Credentials {
  myscript: MyScriptServerKeys;
}

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

const CREDENTIALS_FILENAME = '.math-tablet-credentials.json';

// SECURITY: DO NOT ALLOW PERIODS IN FOLDER NAMES OR NOTEBOOK PATHS!!!
const FOLDER_NAME_RE = /^(\w+)$/;
export const FOLDER_PATH_RE = /^\/(\w+\/)*$/;
const NOTEBOOK_NAME_RE = /^(\w+)$/;
export const NOTEBOOK_PATH_RE = /^\/(\w+\/)*\w+\.mtnb\/$/;

// Exported functions

// Works on folder paths, too.
export function absDirPathFromNotebookPath(notebookPath: FolderPath|NotebookPath): AbsDirectoryPath {
  return join(rootDir(), notebookPath.slice(1, -1));
}

export async function createFolder(folderPath: FolderPath): Promise<void> {
  const fullPath = join(rootDir(), folderPath);
  await mkdir2(fullPath);
}

export async function deleteFolder(folderPath: FolderPath): Promise<undefined|string> {
  const path = absDirPathFromNotebookPath(folderPath);
  debug(`Deleting folder directory ${path}`);
  try { await rmdir2(path); } 
  catch(err) { return err.code; }
  return undefined;
}

export async function deleteNotebook(notebookPath: NotebookPath): Promise<undefined|string> {
  const path = absDirPathFromNotebookPath(notebookPath);
  debug(`Deleting notebook directory ${path}`);
  try { await rimraf2(path); }
  catch(err) { return err.code; }
  return undefined;
}

export async function getCredentials(): Promise<Credentials> {
  const credentialsPath = join(homeDir(), CREDENTIALS_FILENAME);
  const credentialsJson = await readFile2(credentialsPath, 'utf8');
  return JSON.parse(credentialsJson);
}

// TYPESCRIPT: file path type?
export async function getListOfNotebooksAndFoldersInFolder(path: FolderPath): Promise<NotebooksAndFolders> {
  const rDir = rootDir();
  const dirPath = join(rDir, path)
  const names = await readdir2(dirPath);
  const paths = names.map(n=>join(path, n));
  const fullPaths = paths.map(p=>join(rDir, p));
  const statss = await Promise.all(fullPaths.map(fp=>stat2(fp)));

  const notebooks: NotebookEntry[] = [];
  const folders: FolderEntry[] = [];

  for (let i=0; i < names.length; i++) {
    const name = names[i];
    const path = paths[i];
    const stats = statss[i];

    if (name.startsWith(".")) { /* skip hidden */ continue; }
    if (!stats.isDirectory()) { /* skip non-directories */ continue; }

    // Notebooks are directories that end with .mtnb.
    // Folders are all other directories.
    if (name.endsWith(NOTEBOOK_DIR_SUFFIX)) {
      const nameWithoutSuffix = name.slice(0, -NOTEBOOK_DIR_SUFFIX_LEN);
      notebooks.push({ name: nameWithoutSuffix, path: path+'/' })
    } else {
      folders.push({ name, path: path+'/' })
    }
  }
  return { notebooks, folders };
}

export function notebookPathFromFolderPathAndName(folderPath: FolderPath, notebookName: NotebookName): NotebookPath {
  return join(folderPath, notebookName + NOTEBOOK_DIR_SUFFIX) + '/';
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
  return join(homeDir(), ROOT_DIR_NAME);
}

export async function writeNotebookFile(notebookPath: NotebookPath, json: string): Promise<void> {
  if (!isValidNotebookPath(notebookPath)) {
    throw new Error(`Invalid notebook path: ${notebookPath}`);
  }
  const filePath = absFilePathFromNotebookPath(notebookPath);
  await writeFile2(filePath, json, NOTEBOOK_ENCODING)

}

// HELPER FUNCTIONS

function absFilePathFromNotebookPath(notebookPath: NotebookPath): AbsFilePath {
  return join(absDirPathFromNotebookPath(notebookPath), NOTEBOOK_FILE_NAME);
}

// REVIEW: Memoize or save in global?
export function homeDir(): AbsDirectoryPath {
  const rval = process.env.HOME;
  if (!rval) { throw new Error("HOME environment variable not set."); }
  return rval;
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
