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

// Requirements

import { FileName, readConfigFile } from "./adapters/file-system";

import { ApiKeys as MyScriptApiKeys } from "./adapters/myscript-lo";
import { ApiKeys as WolframAlphaApiKeys } from "./adapters/wolframalpha";

import { logWarning } from "./error-handler";


const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);

// Types

export interface Config {
  mathematica?: MathematicaConfig;
  nodeLatex?: NoteLatexConfig;
  wolframscript?: WolframScriptConfig;
}

export interface Credentials {
  myscript: MyScriptApiKeys;
  wolframalpha: WolframAlphaApiKeys;
}

export interface JsonWebTokenKeys {
  algorithm: 'HS256';
  secret: string;
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

const CONFIG_FILENAME = <FileName>'config.json';
const CREDENTIALS_FILENAME = <FileName>'credentials.json';

// Exported Globals

export var globalConfig: Config;
export var globalCredentials: Credentials;

// Exported functions

export async function loadConfig(): Promise<Config> {
  if (!globalConfig) {
    globalConfig = await readConfigFile<Config>(CONFIG_FILENAME);
  } else {
    logWarning(MODULE, "Loading config file multiple times.");
  }
  return globalConfig;
}

export async function loadCredentials(): Promise<Credentials> {
  if (!globalCredentials) {
    globalCredentials = await readConfigFile<Credentials>(CREDENTIALS_FILENAME);
  } else {
    logWarning(MODULE, "Loading credentials file multiple times.");
  }
  return globalCredentials;
}
