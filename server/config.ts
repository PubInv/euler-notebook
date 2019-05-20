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

import { readFile } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

import { MyScriptServerKeys } from '../client/math-tablet-api';

const readFile2 = promisify(readFile);

// Types

export interface Config {
  mathematica?: MathematicaConfig;
  mathjs?: {};
  mathsteps?: {};
}

export interface Credentials {
  myscript: MyScriptServerKeys;
}

export interface MathematicaConfig {
}

// Constants

const CONFIG_DIR = '.math-tablet';
const CONFIG_FILENAME = 'config.json';
const CREDENTIALS_FILENAME = 'credentials.json';

// Exported functions

export async function getConfig(): Promise<Config> {
  return getJsonFileFromConfigDir<Config>(CONFIG_FILENAME);
}

export function getCredentials(): Promise<Credentials> {
  return getJsonFileFromConfigDir<Credentials>(CREDENTIALS_FILENAME);
}

// Helper Functions

async function getJsonFileFromConfigDir<T>(name: string): Promise<T> {
  const path = join(process.env.HOME!, CONFIG_DIR, name);
  const json = await readFile2(path, 'utf8');
  return JSON.parse(json);
}



