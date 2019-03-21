var express = require('express');
var router = express.Router();

router.get('/open', function(req, res, next) {
  res.json({
    pages: [
      {
        layers: [
          { 
            blocks: [
              { type: 'TEXT' },
              { type: 'MATH' },
            ]
          }
        ]
      },
      { /* empty page */ },
    ]
  });
});

module.exports = router;
