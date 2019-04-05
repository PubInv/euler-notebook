
// Requirements

import { getCredentials, getListOfUsers, getListOfUsersNotebooks, UserName } from '../users-and-files';

var express = require('express');

// Exports

export var router = express.Router();

// Constants

// TODO: Display friendly error message if file not found or JSON parse error.
const credentials = getCredentials();

// Routes

router.get('/', async function(_req, res, _next) {
  try {
    const messages = { banner: [ "Welcome to Math Tablet!" ], error: [] };
    let userEntries = [];
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
    const messages = { error: [] };
    const user: UserName = req.params.user;
    let tDocEntries = [];
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
