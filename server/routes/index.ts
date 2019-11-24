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
import * as multer from 'multer'

import { NextFunction, Request, Response, Router } from 'express';

import { ClientSocket } from '../client-socket';
import { ServerNotebook } from '../server-notebook';
import { isValidNotebookPath, getListOfNotebooksAndFoldersInFolder,
          isValidFolderName, createFolder, FolderPath, NotebookPath, FOLDER_PATH_RE, isValidNotebookName,
          notebookPathFromFolderPathAndName, NOTEBOOK_PATH_RE, isValidFolderPath, deleteFolder, deleteNotebook } from '../files-and-folders';
import { Credentials, getCredentials } from '../config';

import { NotebookName, NotebookChangeRequest } from '../../client/math-tablet-api';

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

const upload = multer(); // defaults to memory storage.

// Types

type ImportFile = NotebookChangeRequest[];

type Uri = string;

interface FolderPageBody {
  action: 'deleteSelected'|'importFile'|'newFolder'|'newNotebook';

  // 'deleteSelected' fields
  folders?: { [ path: string]: FolderPath },
  notebooks?: { [ path: string]: NotebookPath },

  // 'folderName' fields
  folderName?: string;

  // 'newNotebook' fields
  notebookName?: string;
}

interface PageMessages {
  banner: string[];
  error: string[];
  warning: string[];
  success: string[];
}

// Constants

// Globals

export var router = Router();

let gCredentials: Credentials|undefined;

// Routes

router.get('/dashboard', onDashboard);
router.post('/dashboard', onDashboard);

router.get(NOTEBOOK_PATH_RE, onNotebookPage);
router.post(NOTEBOOK_PATH_RE, onNotebookPage);

router.get(FOLDER_PATH_RE, onFolderPage);
router.post(FOLDER_PATH_RE, upload.single('importFile'), onFolderPage);

// Route Handler Functions

async function onDashboard(req: Request, res: Response) {
  try {

    if (req.method == 'POST') {
      const action = req.body.action;
      switch(action) {
      case 'closeClient': {
        for (const clientId of Object.keys(req.body.clientSockets)) {
          debug(`Closing client ${clientId}`);
          await ClientSocket.close(clientId, 4000, 'dashboard');
        }
        break;
      }
      case 'closeNotebook': {
        for (const notebookName of Object.keys(req.body.notebooks)) {
          debug(`Closing client ${notebookName}`);
          await ServerNotebook.close(notebookName);
        }
        break;
      }
      default: {
        console.error(`Unknown dashboard post action: ${action}`);
        break;
      }}
    }

    // REVIEW: Does Pug support iteration over iterables? If so, then we don't need to convert to an array.
    //         Pug issue 2559 (https://github.com/pugjs/pug/issues/2559), last updated Mar 2017, says no.
    const clientSockets: ClientSocket[] = Array.from(ClientSocket.allSockets());
    const notebooks: ServerNotebook[] = Array.from(ServerNotebook.allNotebooks());

    res.render('dashboard', { clientSockets, notebooks });
  } catch(err) {
    console.error(err.message);
    debug(err.stack);
    res.send(`Server crash in onDashboard: ${err.message}`);
  }
}

async function onFolderPage(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const path = req.path;
  const body: FolderPageBody = req.body;
  try {
    const pathSegments = path == '/' ? [] : path.slice(1, -1).split('/');
    const messages: PageMessages = { banner: [], error: [], success: [], warning: [] };

    let redirectUri: Uri|undefined;
    if (req.method == 'POST') {
      const action = body.action;
      switch (action) {
      case 'deleteSelected':  redirectUri = await deleteSelected(body, path, messages); break;
      case 'importFile':      redirectUri = await importFile(req.file, path, messages); break;
      case 'newFolder':       redirectUri = await newFolder(body, path, messages); break;
      case 'newNotebook':     redirectUri = await newNotebook(body, path, messages); break;
      default:
        messages.error.push(`Unknown form action: ${action}`);
        break;
      }
    }

    if (redirectUri) { return res.redirect(redirectUri); }

    const { notebooks, folders } = await getListOfNotebooksAndFoldersInFolder(path);
    const locals = { folders, messages, notebooks, pathSegments };
    res.render('folder', locals);

  } catch(err) {
    res.status(404).send(`Can't open path '${path}': ${err.message}`);
  }
}

async function onNotebookPage(req: Request, res: Response, next: NextFunction): Promise<void> {
  const notebookPath = req.path;
  try {
    const pathSegments = notebookPath.slice(1, -1).split('/');
    const notebookName = pathSegments.pop()!.slice(0, -5);
    if (!gCredentials) { gCredentials = await getCredentials(); }
    if (!isValidNotebookPath(notebookPath)) { return next(); }
    await ServerNotebook.open(notebookPath);
    const locals = { credentials: gCredentials, /* messages, */ notebookName, pathSegments };
    res.render('notebook', locals);
  } catch(err) {
    res.status(404).send(`Can't open notebook '${notebookPath}': ${err.message}`);
  }
}

// Helper Functions

async function deleteSelected(body: FolderPageBody, _folderPath: FolderPath, messages: PageMessages): Promise<Uri|undefined> {

  // LATER: The way we construct the success message is not easily localized.
  if (!body.folders && !body.notebooks) {
    messages.warning.push("No folders or files selected. Select using checkboxes.");
    return undefined;
  }

  const msgSegments = [];
  if (body.folders) {
    let numDeleted = 0;
    for (const folderName in body.folders) {
      const folderPath = body.folders[folderName];
      if (!isValidFolderPath(folderPath)) { throw new Error(`Invalid folder path: ${folderPath}`); }
      const errCode = await deleteFolder(folderPath);
      if (!errCode) {
        numDeleted++;
      } else if (errCode == 'ENOTEMPTY') {
        messages.error.push(`Cannot delete non-empty folder '${folderName}'`)
      } else {
        messages.error.push(`Cannot delete folder '${folderName}': ${errCode}`)
      }
    }
    msgSegments.push(numDeleted==1 ? "1 folder": `${numDeleted} folders`);
  }

  if (body.notebooks) {
    let numDeleted = 0;
    for (const notebookName in body.notebooks) {
      const notebookPath = body.notebooks[notebookName];
      if (!isValidNotebookPath(notebookPath)) { throw new Error(`Invalid notebook path: ${notebookPath}`); }
      const errCode = await deleteNotebook(notebookPath);
      if (!errCode) {
        numDeleted++;
      } else {
        messages.error.push(`Cannot delete notebook '${notebookName}': ${errCode}`)
      }
    }
    msgSegments.push(numDeleted==1 ? "1 notebook" : `${numDeleted} notebooks`);
  }

  messages.success.push(`${msgSegments.join(" and ")} deleted.`)
  return undefined;
}

function generateScratchNotebookName(): string {
  var d = new Date();
  const ymd = `${d.getFullYear()}${zeroPad(d.getMonth()+1)}${zeroPad(d.getDate())}`;
  const hms = `${zeroPad(d.getHours())}${zeroPad(d.getMinutes())}${zeroPad(d.getSeconds())}`;
  const rval: NotebookName = `scratch_${ymd}_${hms}`;
  return rval;
}

async function importFile(multerFile: Express.Multer.File, folderPath: FolderPath, messages: PageMessages): Promise<Uri|undefined> {
  // console.log(`Importing ${multerFile.originalname} into ${folderPath}.`);

  // Convert the file buffer to a JSON object
  const json = multerFile.buffer.toString();
  let changes: ImportFile;
  try {
    changes = JSON.parse(json);
  } catch(err) {
    messages.error.push(`Import failed. '${multerFile.originalname}' isn't valid JSON: ${err.message}`);
    return undefined;
  }

  const invalidReason = validateImportData(changes);
  if (invalidReason) {
    messages.error.push(`Import failed. '${multerFile.originalname}' isn't valid: ${invalidReason}`);
    return undefined;
  }

  // Notebook name is original filename minus the .json extension.
  const notebookName = multerFile.originalname.slice(0, -5);
  if (!isValidNotebookName(notebookName)) {
    // TODO: Let user specify notebook name, or generate a valid one instead of failing.
    messages.error.push(`Import failed: Invalid notebook name: '${notebookName}'`);
    return undefined;
  }

  const notebookPath = notebookPathFromFolderPathAndName(folderPath, notebookName);

  // Attempt to open the notebook file, hoping to fail.
  try {
    await ServerNotebook.open(notebookPath);
    // TODO: Close notebook? But what if it has listeners?
    // TODO: Generate alternate notebook name, e.g. add increasing number suffix.
    throw new Error(`Import failed: Notebook already exists: ${notebookPath}`);
  } catch(err) {
    // Good! Notebook doesn't exist!
  }

  // Create the notebook folder, then create the notebook JSON file.
  await createFolder(notebookPath);
  const notebook = await ServerNotebook.create(notebookPath);

  // Insert imported data into the notebook.
  await notebook.requestChanges('USER', changes);

  messages.success.push(`File imported successfully.`);
  return notebookPath;
}

// Returns URI for the new folder to redirect to if creation succeeds.
// Otherwise, returns undefined, and messages contains an error message to be displayed.
async function newFolder(body: FolderPageBody, folderPath: FolderPath, messages: PageMessages): Promise<Uri|undefined> {
  const folderName = body.folderName!.trim();
  if (!isValidFolderName(folderName)) {
    messages.error.push(`Invalid folder name: '${folderName}'`);
    return undefined;
  }
  const newFolderPath = `${folderPath}${folderName}/`;
  // REVIEW: Additional safety checks on folder path?
  await createFolder(newFolderPath);
  messages.success.push(`Folder '${folderName}' created successfully.`);
  return `${newFolderPath}`;
}

// Returns URI for the new notebook to redirect to if creation succeeds.
// Otherwise, returns undefined, and messages contains an error message to be displayed.
async function newNotebook(body: FolderPageBody, folderPath: FolderPath, messages: PageMessages): Promise<Uri|undefined> {

  const notebookName = body.notebookName!.trim() || generateScratchNotebookName();

  if (!isValidNotebookName(notebookName)) {
    messages.error.push(`Invalid notebook name: '${notebookName}'`);
    return undefined;
  }
  const notebookPath = notebookPathFromFolderPathAndName(folderPath, notebookName);

  // Attempt to open the notebook file, hoping to fail.
  try {
    await ServerNotebook.open(notebookPath);
    // TODO: Close notebook? But what if it has listeners?
    throw new Error(`Notebook already exists: ${notebookPath}`);
  } catch(err) {
    // Good! Notebook doesn't exist!
  }

  // Create the notebook folder, then create the notebook JSON file.
  await createFolder(notebookPath);
  await ServerNotebook.create(notebookPath);

  messages.success.push(`Notebook '${notebookName}' created successfully.`);
  return notebookPath;
}

function validateImportData(obj: any): string|undefined {
  // Returns undefined if the object is valid,
  // or a string describing why the object is invalid.
  let rval: string|undefined = undefined;
  if (!(obj instanceof Array)) {
    rval = "Does not have array at top level.";
  } else {
    for (let i=0; i<obj.length; i++) {
      rval = validateNotebookChangeRequest(obj[i], i)
      if (rval) { break; }
    }
  }
  return rval;
}

function validateNotebookChangeRequest(_entry: NotebookChangeRequest, _i: number): string|undefined {

  // TODO:
  return undefined;
}

function zeroPad(n: number): string {
  return ('0'+n).slice(-2);
}

