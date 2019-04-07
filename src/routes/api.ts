
// TODO: Distinguish 400 from 500 responses

// Requirements

import * as express from 'express';

import { EnhanceParams, EnhanceResults, OpenParams, OpenResults, SaveParams, SaveResults } from '../client/math-tablet-api';
import { readNotebook, writeNotebook } from '../users-and-files';
import { TDoc } from '../tdoc/tdoc-class';
import { mathSimplifyRule, mathExtractVariablesRule } from '../tdoc/simplify-math';


// Types

// Constants

// Globals

// Exports

export var router = express.Router();

// Routes

router.post('/open', async function(req: express.Request, res: express.Response, _next: express.NextFunction) {
  try {
    const params: OpenParams = req.body;
    const userName = params.userName;
    const notebookName = params.notebookName;
    console.log(`Opening notebook ${userName}/${notebookName}`);
    let tDoc: TDoc;
    try {
      tDoc = await readNotebook(userName, notebookName);
    } catch(err) {
      switch (err.code) {
      case 'ENOENT': // file not found
        // REVIEW: For now we are handling a missing file as an implicit 'new' operation.
        // REVIEW: May want to return an error instead and handle new files differently.
        tDoc = TDoc.create();
        break;
      default:
        throw err;
      }
    }
    const results: OpenResults = { ok: true, tDoc: tDoc.toObject() };
    res.json(results);
  } catch (err) {
    console.error(`Error in /open API: ${err.message}`)
    console.log(err.stack);
    res.status(400).json({ ok: false, message: err.message });
  }
});

router.post('/enhance', function(req: express.Request, res: express.Response, _next: express.NextFunction) {
  try {
    const params: EnhanceParams = req.body;
    const tdoc = TDoc.fromJsonObject(params.tDoc);
    const newStyles = tdoc.applyRules([mathSimplifyRule, mathExtractVariablesRule]).map(s=>s.toObject());
    const results: EnhanceResults = { ok: true, newStyles };
    res.json(results);
  } catch (err) {
    console.error(`Error in /enhance API: ${err.message}`)
    console.log(err.stack);
    res.status(400).json({ ok: false, message: err.message });
  }
});

router.post('/save', async function(req: express.Request, res: express.Response, _next: express.NextFunction) {
  try {
    const params: SaveParams = req.body;
    const userName = params.userName;
    const notebookName = params.notebookName;
    console.log(`Saving notebook ${userName}/${notebookName}`);
    const tDoc = TDoc.fromJsonObject(params.tDoc);
    await writeNotebook(userName, notebookName, tDoc);
    const results: SaveResults = { ok: true };
    res.json(results);
  } catch (err) {
    console.error(`Error in /save API: ${err.message}`)
    console.log(err.stack);
    res.status(400).json({ ok: false, message: err.message });
  }
});
