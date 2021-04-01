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

import { start as startWolframscript, stop as stopWolframscript } from "../src/adapters/wolframscript";
import { loadConfig } from "../src/config";

// Exported functions

export function requireWolframScript() { }

// Global before/after

before("Starting WolframScript.", async function() {
  this.timeout(10*1000);
  const config = await loadConfig();
  if (!config.wolframscript) { throw new Error(`Unit tests require WolframScript.`); }
  // const credentials = await loadCredentials();
  await startWolframscript(config.wolframscript);
});

after("Stopping WolframScript.", async function(){
  this.timeout(10*1000);
  await stopWolframscript();
});
