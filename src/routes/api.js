var express = require('express');
var router = express.Router();

// Constants

const NEW_TDOC = {
  nextId: 1,
  styles: [],
  thoughts: [],
  version: "0.3.0",
}

// Globals

let tDoc = NEW_TDOC;

// Routes

router.get('/open', function(_req, res, _next) {
  res.json({ ok: true, tDoc });
});

router.post('/save', function(req, res, _next) {
  tDoc = req.body.tDoc;
  res.json({ ok: true });
});

module.exports = router;
