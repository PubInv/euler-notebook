
// Requirements

import { readdir, readFile, readFileSync, writeFile } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

import { UserName, NotebookName } from './client/math-tablet-api';
import { TDoc } from './tdoc/tdoc-class';

const readdir2 = promisify(readdir);
const readFile2 = promisify(readFile);
const writeFile2 = promisify(writeFile);

// Types

type NotebookFileName = string;

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

// LATER: s/b async
export function getCredentials() {
  const credentialsPath = join(homeDir(), CREDENTIALS_FILENAME);
  const credentialsJson = readFileSync(credentialsPath, 'utf8');
  const credentials = JSON.parse(credentialsJson);
  return credentials;
}

export async function getListOfUsers(): Promise<UserEntry[]> {
  const directoryNames: string[] = await readdir2(join(homeDir(), USR_DIR));
  // TODO: Check which are actually directories.
  const userEntries: UserEntry[] = directoryNames.map(d=>({ userName: d }));
  return userEntries;
}

export async function getListOfUsersNotebooks(userName: UserName): Promise<NotebookEntry[]> {
  const userDirectory: /* TYPESCRIPT: FilePath */string = join(homeDir(), USR_DIR, userName)
  const filenames: string[] = await readdir2(userDirectory);
  const notebookFilenames = filenames.filter(f=>f.toLowerCase().endsWith(NOTEBOOK_FILENAME_SUFFIX));
  const notebookEntries: NotebookEntry[] = notebookFilenames.map(f=>{
    const rval: NotebookEntry = { name: f.slice(0, -NOTEBOOK_FILENAME_SUFFIX_LENGTH), fileName: f };
    return rval;
  });
  return notebookEntries;
}

export async function readNotebook(userName: UserName, notebookName: NotebookName): Promise<TDoc> {
  validateUserName(userName);
  validateNotebookName(notebookName);
  const fileName = `${notebookName}${NOTEBOOK_FILENAME_SUFFIX}`;
  const filePath = join(homeDir(), USR_DIR, userName, fileName);
  const json = await readFile2(filePath, 'utf8');
  const obj = JSON.parse(json); // TODO: catch errors
  const tDoc = TDoc.fromJsonObject(obj);
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
  if (!USER_NAME_RE.test(userName)) {
    throw new Error(`Invalid math tablet user name: ${userName}`);
  }
}

function validateNotebookName(notebookName: NotebookName): void {
  if (!NOTEBOOK_NAME_RE.test(notebookName)) {
    throw new Error(`Invalid math tablet notebook name: ${notebookName}`);
  }
}
