
// Requirements

import { NextFunction, Request, Response, Router } from 'express';

// import { FooParams, FooResults } from '../../client/math-tablet-api';
interface FooParams { }
interface FooResults { }

// Types

// Constants

// Globals

// Exports

export var router = Router();

// Routes

// Prototype API call:

router.post('/foo', async function(req: Request, res: Response, _next: NextFunction) {
  try {
    const params: FooParams = req.body;
    // Do stuff with params, get results...
    const results: FooResults = { ...params };
    res.json(results);
  } catch (err) {
    // TODO: Distinguish 400 from 500 responses
    console.error(`Error in /open API: ${err.message}`)
    console.log(err.stack);
    res.status(400).json({ ok: false, message: err.message });
  }
});
