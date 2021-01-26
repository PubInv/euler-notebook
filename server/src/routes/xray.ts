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

// Requirements

import * as debug1 from "debug";
// import * as multer from "multer";

import { NextFunction, Request, Response, Router } from "express";

import { NotebookPath, NOTEBOOK_PATH_RE } from "../shared/folder";

import { ServerNotebook } from "../server-notebook";

// import { NotebookName, NotebookChangeRequest } from "./shared/euler-notebook-api";

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// const upload = multer(); // defaults to memory storage.

// Types

// Constants

// REVIEW: This duplicates functionality in client/debug-popup.ts. Share?
const JAVASCRIPT=`
document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('body').addEventListener('click', (event) => {
    const $target = event.target;
    if ($target.tagName == 'SPAN') {
      if ($target.classList.contains('collapsed')) {
        $target.nextElementSibling.style.display = 'block';
        $target.classList.remove('collapsed');
        $target.classList.add('expanded');
      } else if ($target.classList.contains('expanded')) {
        $target.nextElementSibling.style.display = 'none';
        $target.classList.remove('expanded');
        $target.classList.add('collapsed');
      }
    }
  });
});
`;

// REVIEW: This duplicates functionality in server/public/stylesheets/notebook.styl. Share?
const STYLESHEET=`
.collapsed::before { content: "\\0025b6 "; }
.expanded::before { content: "\\0025bc "; }
.leaf::before { content: "\\0025cf "; }
.nested { padding-left: 1em; }
`;

// Globals

export var router = Router();

// Routes

router.get(NOTEBOOK_PATH_RE, onXrayPage);

// Route Handler Functions

async function onXrayPage(req: Request, res: Response, next: NextFunction): Promise<void> {
  const notebookPath = <NotebookPath>req.path;
  try {
    debug(`Debug rendering: ${notebookPath}`);
    if (!ServerNotebook.isValidNotebookPath(notebookPath)) { return next(); }
    const notebook: ServerNotebook = await ServerNotebook.open(notebookPath, { mustExist: true });
    try {
      const notebookHtml = await notebook.toHtml();
      const html = `<html><head><style>${STYLESHEET}</style><script>${JAVASCRIPT}</script></head><body>${notebookHtml}</body>`;

      res.set('Content-Type', 'text/html');
      res.send(html);
    } finally {
      notebook.close();
    }
  } catch(err) {
    // TODO: Graceful error message if notebook not found.
    // if (err.code == 'ENOENT') {
    //   const locals = {
    //     title: "Notebook Not Found",
    //     messageHtml: `Notebook <tt>${notebookPath}</tt> not found for debug rendering.`,
    //   }
    //   return res.status(404).render('expected-error', locals);
    // }

    res.status(404).send(`Can't render debug '${notebookPath}': ${err.message}`);
  }
}

// Helper Functions
