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

import { mkdir, readdir, readFile, rename, rmdir, stat, writeFile, writeFileSync, Stats, unlink } from "fs";
import { join } from "path";
import { promisify } from "util";

import * as debug1 from "debug";
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

import * as rimraf from "rimraf";

import { FolderPath, NotebookPath } from "../shared/folder";

const fsStat = promisify(stat);
const fsMkdir = promisify(mkdir);
const fsReaddir = promisify(readdir);
const fsReadFile = promisify(readFile);
const fsRename = promisify(rename);
const fsRmdir = promisify(rmdir);
const fsRmraf = promisify(rimraf);
const fsWriteFile = promisify(writeFile);
const fsUnlink = promisify(unlink);

// Types

type AbsolutePath = '{AbsolutePath}';  // Absolute path to a directory or file from the root of the filesystem.
export type FileName = '{FileName}';
export type UserFilePath = '{UserFilePath}';
type Path = UserFilePath|FolderPath|NotebookPath;

// Constants

const CONFIG_DIR = '.euler-notebook';
const NOTEBOOKS_DIRECTORY = 'euler-notebook-usr';

// Exported Functions

// Configuration File Functions

export async function readConfigFile<T>(fileName: FileName) : Promise<T> {
  const path = <AbsolutePath>join(process.env.HOME!, CONFIG_DIR, fileName);
  return await readJsonFileFromAbsolutePath<T>(path);
}

export async function deleteConfigFile(fileName: FileName): Promise<void> {
  const absPath = <AbsolutePath>join(process.env.HOME!, CONFIG_DIR, fileName);
  await fsUnlink(absPath);
}

export async function writeConfigFile<T>(fileName: FileName, obj: T): Promise<void> {
  const absPath = <AbsolutePath>join(process.env.HOME!, CONFIG_DIR, fileName);
  return await writeJsonFileToAbsolutePath(absPath, obj);
}

export function writeConfigFileSync<T>(fileName: FileName, obj: T): void {
  const absPath = <AbsolutePath>join(process.env.HOME!, CONFIG_DIR, fileName);
  writeJsonFileToAbsolutePathSync(absPath, obj);
}

// Notebook and Folder Functions
// (These functions operate within the directory structure that contains folders and notebooks.)

export async function createDirectory(path: Path): Promise<void> {
  const absPath = absolutePathToDirectory(path);
  debug(`Creating user folder: ${absPath}`);
  await fsMkdir(absPath);
}

export async function deleteDirectory(path: Path, recursive?: boolean): Promise<void> {
  const absPath = absolutePathToDirectory(path);
  debug(`${recursive?"Recursively D":"D"}eleting user folder: ${absPath}`)
  if (recursive) {
    await fsRmraf(absPath);
  } else {
    await fsRmdir(absPath);
  }
}

export async function deleteFile(path: Path, fileName: FileName): Promise<void> {
  const absPath = absolutePathToFile(path, fileName);
  await fsUnlink(absPath);
}

export async function readDirectory(path: Path): Promise<Map<FileName, Stats>> {
  const absPath = absolutePathToDirectory(path);
  debug(`Reading user directory: ${absPath}`)
  const rval = new Map<FileName, Stats>();
  const filenames = <FileName[]>await fsReaddir(absPath);
  // OPTIMIZATION: Can we get multiple stats in one call, or get stats in parallel?
  for (const filename of filenames) {
    const stats = await fsStat(join(absPath, filename));
    rval.set(filename, stats);
  }
  return rval;
}

export async function readJsonFile<T>(path: Path, fileName: FileName): Promise<T> {
  const absPath = absolutePathToFile(path, fileName);
  return readJsonFileFromAbsolutePath<T>(absPath);
}

export async function renameDirectory(oldPath: Path, newPath: Path): Promise<void> {
  const oldAbsPath = absolutePathToDirectory(oldPath);
  const newAbsPath = absolutePathToDirectory(newPath);
  debug(`Renaming user directory: ${oldAbsPath} -> ${newAbsPath}`)
  await fsRename(oldAbsPath, newAbsPath);
}

export async function writeJsonFile<T>(path: Path, fileName: FileName, obj: T): Promise<void> {
  const absPath = absolutePathToFile(path, fileName);
  await writeJsonFileToAbsolutePath(absPath, obj);
}

// Helper Functions

function absolutePathToDirectory(path: Path): AbsolutePath {
  // Since a path starts with a slash, we have to strip that off before joining it.
  // Also, folder paths end with a slash that needs to be removed as well.
  const suffix = path.endsWith('/') ? path.slice(1,-1) : path.slice(1);
  return <AbsolutePath>join(process.env.HOME!, NOTEBOOKS_DIRECTORY, suffix);
}

function absolutePathToFile(path: Path, fileName: FileName): AbsolutePath {
  const absPath = absolutePathToDirectory(path);
  return <AbsolutePath>join(absPath, fileName);
}

async function readJsonFileFromAbsolutePath<T>(absPath: AbsolutePath): Promise<T> {
  debug(`Reading JSON file: ${absPath}`);
  // REVIEW: For large JSON files is there a way to parse as we read the file
  //         so we don't have to read the whole JSON string into memory?
  const json = await fsReadFile(absPath, 'utf8');
  const rval = <T>JSON.parse(json);
  return rval;
}

async function writeJsonFileToAbsolutePath<T>(absPath: AbsolutePath, obj: T): Promise<void> {
  debug(`Writing JSON file: ${absPath}`);
  // REVIEW: For large JSON files is there a way to generate JSON as we write the file
  //         so we don't have to generate a large JSON string into memory?
  const json = JSON.stringify(obj);
  await fsWriteFile(absPath, json, 'utf8');
}

function writeJsonFileToAbsolutePathSync<T>(absPath: AbsolutePath, obj: T): void {
  debug(`Writing JSON file synchronously: ${absPath}`);
  // REVIEW: For large JSON files is there a way to generate JSON as we write the file
  //         so we don't have to generate a large JSON string into memory?
  const json = JSON.stringify(obj);
  writeFileSync(absPath, json, 'utf8');
}

