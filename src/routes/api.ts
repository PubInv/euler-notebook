// TODO: I'm not sure where this should go, I'm just directly putting it
// here for now -- rlr
// import { TDoc } from '../public/javascripts/tdoc-class';
// import { mathSimplifyRule } from '../public/javascripts/tdoc-math';
// var TDoc = require('../public/javascripts/tdoc-class.js');
// var mathSimplifyRule = require('../public/javascripts/tdoc-math.jsj');


var express = require('express');

export var router = express.Router();

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

router.post('/enhance', function(_req, res, _next) {
  console.log("SSSSSSSSSSSSSSSSSSSSS",_req.body);
  // let tdoc = _req.body.data;
  // TODO: a real TDoc needed here!!!
  // const newStyles = tdoc.applyRules([mathSimplifyRule]);
  // console.log("NEW STYLES",newStyles);
  var newStyles = [];
  res.json({ ok: true, newStyles });
});

router.post('/save', function(req, res, _next) {
  tDoc = req.body.tDoc;
  res.json({ ok: true });
});
