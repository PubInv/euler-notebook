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

import { mkdir, readdir, readFile as fsReadFile, rename as fsRename, rmdir, stat, writeFile as fsWriteFile } from "fs";
import { join } from "path";
import { promisify } from "util";

import * as rimraf from "rimraf";

// Types

export type AbsDirectoryPath = string; // Absolute path to a directory in the file system.

// Constants

const ROOT_DIR_NAME = 'math-tablet-usr';
export const ROOT_DIR_PATH = join(process.env.HOME!, ROOT_DIR_NAME);

// Exported Functions

export const dirStat = promisify(stat);
export const mkDir = promisify(mkdir);
export const readDir = promisify(readdir);
export const readFile = promisify(fsReadFile);
export const rename = promisify(fsRename);
export const rmDir = promisify(rmdir);
export const rmRaf = promisify(rimraf);
export const writeFile = promisify(fsWriteFile);
