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

import { join } from 'path';

import { NextFunction, Request, Response, Router } from 'express';

// import { NotebookPath } from '../../client/math-tablet-api';

import { ClientSocket } from '../client-socket';
import { TDoc } from '../tdoc';
import { Credentials, getCredentials, isValidNotebookPath, getListOfNotebooksAndFoldersInFolder,
          isValidFolderName, createFolder, FolderPath, isValidNotebookName, notebookPathFromFolderPathAndName } from '../users-and-files';

// Exports

export var router = Router();

// Types

interface FolderPageBody {
  action: 'newFolder'|'newNotebook';

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

let gCredentials: Credentials|undefined;

// Routes

router.get('/dashboard', onDashboard);
router.post('/dashboard', onDashboard);

router.get('/*.mtnb', onNotebookPage);
router.post('/*.mtnb', onNotebookPage);

router.get('/*', onFolderPage);
router.post('/*', onFolderPage);

// Route Handler Functions

async function onNotebookPage(req: Request, res: Response, next: NextFunction): Promise<void> {
  const notebookPath = req.path.slice(1);
  try {
    if (!gCredentials) { gCredentials = await getCredentials(); }
    if (!isValidNotebookPath(notebookPath)) { return next(); }
    await TDoc.open(notebookPath, {/* default options */});
    res.render('notebook', { credentials: gCredentials, /* messages, */ notebookPath });
  } catch(err) {
    console.dir(err);
    res.status(404).send(`Can't open notebook '${notebookPath}': ${err.message}`);
  }
}

async function onFolderPage(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const path = req.path.slice(1);
  const body: FolderPageBody = req.body;
  try {
    const messages: PageMessages = { banner: [], error: [], success: [], warning: [] };

    if (req.method == 'POST') {
      const action = body.action;
      switch (action) {
      case 'newFolder': await newFolder(body, path, messages); break;
      case 'newNotebook': await newNotebook(body, path, messages); break;
      default:
        messages.error.push(`Unknown form action: ${action}`);
        break;
      }
    }

    const { notebooks, folders } = await getListOfNotebooksAndFoldersInFolder(path);
    res.render('folder', { folders, messages, notebooks, path });

  } catch(err) {
    res.status(404).send(`Can't open path '${path}': ${err.message}`);
  }
}

async function onDashboard(req: Request, res: Response) {
  try {

    if (req.method == 'POST') {
      console.dir(req.body);
      const action = req.body.action;
      switch(action) {
      case 'closeClient': {
        for (const clientId of Object.keys(req.body.clientSockets)) {
          console.log(`Closing client ${clientId}`);
          await ClientSocket.close(clientId, 4000, 'dashboard');
        }
        break;
      }
      case 'closeNotebook': {
        for (const notebookName of Object.keys(req.body.notebooks)) {
          console.log(`Closing client ${notebookName}`);
          await TDoc.close(notebookName);
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
    const tDocs: TDoc[] = Array.from(TDoc.allTDocs());

    res.render('dashboard', { clientSockets, tDocs });
  } catch(err) {
    console.error(err.message);
    console.log(err.stack);
    res.send(`Server crash in onDashboard: ${err.message}`);
  }
}

// Helper Functions

function generateScratchNotebookName(): string {
  var d = new Date();
  return `Scratch${d.getFullYear()}${zeroPad(d.getMonth()+1)}${zeroPad(d.getDate())}${zeroPad(d.getHours())}${zeroPad(d.getMinutes())}`;
}

async function newFolder(body: FolderPageBody, path: FolderPath, messages: PageMessages): Promise<void> {
  const folderName = body.folderName!.trim();
  if (!isValidFolderName(folderName)) {
    messages.error.push(`Invalid folder name: '${folderName}'`);
    return;
  }
  const folderPath = join(path, folderName);
  // TODO: Safety checks on folder path?
  await createFolder(folderPath);
  messages.success.push(`Folder '${folderName}' created successfully.`);
  // LATER: redirect to new folder.
}

async function newNotebook(body: FolderPageBody, folderPath: FolderPath, messages: PageMessages): Promise<void> {

  const notebookName = body.notebookName!.trim() || generateScratchNotebookName();

  if (!isValidNotebookName(notebookName)) {
    messages.error.push(`Invalid notebook name: '${notebookName}'`);
    return;
  }
  const notebookPath = notebookPathFromFolderPathAndName(folderPath, notebookName);

  // Attempt to open the notebook file, hoping to fail.
  try {
    /*const tDoc = */ await TDoc.open(notebookPath, {/* default options */});
    // TODO: Close TDoc? But what if it has listeners?
    throw new Error(`Notebook already exists: ${notebookPath}`);
  } catch(err) {
    // Good! Notebook doesn't exist!
  }

  // Create the notebook folder, then create the notebook JSON file.
  await createFolder(notebookPath);
  await TDoc.create(notebookPath, {/* default options */});

  messages.success.push(`Notebook '${notebookName}' created successfully.`);
  // LATER: Redirect to notebook itself.
}

function zeroPad(n: number): string {
  return ('0'+n).slice(-2);
}

