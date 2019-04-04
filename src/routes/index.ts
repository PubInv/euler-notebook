
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
  const userEntries = await getListOfUsers();
  res.render('index', { userEntries });
});

router.get('/:user', async function(req, res, _next) {
  const user: UserName = req.params.user;
  const tDocEntries = await getListOfUsersNotebooks(user);
  res.render('user-home', { user, tDocEntries });
});

router.get('/:user/:notebook', function(_req, res, _next) {
  res.render('notebook', { credentials });
});
