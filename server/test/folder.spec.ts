/*
Euler Notebook
Copyright (C) 2021 Public Invention
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

import { assert } from "chai";

import { Folder, FolderName, FolderPath, NotebookPath, NotebookView } from "../src/shared/folder";

// Constants

const FOLDER_NAMES_FROM_PATHS: [ FolderPath, FolderName ][] = [
  [ <FolderPath>"/", <FolderName>"Root" ],
  [ <FolderPath>"/foo/", <FolderName>"foo" ],
  [ <FolderPath>"/foo/bar/", <FolderName>"bar" ],
  [ <FolderPath>"/Algebra I/Chapter 2/Section 2.4/", <FolderName>"Section 2.4" ],
];

const VALID_FOLDER_NAMES = [
  "a",
  "A",
  "0",
  "-",
  "_",
  "a b",
  "Problem 2.1",
];

const INVALID_FOLDER_NAMES = [
  ".",        // current directory
  "..",       // parent directory
  ".foo",     // starts with a period
  " foo",     // starts with a space.
  "foo ",     // ends in a space.
  "foo  bar", // contiguous internal spaces.
  "foo.enb",  // ends in notebook extension.
  "foo$",     // invalid character.
];

const VALID_FOLDER_PATHS = [
  "/",
  "/foo/",
  "/foo/bar/",
  "/Algebra I/Chapter 2/Section 2.4/",
];

const INVALID_FOLDER_PATHS = [
  "foo/",          // doesn't start with a slash
  "/foo",          // doesn't end with a slash
  "/../",          // contains invalid folder name
  "/foo.enb/bar/", // contains embedded notebook name + extension
];


// Currently, folder and notebook names have the same
// validity constraints. This might not be the case in the future.
const VALID_NOTEBOOK_NAMES = VALID_FOLDER_NAMES;
const INVALID_NOTEBOOK_NAMES = INVALID_FOLDER_NAMES;

const VALID_NOTEBOOK_PATHS = [
  "/foo.enb",
  "/foo/bar.enb",
  "/Algebra I/Chapter 2/Section 2.4/Problem 3.1.enb",
];

const INVALID_NOTEBOOK_PATHS = [
  "/foo",          // doesn't end with .enb.
  "foo.enb",       // doesn't start with a slash
  "/foo.enb/",     // ends with a slash
  "/foo.enb2",     // invalid extension
  "/foo.enb.enb",  // notebook name is invalid
  "/foo.enb/bar.enb", // embedded folder name is invalid
];

const VALID_NOTEBOOK_PATHS_WITH_VIEW: [ string, { path: NotebookPath, view: NotebookView } ][] = [
  [ "/foo.enb?view=read", { path: <NotebookPath>'/foo.enb', view: 'read' } ],
  [ "/foo.enb?view=edit", { path: <NotebookPath>'/foo.enb', view: 'edit' } ],
];

const INVALID_NOTEBOOK_PATHS_WITH_VIEW = [
  "?",                    // Degenerate case
  "???",                  // Degenerate case
  "/foo.enb",             // Doesn't have ?
  "/foo.enb?",            // No view part
  "?view=read",           // No path part
  "/foo.enb?view=bar",    // Invalid view
  "/foo.enb?view=edit*",  // Invalid view
];

// Unit Tests

describe("folder", function(){

  describe("class methods", function(){

    describe.only("folderNameFromFolderPath", function(){
      for (const [path, expected] of FOLDER_NAMES_FROM_PATHS) {
        it(`Correctly processes '${path}'`, function(){
          const actual = Folder.folderNameFromFolderPath(path);
          assert.equal(actual, expected);
        });
      }
    });

    describe("isValidFolderName", function(){
      for (const name of VALID_FOLDER_NAMES) {
        it(`Succeeds for '${name}'`, function(){
          assert(Folder.isValidFolderName(name));
        });
      }
      for (const name of INVALID_FOLDER_NAMES) {
        it(`Fails for '${name}'`, function(){
          assert(!Folder.isValidFolderName(name));
        });
      }
    });

    describe("isValidFolderPath", function(){
      for (const path of VALID_FOLDER_PATHS) {
        it(`Succeeds for '${path}'`, function(){
          assert(Folder.isValidFolderPath(path));
        });
      }
      for (const path of INVALID_FOLDER_PATHS) {
        it(`Fails for '${path}'`, function(){
          assert(!Folder.isValidFolderPath(path));
        });
      }
    });

    describe("isValidNotebookName", function(){
      for (const name of VALID_NOTEBOOK_NAMES) {
        it(`Succeeds for '${name}'`, function(){
          assert(Folder.isValidNotebookName(name));
        });
      }
      for (const name of INVALID_NOTEBOOK_NAMES) {
        it(`Fails for '${name}'`, function(){
          assert(!Folder.isValidNotebookName(name));
        });
      }
    });

    describe("isValidNotebookPath", function(){
      for (const path of VALID_NOTEBOOK_PATHS) {
        it(`Succeeds for '${path}'`, function(){
          assert(Folder.isValidNotebookPath(path));
        });
      }
      for (const path of INVALID_NOTEBOOK_PATHS) {
        it(`Fails for '${path}'`, function(){
          assert(!Folder.isValidNotebookPath(path));
        });
      }
    });

    describe("isValidNotebookPathWithView", function(){
      for (const [ pathWithView, expected ] of VALID_NOTEBOOK_PATHS_WITH_VIEW) {
        it(`Succeeds for '${pathWithView}'`, function(){
          const actual = Folder.isValidNotebookPathWithView(pathWithView);
          assert.deepEqual(actual, expected);
        });
      }
      for (const pathWithView of INVALID_NOTEBOOK_PATHS_WITH_VIEW) {
        it(`Fails for '${pathWithView}'`, function(){
          assert(!Folder.isValidNotebookPathWithView(pathWithView));
        });
      }
    });

  });
});
