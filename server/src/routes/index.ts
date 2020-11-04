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

import * as debug1 from "debug";
// import * as multer from "multer";

import { NextFunction, Request, Response, Router } from "express";

import { NotebookPath } from "../shared/folder";

import { ServerSocket } from "../server-socket";
import { ServerNotebook } from "../server-notebook";
import { ServerFolder } from "../server-folder";

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
          await ServerSocket.close(clientId, 4000, 'dashboard');
        }
        break;
      }
      case 'closeNotebook': {
        for (const path of <NotebookPath[]>Object.keys(req.body.notebooks)) {
          debug(`Closing client ${path}`);
          ServerNotebook.close(path, "Notebook closed by administrator.");
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
    const clientSockets: ServerSocket[] = Array.from(ServerSocket.allInstances);
    const folders: ServerFolder[] = Array.from(ServerFolder.allInstances);
    const notebooks: ServerNotebook[] = Array.from(ServerNotebook.allInstances);

    res.render('dashboard', { clientSockets, folders, notebooks });
  } catch(err) {
    console.error(err.message);
    debug(err.stack);
    res.send(`Server crash in onDashboard: ${err.message}`);
  }
}

async function onIndexPage(_req: Request, res: Response, _next: NextFunction): Promise<void> {
  res.render('index');
}
