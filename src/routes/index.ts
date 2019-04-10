
// Requirements

import * as express from 'express';

import { UserName } from '../client/math-tablet-api';
import { checkNotebookExists, checkUserExists, getCredentials, getListOfUsers, getListOfUsersNotebooks, NotebookEntry, UserEntry } from '../users-and-files';


// Exports

export var router = express.Router();

// Types

interface PageMessages {
  banner: string[];
  error: string[];
  warning: string[];
  success: string[];
}

// Constants

// TODO: Display friendly error message if file not found or JSON parse error.
const credentials = getCredentials();

// Routes

router.get('/', async function(_req, res, _next) {
  try {
    const messages: PageMessages = { banner: [ "Welcome to Math Tablet!" ], error: [], success: [], warning: [] };
    let userEntries: UserEntry[] = [];
    try {
      userEntries = await getListOfUsers();
    } catch(err) {
      switch(err.code) {
      case 'ENOENT':
        messages.error.push(`Math Tablet usr directory doesn't exist.`);
        break;
      default:
        throw err;
      }
    }
    res.render('index', { messages, userEntries });
  } catch(err) {
    console.error(err.message);
    console.log(err.stack);
    res.send(`Server crash: ${err.message}`);
  }
});

router.get('/:userName', async function(req, res, _next) {
  try {
    const messages: PageMessages = { banner: [], error: [], success: [], warning: [] };
    const userName: UserName = req.params.userName;
    let tDocEntries: NotebookEntry[] = [];
    try {
      tDocEntries = await getListOfUsersNotebooks(userName);
    } catch(err) {
      switch(err.code) {
      case 'ENOENT':
        messages.error.push(`User '${userName}' does not exist.<br/><tt>mkdir -p ~/math-tablet-usr/${userName}</tt>`);
        break;
      default:
        throw err;
      }
    }
    res.render('user-home', { messages, user: userName, tDocEntries });
  } catch(err) {
    console.error(err.message);
    console.log(err.stack);
    res.send(`Server crash: ${err.message}`);
  }
});

router.get('/:userName/:notebookName', async function(req, res, _next) {
  try {
    const userName = req.params.userName;
    const notebookName = req.params.notebookName;
    if (await checkNotebookExists(userName, notebookName)) {
      // const messages: PageMessages = { banner: [], error: [], success: [], warning: [] };
      res.render('notebook', { credentials, /* messages */ });
    } else {
      const userExists = await checkUserExists(userName);
      if (userExists) {
        // LATER: Redirect back to user home page and show an error message.
        res.status(404).send(`User ${userName} doesn't have notebook '${notebookName}'.`);
      } else {
        // LATER: Redirect back to home page and show an error message.
        res.status(404).send(`User ${userName} doesn't exist.`);
      }
    }
  } catch(err) {
    console.error(err.message);
    console.log(err.stack);
    res.send(`Server crash: ${err.message}`);
  }
});
