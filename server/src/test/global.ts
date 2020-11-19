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

import * as debug1 from "debug";
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`tests:${MODULE}`);

import { initialize as initializeMathJax } from "../adapters/mathjax";
import { start as startWolframscript, stop as stopWolframscript } from "../adapters/wolframscript";
import { loadConfig /* , loadCredentials */ } from "../config";

// Exported functions

export function ensureGlobalLoaded() { }

// Global before/after

before("Loading config and starting WolframScript.", async function() {
  // REVIEW: It is a little fragile that we count on initializing things in the same order
  //         as server/src/app.ts/main(). Both should call the same high-level initialization
  //         function that insures the initialization is done in the same order.
  this.timeout(10*1000);
  debug(`Global before`);
  const config = await loadConfig();
  if (!config.mathematica) { throw new Error(`Unit tests require WolframScript.`); }
  // const credentials = await loadCredentials();
  debug(`  Starting WolframScript.`);
  await startWolframscript(config.wolframscript);
  debug(`  Initializing MathJax adapter.`);
  initializeMathJax();
  debug(`  Global before finished.`);
});

after("Stopping WolframScript.", async function(){
  this.timeout(10*1000);
  debug(`Global after.`);
  debug(`  Stopping WolframScript.`);
  await stopWolframscript();
  debug(`  Global after finished.`);
});
