
// Requirements

import { TDoc } from '../tdoc/tdoc-class';
import { mathSimplifyRule } from '../tdoc/simplify-math';

var express = require('express');

// Exports

export var router = express.Router();

// Constants

// Globals

let tDoc: TDoc = TDoc.create();

// Routes

router.get('/open', function(_req, res, _next) {
  res.json({ ok: true, tDoc });
});

router.post('/enhance', function(_req, res, _next) {
  const tdoc = TDoc.fromJsonObject(_req.body.tDoc);
  const newStyles = tdoc.applyRules([mathSimplifyRule]);
  res.json({ ok: true, newStyles });
});

router.post('/save', function(req, res, _next) {
  tDoc = TDoc.fromJsonObject(req.body.tDoc);
  res.json({ ok: true });
});
