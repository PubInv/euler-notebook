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

import { readFile } from "fs";
import { join } from "path";
import { promisify } from "util";

import { ServerKeys } from "./adapters/myscript";
import { logWarning } from "./error-handler";

const readFile2 = promisify(readFile);

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);

// Types

export interface Config {
  mathematica?: MathematicaConfig;
  nodeLatex?: NoteLatexConfig;
  wolframscript?: WolframScriptConfig;
}

export interface Credentials {
  myscript: ServerKeys;
}

export interface MathematicaConfig {
}

export interface NoteLatexConfig {
  // See https://www.npmjs.com/package/node-latex.
  // Currently we don't need these definitions.
  // We just pass the object to node-latex.
}

export interface WolframScriptConfig {
  path?: string; // Path to executable.
}

// Constants

const CONFIG_DIR = '.math-tablet';
const CONFIG_FILENAME = 'config.json';
const CREDENTIALS_FILENAME = 'credentials.json';

// Exported Globals

export var globalConfig: Config;
export var globalCredentials: Credentials;

// Exported functions

export async function loadConfig(): Promise<Config> {
  if (!globalConfig) {
    globalConfig = await getJsonFileFromConfigDir<Config>(CONFIG_FILENAME);
  } else {
    logWarning(MODULE, "Loading config file multiple times.");
  }
  return globalConfig;
}

export async function loadCredentials(): Promise<Credentials> {
  if (!globalCredentials) {
    globalCredentials = await getJsonFileFromConfigDir<Credentials>(CREDENTIALS_FILENAME);
  } else {
    logWarning(MODULE, "Loading credentials file multiple times.");
  }
  return globalCredentials;
}

// Helper Functions

async function getJsonFileFromConfigDir<T>(name: string): Promise<T> {
  const path = join(process.env.HOME!, CONFIG_DIR, name);
  const json = await readFile2(path, 'utf8');
  return JSON.parse(json);
}
