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

import { NextFunction, Request, Response, Router } from 'express';

import { NotebookName, UserName } from '../../client/math-tablet-api';

import { TDoc } from '../tdoc';
import { checkNotebookExists, checkUserExists, checkUsrDirExists, Credentials, getCredentials, getListOfUsers, getListOfUsersNotebooks, isValidUserName, isValidNotebookName } from '../users-and-files';

// Exports

export var router = Router();

// Types

interface PageMessages {
  banner: string[];
  error: string[];
  warning: string[];
  success: string[];
}

// Globals

let gCredentials: Credentials|undefined;

// Routes

router.get('/', async function(req: Request, res: Response, next: NextFunction) {
  try { await onIndexPage(req, res, next); }
  catch(err) {
    console.error(err.message);
    console.log(err.stack);
    res.send(`Server crash: ${err.message}`);
  }
});

router.get('/:userName', async function(req: Request, res: Response, next: NextFunction) {
  try { await onUserPage(req, res, next); }
  catch(err) {
    console.error(err.message);
    console.log(err.stack);
    res.send(`Server crash: ${err.message}`);
  }
});

router.post('/:userName', async function(req: Request, res: Response, next: NextFunction) {
  try { await onUserPage(req, res, next); }
  catch(err) {
    console.error(err.message);
    console.log(err.stack);
    res.send(`Server crash: ${err.message}`);
  }
});

router.get('/:userName/:notebookName', async function(req: Request, res: Response, next: NextFunction) {
  try { await onNotebookPage(req, res, next); }
  catch(err) {
    console.error(err.message);
    console.log(err.stack);
    res.send(`Server crash: ${err.message}`);
  }
});

async function onIndexPage(_req: Request, res: Response, _next: NextFunction): Promise<void> {
  if (await checkUsrDirExists()) {
    const messages: PageMessages = { banner: [ "Welcome to Math Tablet!" ], error: [], success: [], warning: [] };
    const userEntries = await getListOfUsers();
    res.render('index', { messages, userEntries });
  } else {
    res.status(404).send(`Math Tablet usr directory doesn't exist.`);
  }
}

async function onNotebookPage(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userName = req.params.userName;
  if (!isValidUserName(userName)) { return next(); }
  const notebookName = req.params.notebookName;
  if (!isValidNotebookName(notebookName)) { return next(); }
  if (await checkNotebookExists(userName, notebookName)) {
    // const messages: PageMessages = { banner: [], error: [], success: [], warning: [] };
    // Load credentials on demand
    if (!gCredentials) { gCredentials = await getCredentials(); }
    res.render('notebook', { credentials: gCredentials, /* messages, */ userName, notebookName });
  } else {
    if (await checkUserExists(userName)) {
      // LATER: Redirect back to user home page and show an error message.
      res.status(404).send(`User ${userName} doesn't have notebook '${notebookName}'.`);
    } else {
      // LATER: Redirect back to home page and show an error message.
      res.status(404).send(`User ${userName} doesn't exist.`);
    }
  }
}

async function onUserPage(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userName: UserName = req.params.userName;
  if (!isValidUserName(userName)) { return next(); }
  if (await checkUserExists(userName)) {
    const messages: PageMessages = { banner: [], error: [], success: [], warning: [] };

    if (req.method == 'POST') {
      const action = req.body.action;
      switch (action) {
      case 'newNotebook': {
        const notebookName = req.body.notebookName.trim();
        await newNotebook(userName, notebookName, messages);
        break;
      }
      default:
        messages.error.push(`Unknown form action: ${req.body.action}`);
        break;
      }
    }

    const notebookEntries = await getListOfUsersNotebooks(userName);
    res.render('user-home', { messages, notebookEntries, userName });
  } else {
    // LATER: Redirect back to home page and show an error message.
    res.status(404).send(`User ${userName} doesn't exist.`);
  }
}

// Helper Functions

function getScratchNotebookName(): string {
  var d = new Date();
  return `Scratch${d.getFullYear()}${zeroPad(d.getMonth()+1)}${zeroPad(d.getDate())}${zeroPad(d.getHours())}${zeroPad(d.getMinutes())}`;
}

async function newNotebook(userName: UserName, notebookName: NotebookName, messages: PageMessages): Promise<void> {
  if (!notebookName) { notebookName = getScratchNotebookName(); }

  if (!isValidNotebookName(notebookName)) {
    messages.error.push(`'${notebookName}' is not a valid notebook name.`);
  } else if (await checkNotebookExists(userName, notebookName)) {
    messages.error.push(`A notebook named '${notebookName}' already exists.`);
  } else {
    const name = `${userName}/${notebookName}`;
    await TDoc.create(name, {/* default options */});
    // LATER: Redirect to notebook itself.
    messages.success.push(`Notebook '${notebookName}' created successfully.`);
  }
}

function zeroPad(n: number): string {
  return ('0'+n).slice(-2);
}

