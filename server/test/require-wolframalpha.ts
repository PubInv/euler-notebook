/*
Euler Notebook
Copyright (C) 2019-21 Public Invention
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

// import * as debug1 from "debug";
// const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
// const debug = debug1(`tests:${MODULE}`);

import { initialize as initializeWolframAlpha } from "../src/adapters/wolframalpha";
import { loadCredentials } from "../src/config";

// Exported functions

export function requireWolframAlpha() { }

// Global before/after

before("Initializing WolframAlpha", async function() {
  this.timeout(10*1000);
  const credentials = await loadCredentials();
  if (!credentials.wolframalpha) { throw new Error(`Unit tests require WolframAlpha credentials.`); }
  initializeWolframAlpha(credentials.wolframalpha);
});
