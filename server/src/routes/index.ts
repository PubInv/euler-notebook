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
// import * as multer from 'multer'

import { NextFunction, Request, Response, Router } from 'express';

import { NotebookPath } from '../shared/folder';

import { ClientSocket } from '../client-socket';
import { ServerNotebook } from '../server-notebook';

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// Constants

// Globals

export var router = Router();

// Routes

router.get('/dashboard', onDashboard);
router.post('/dashboard', onDashboard);

router.get('/', onIndexPage);
router.post('/', onIndexPage);

// router.get(FOLDER_PATH_RE, onFolderPage);
// // TODO: Move importing to import-export router.
// router.post(FOLDER_PATH_RE, upload.single('importFile'), onFolderPage);

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
        for (const notebookPath of <NotebookPath[]>Object.keys(req.body.notebooks)) {
          debug(`Closing client ${notebookPath}`);
          await ServerNotebook.close(notebookPath);
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

// async function onFolderPage(req: Request, res: Response, _next: NextFunction): Promise<void> {
//   const path = <FolderPath>req.path;
//   const body: FolderPageBody = req.body;
//   try {
//     const pathSegments = path == '/' ? [] : path.slice(1, -1).split('/');
//     const messages: PageMessages = { banner: [], error: [], success: [], warning: [] };

//     let redirectUri: Uri|undefined;
//     if (req.method == 'POST') {
//       const action = body.action;
//       switch (action) {
//       case 'deleteSelected':  redirectUri = await deleteSelected(body, path, messages); break;
//       case 'importFile':      redirectUri = await importFile(req.file, path, messages); break;
//       case 'newFolder':       redirectUri = await newFolder(body, path, messages); break;
//       case 'newNotebook':     redirectUri = await newNotebook(body, path, messages); break;
//       default:
//         messages.error.push(`Unknown form action: ${action}`);
//         break;
//       }
//     }

//     if (redirectUri) { return res.redirect(redirectUri); }

//     const { notebooks, folders } = await getListOfNotebooksAndFoldersInFolder(path);
//     const locals = { folders, messages, notebooks, pathSegments };
//     res.render('folder', locals);

//   } catch(err) {
//     res.status(404).send(`Can't open path '${path}': ${err.message}`);
//   }
// }

async function onIndexPage(_req: Request, res: Response, _next: NextFunction): Promise<void> {
  res.render('index');

  // const notebookPath = <NotebookPath>req.path;
  // try {
  //   const pathSegments = notebookPath.slice(1, -1).split('/');
  //   const notebookName = pathSegments.pop()!.slice(0, -5);
  //   if (!isValidNotebookPath(notebookPath)) { return next(); }
  //   await ServerNotebook.open(notebookPath);
  //   const locals = { /* messages, */ notebookName, pathSegments };
  //   res.render('index', locals);
  // } catch(err) {
  //   const locals = {
  //     title: "Can't Open Notebook",
  //     messageHtml: `Cannot open notebook <tt>${notebookPath}</tt>:`,
  //     messageDetails: err.message
  //   }
  //   return res.status(400).render('expected-error', locals)

  //   res.status(404).send(`Can't open notebook '${notebookPath}': ${err.message}`);
  // }
}

// Helper Functions

// async function deleteSelected(body: FolderPageBody, _folderPath: FolderPath, messages: PageMessages): Promise<Uri|undefined> {

//   // LATER: The way we construct the success message is not easily localized.
//   if (!body.folders && !body.notebooks) {
//     messages.warning.push("No folders or files selected. Select using checkboxes.");
//     return undefined;
//   }

//   const msgSegments = [];
//   if (body.folders) {
//     let numDeleted = 0;
//     for (const folderName in body.folders) {
//       const folderPath = body.folders[folderName];
//       if (!isValidFolderPath(folderPath)) { throw new Error(`Invalid folder path: ${folderPath}`); }
//       const errCode = await deleteFolder(folderPath);
//       if (!errCode) {
//         numDeleted++;
//       } else if (errCode == 'ENOTEMPTY') {
//         messages.error.push(`Cannot delete non-empty folder '${folderName}'`)
//       } else {
//         messages.error.push(`Cannot delete folder '${folderName}': ${errCode}`)
//       }
//     }
//     msgSegments.push(numDeleted==1 ? "1 folder": `${numDeleted} folders`);
//   }

//   if (body.notebooks) {
//     let numDeleted = 0;
//     for (const notebookName in body.notebooks) {
//       const notebookPath = body.notebooks[notebookName];
//       if (!isValidNotebookPath(notebookPath)) { throw new Error(`Invalid notebook path: ${notebookPath}`); }
//       const errCode = await deleteNotebook(notebookPath);
//       if (!errCode) {
//         numDeleted++;
//       } else {
//         messages.error.push(`Cannot delete notebook '${notebookName}': ${errCode}`)
//       }
//     }
//     msgSegments.push(numDeleted==1 ? "1 notebook" : `${numDeleted} notebooks`);
//   }

//   messages.success.push(`${msgSegments.join(" and ")} deleted.`)
//   return undefined;
// }



// Returns URI for the new folder to redirect to if creation succeeds.
// Otherwise, returns undefined, and messages contains an error message to be displayed.

// Returns URI for the new notebook to redirect to if creation succeeds.
// Otherwise, returns undefined, and messages contains an error message to be displayed.




