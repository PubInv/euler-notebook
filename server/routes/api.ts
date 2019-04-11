
// TODO: Distinguish 400 from 500 responses

// Requirements

import { NextFunction, Request, Response, Router } from 'express';

import { EnhanceParams, EnhanceResults, OpenParams, OpenResults, SaveParams, SaveResults } from '../../client/math-tablet-api';
import { readNotebook, writeNotebook } from '../users-and-files';
import { TDoc } from '../tdoc/tdoc-class';
import { mathSimplifyRule, mathExtractVariablesRule, mathEvaluateRule } from '../tdoc/simplify-math';

// Types

// Constants

// Globals

// Exports

export var router = Router();

// Routes

router.post('/open', async function(req: Request, res: Response, _next: NextFunction) {
  try {
    const params: OpenParams = req.body;
    const userName = params.userName;
    const notebookName = params.notebookName;
    console.log(`Opening notebook ${userName}/${notebookName}`);
    const tDoc = await readNotebook(userName, notebookName);
    const results: OpenResults = { ok: true, tDoc: tDoc.toObject() };
    res.json(results);
  } catch (err) {
    console.error(`Error in /open API: ${err.message}`)
    console.log(err.stack);
    res.status(400).json({ ok: false, message: err.message });
  }
});

router.post('/enhance', function(req: Request, res: Response, _next: NextFunction) {
  try {
    const params: EnhanceParams = req.body;
    const tdoc = TDoc.fromJsonObject(params.tDoc);

    const newStyles = tdoc.applyRules([mathSimplifyRule,
                                       mathExtractVariablesRule,
                                       mathEvaluateRule]).map(s=>s.toObject());

    const results: EnhanceResults = { ok: true, newNextId: tdoc.nextId, newStyles };
    res.json(results);
  } catch (err) {
    console.error(`Error in /enhance API: ${err.message}`)
    console.log(err.stack);
    res.status(400).json({ ok: false, message: err.message });
  }
});

router.post('/save', async function(req: Request, res: Response, _next: NextFunction) {
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
