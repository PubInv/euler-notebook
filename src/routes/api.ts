
// TODO: Distinguish 400 from 500 responses

// Requirements

import * as express from 'express';

import { NotebookName, readNotebook, writeNotebook, UserName } from '../users-and-files';
import { TDoc, TDocObject } from '../tdoc/tdoc-class';
import { mathSimplifyRule, mathExtractVariablesRule } from '../tdoc/simplify-math';


// Types

// TODO: Share these *Params types with client.

interface EnhanceParams {
  tDoc: TDocObject;
}

interface OpenParams {
  userName: UserName;
  notebookName: NotebookName;
}

interface SaveParams {
  userName: UserName;
  notebookName: NotebookName;
  tDoc: TDocObject;
}

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
    let tDoc;
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
    res.json({ ok: true, tDoc });
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
    const newStyles = tdoc.applyRules([mathSimplifyRule, mathExtractVariablesRule]);
    res.json({ ok: true, newStyles });
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
    res.json({ ok: true });
  } catch (err) {
    console.error(`Error in /save API: ${err.message}`)
    console.log(err.stack);
    res.status(400).json({ ok: false, message: err.message });
  }
});
