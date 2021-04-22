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

// TODO: Check that user has permissions to read the notebook.
// TODO: Shared defs/symbols. This should make the PDFs much smaller.

// Requirements

import { Writable } from 'stream';

import * as debug1 from "debug";
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

import { NextFunction, Request, Response, Router } from "express";

import { NotebookPath, NOTEBOOK_PATH_RE } from "../shared/folder";
import { ServerNotebook } from "../models/server-notebook";
import * as PDFDocument from "pdfkit";
// @ts-ignore
import * as SVGtoPDF from "svg-to-pdfkit";


// This is a fun extention suggested by the SVGtoPDF makers...

// Possibly this could be typed; not sure---maybe we could type
// our addition?
// @ts-ignore
PDFDocument.prototype.addSVG = function(svg, x, y, options) {
  return SVGtoPDF(this, svg, x, y, options), this;
};


// Constants

// Globals

export var router = Router();

// Routes

router.get(NOTEBOOK_PATH_RE, onPdfPage);

// Route Handler Functions

async function onPdfPage(req: Request, res: Response, next: NextFunction): Promise<void> {
  const notebookPath = <NotebookPath>req.path;
  try {
    if (!ServerNotebook.isValidNotebookPath(notebookPath)) { return next(); }
    debug(`Exporting PDF of ${notebookPath}`);
    const notebook: ServerNotebook = await ServerNotebook.open(notebookPath);
    try {
      res.setHeader('Content-type', 'application/pdf');
      await generatePdf(res, notebook);
    } finally {
      notebook.close();
    }
  } catch(err) {
    res.status(404).send(`Can't export pdf of ${notebookPath}: ${err.message}`);
  }
}

// Helper Functions
async function generatePdf(res: Writable, notebook: ServerNotebook): Promise<void> {
  return new Promise(async (resolve, reject)=>{
    let doc = new PDFDocument({
      size: "letter",
      bufferPages:true
    });
    res.on('finish', function() { resolve(); });
    res.on('error', function(err){ reject(err); });
    doc.pipe(res);

    const pageInfos = notebook.pages();
    for (let i=0; i<pageInfos.length; i++) {
      const pageInfo = pageInfos[i];
      if (i>0) { doc.addPage(); }
      const svgMarkup = notebook.renderPageToSvg(pageInfo);
      SVGtoPDF(doc, svgMarkup, 0, 0, null);
    }

    doc.flushPages();
    doc.end();
  });
}
