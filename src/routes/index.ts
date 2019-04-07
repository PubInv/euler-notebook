
// Requirements

import * as express from 'express';

import { getCredentials, getListOfUsers, getListOfUsersNotebooks, NotebookEntry, UserEntry, UserName } from '../users-and-files';


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

router.get('/:user', async function(req, res, _next) {
  try {
    const messages: PageMessages = { banner: [], error: [], success: [], warning: [] };
    const user: UserName = req.params.user;
    let tDocEntries: NotebookEntry[] = [];
    try {
      tDocEntries = await getListOfUsersNotebooks(user);
    } catch(err) {
      switch(err.code) {
      case 'ENOENT':
        messages.error.push(`User '${user}' does not exist.<br/><tt>mkdir -p ~/math-tablet-usr/${user}</tt>`);
        break;
      default:
        throw err;
      }
    }
    res.render('user-home', { messages, user, tDocEntries });
  } catch(err) {
    console.error(err.message);
    console.log(err.stack);
    res.send(`Server crash: ${err.message}`);
  }
});

router.get('/:user/:notebook', function(_req, res, _next) {
  try {
    // TODO: check that user exists.
    // TODO: check that notebook exists?
    res.render('notebook', { credentials });
  } catch(err) {
    console.error(err.message);
    console.log(err.stack);
    res.send(`Server crash: ${err.message}`);
  }
});
