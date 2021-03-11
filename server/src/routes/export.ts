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
import * as nodeLatex from "node-latex";
// import * as multer from "multer";

import { NextFunction, Request, Response, Router } from "express";

import { NotebookPath, NOTEBOOK_PATH_RE } from "../shared/folder";

import { globalConfig } from "../config";
import { ServerNotebook } from "../models/server-notebook";

// import { NotebookName, NotebookChangeRequest } from "./shared/euler-notebook-api";

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// const upload = multer(); // defaults to memory storage.

// Types

type ExportFormat = 'latex'|'pdf';

// Constants

const LATEX_MIME_TYPE = 'application/x-latex';
const PDF_MIME_TYPE = 'application/pdf';

const FILE_EXTENSIONS = new Map<ExportFormat, string>([
  ['latex', 'tex'],
  ['pdf', 'pdf'],
])

// Globals

export var router = Router();

// Routes

router.get(NOTEBOOK_PATH_RE, onExportPage);

// Route Handler Functions

async function onExportPage(req: Request, res: Response, next: NextFunction): Promise<void> {
  const notebookPath = <NotebookPath>req.path;
  const exportFormat = <ExportFormat>req.query.f || 'pdf';
  try {
    // TODO: validate export format
    debug(`Exporting ${exportFormat} ${notebookPath}`);

    if (!ServerNotebook.isValidNotebookPath(notebookPath)) { return next(); }

    const fileExtension = FILE_EXTENSIONS.get(exportFormat);
    if (!fileExtension) {
      const locals = {
        title: "Invalid Export Format",
        messageHtml: `Notebook <tt>${exportFormat}</tt> not found for export.`,
      }
      return res.status(400).render('expected-error', locals)
    }

    const notebook: ServerNotebook = await ServerNotebook.open(notebookPath);
    try {
      const latex = "TODO: Not implemented." // await notebook.exportLatex();

      switch(exportFormat) {
        case 'latex':
          // LaTeX source requested.
          // REVIEW: Shouldn't we have notebook.name property?
          const downloadFilename = `${ServerNotebook.nameFromPath(notebookPath)}.${fileExtension}`;
          res.set('Content-Type', LATEX_MIME_TYPE);
          res.set('Content-Disposition', `attachment; filename="${downloadFilename}"`);
          res.send(latex);
          break;
        case 'pdf': {
          // PDF requested
          // TODO: If pdflatex is not found this will crash the server.
          // TODO: Update readme for LaTeX installation.
          const options = globalConfig.nodeLatex;
          const pdf = (</* TYPESCRIPT: */any>nodeLatex)(latex, options);
          res.set('Content-Type', PDF_MIME_TYPE);
          pdf.pipe(res);
          pdf.on('error', (err: Error)=>{
            console.error(`ERROR: Error generating LaTeX for export: ${err}`);
            res.set('Content-Type', 'text/html');
            res.status(500);
            const locals = {
              title: "Error Generating LaTeX",
              messageHtml: `An error occurred generating LaTeX for <tt>${notebookPath}</tt>:`,
              messageDetails: err.toString(),
            }
            res.render('expected-error', locals);
          });
          // pdf.on('finish', ()=> console.log('PDF generated!'));
          break;
        }
        default:
          throw new Error(`Unexpected export format '${exportFormat}'.`)
      }
    } finally {
      notebook.close();
    }

  } catch(err) {
      // TODO: If opening notebook fails then give a graceful error message.
      // // REVIEW: Is this still the error that is generated if the notebook file doesn't exist?
      // if (err.code == 'ENOENT') {
      //   const locals = {
      //     title: "Notebook Not Found",
      //     messageHtml: `Notebook <tt>${notebookPath}</tt> not found for export.`,
      //   }
      //   return res.status(404).render('expected-error', locals);
      // }

    res.status(404).send(`Can't export '${notebookPath}': ${err.message}`);
  }
}

// Helper Functions
