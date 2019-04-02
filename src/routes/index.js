
var fs = require('fs');
var path = require('path');

var express = require('express');
var router = express.Router();

// TODO: Display friendly error message if file not found or JSON parse error.
// TODO: Read asynchronously?
const credentialsPath = path.join(process.env.HOME, '.math-tablet-credentials.json');
const credentialsJson = fs.readFileSync(credentialsPath);
const credentials = JSON.parse(credentialsJson);

router.get('/', function(req, res, next) {
  res.render('index', { credentials });
});

module.exports = router;
