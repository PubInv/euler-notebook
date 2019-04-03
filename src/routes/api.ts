
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
  try {
    res.json({ ok: true, tDoc });
  } catch (err) {
    console.error(`Error in /open API: ${err.message}`)
    console.log(err.stack);
  }
});

router.post('/enhance', function(_req, res, _next) {
  try {
    const tdoc = TDoc.fromJsonObject(_req.body.tDoc);
    const newStyles = tdoc.applyRules([mathSimplifyRule]);
    res.json({ ok: true, newStyles });
  } catch (err) {
    console.error(`Error in /enhance API: ${err.message}`)
    console.log(err.stack);
  }
});

router.post('/save', function(req, res, _next) {
  try {
    tDoc = TDoc.fromJsonObject(req.body.tDoc);
    res.json({ ok: true });
  } catch (err) {
    console.error(`Error in /save API: ${err.message}`)
    console.log(err.stack);
  }
});
