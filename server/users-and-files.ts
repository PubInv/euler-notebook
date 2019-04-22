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

import { readdir, readFile, stat, Stats, writeFile } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

import { UserName, NotebookName, MyScriptServerKeys } from '../client/math-tablet-api';

import { TDoc } from './tdoc';

const readdir2 = promisify(readdir);
const readFile2 = promisify(readFile);
const stat2 = promisify(stat);
const writeFile2 = promisify(writeFile);

// Types

type NotebookFileName = string;

export interface Credentials {
  myscript: MyScriptServerKeys;
}

// An entry in a list of notebooks.
// NOT an entry in a notebook.
export interface NotebookEntry {
  name: NotebookName;
  fileName: NotebookFileName;
}

export interface UserEntry {
  userName: UserName;
}

// Constants

const CREDENTIALS_FILENAME = '.math-tablet-credentials.json';
const USR_DIR = 'math-tablet-usr';

const NOTEBOOK_FILENAME_SUFFIX = '.tdoc.json';
const NOTEBOOK_FILENAME_SUFFIX_LENGTH = NOTEBOOK_FILENAME_SUFFIX.length;

// SECURITY: DO NOT ALLOW PERIODS OR SLASHES OR BACKSLASHES IN USER NAMES OR NOTEBOOK NAMES!!!
const USER_NAME_RE = /^\w+$/;
const NOTEBOOK_NAME_RE = /^\w+$/; // REVIEW: aslo allow hyphens?

// Exported functions

export async function checkNotebookExists(userName: UserName, notebookName: NotebookName): Promise<boolean> {
  validateUserName(userName);
  validateNotebookName(userName);
  const notebookFilePath = join(homeDir(), USR_DIR, userName, `${notebookName}${NOTEBOOK_FILENAME_SUFFIX}`);
  let stats: Stats|undefined;
  try {
    stats = await stat2(notebookFilePath);
  } catch(err) {
    if (err.code != 'ENOENT') { throw err; }
  }
  return !!stats;
}

export async function checkUserExists(userName: UserName): Promise<boolean> {
  validateUserName(userName);
  const userDirectory = join(homeDir(), USR_DIR, userName);
  let stats: Stats|undefined;
  try {
    stats = await stat2(userDirectory);
  } catch(err) {
    if (err.code != 'ENOENT') { throw err; }
  }
  return !!stats;
}

export async function checkUsrDirExists(): Promise<boolean> {
  const usrDirectory = join(homeDir(), USR_DIR);
  let stats: Stats|undefined;
  try {
    stats = await stat2(usrDirectory);
  } catch(err) {
    if (err.code != 'ENOENT') { throw err; }
  }
  return !!stats;
}

export async function getCredentials(): Promise<Credentials> {
  const credentialsPath = join(homeDir(), CREDENTIALS_FILENAME);
  const credentialsJson = await readFile2(credentialsPath, 'utf8');
  return JSON.parse(credentialsJson);
}

export async function getListOfUsers(): Promise<UserEntry[]> {
  const directoryNames: string[] = await readdir2(join(homeDir(), USR_DIR));
  const userEntries: UserEntry[] = directoryNames.filter(isValidUserName).map(d=>({ userName: d }));
  return userEntries;
}

export async function getListOfUsersNotebooks(userName: UserName): Promise<NotebookEntry[]> {
  const userDirectory: /* TYPESCRIPT: FilePath */string = join(homeDir(), USR_DIR, userName)
  const filenames: string[] = await readdir2(userDirectory);
  const notebookFilenames = filenames.filter(f=>f.toLowerCase().endsWith(NOTEBOOK_FILENAME_SUFFIX));
  const notebookEntries: NotebookEntry[] = notebookFilenames.map(f=>{
    const rval: NotebookEntry = { name: f.slice(0, -NOTEBOOK_FILENAME_SUFFIX_LENGTH), fileName: f };
    return rval;
  }).filter(e=>isValidNotebookName(e.name));
  return notebookEntries;
}

export function isValidUserName(userName: UserName): boolean {
  return USER_NAME_RE.test(userName);
}

export function isValidNotebookName(notebookName: NotebookName): boolean {
  return NOTEBOOK_NAME_RE.test(notebookName);
}

export async function readNotebook(userName: UserName, notebookName: NotebookName): Promise<TDoc> {
  validateUserName(userName);
  validateNotebookName(notebookName);
  const fileName = `${notebookName}${NOTEBOOK_FILENAME_SUFFIX}`;
  const filePath = join(homeDir(), USR_DIR, userName, fileName);
  const json = await readFile2(filePath, 'utf8');
  const obj = JSON.parse(json);
  const tDoc = TDoc.fromJSON(obj, notebookName);
  return tDoc;
}

export async function writeNotebook(userName: UserName, notebookName: NotebookName, notebook: TDoc): Promise<void> {
  validateUserName(userName);
  validateNotebookName(notebookName);
  const fileName = `${notebookName}${NOTEBOOK_FILENAME_SUFFIX}`;
  const filePath = join(homeDir(), USR_DIR, userName, fileName);
  const json = JSON.stringify(notebook);
  await writeFile2(filePath, json, 'utf8');
}

// HELPER FUNCTIONS

function homeDir(): string {
  const rval = process.env.HOME;
  if (!rval) { throw new Error("HOME environment variable not set."); }
  return rval;
}

function validateUserName(userName: UserName): void {
  if (!isValidUserName(userName)) {
    throw new Error(`Invalid math tablet user name: ${userName}`);
  }
}

function validateNotebookName(notebookName: NotebookName): void {
  if (!isValidNotebookName(notebookName)) {
    throw new Error(`Invalid math tablet notebook name: ${notebookName}`);
  }
}
