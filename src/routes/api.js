var express = require('express');
var router = express.Router();

// Constants

const NEW_NOTEBOOK = {
  pages: [
    {
      layers: [
        {
          blocks: [
            { type: 'TEXT', height: '3in' },
            { type: 'MATH' },
          ]
        }
      ]
    },
    { /* empty page */ },
  ]
};

// Globals

let notebook = NEW_NOTEBOOK;

// Routes

router.get('/open', function(_req, res, _next) {
  res.json({ ok: true, notebook });
});

router.post('/save', function(req, res, _next) {
  notebook = req.body.notebook;
  res.json({ ok: true });
});

module.exports = router;
