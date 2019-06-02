/*
Math Tablet
Copyright (C) 2019 Public Invention
https://pubinv.github.io/PubInv/

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

// Requirements

import * as debug1 from 'debug';
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

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
    debug(err.stack);
    res.status(400).json({ ok: false, message: err.message });
  }
});
