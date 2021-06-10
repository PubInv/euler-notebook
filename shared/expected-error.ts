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

import { JsonObject } from "./common";

/*
An "expected error" is one that we anticipated could occur, and has a
useful error message for the user.
Also, if you catch an expected error you can assume that it has already
been reported to the error logging system or does not need to be logged.
*/

// Requirements

// Types

export type Code =
  'cannotModifyFolder' |
  'cannotModifyNotebook' |
  'cannotReadFolder' |
  'cannotReadNotebook' |
  'cannotRemoveNonemptyFolder' |
  'folderDoesntExist' |
  'invalidNotebookVersion' |
  'invalidUsername' |
  'logInToModifyFolder' |
  'logInToModifyNotebook' |
  'logInToReadFolder' |
  'logInToReadNotebook' |
  'noCamerasFound' |
  'notebookAlreadyExists' |
  'notebookDoesntExist' |
  'passwordIncorrect' |
  'passwordTooShort' |
  'sessionTokenNotFound' |
  'specifyPassword' |
  'specifyUsername' |
  'userDoesNotExist' |
  'unexpectedError';

// Constants

// Global Variables

// Exported Class

export class ExpectedError extends Error {

  // Public Class Properties
  // Public Class Property Functions

  // Public Class Methods

  // Public Class Event Handlers

  // Public Constructor

  constructor(code: Code, info?: JsonObject) {
    const message = `Expected error '${code}' occurred.`
    super(message);
    this.code = code;
    this.info = info;
  }

  // Public Instance Properties

  public code: Code;
  public info?: JsonObject;

  // Public Instance Property Functions
  // Public Instance Methods
  // Public Instance Event Handlers

  // --- PRIVATE ---

  // Private Class Properties
  // Private Class Property Functions
  // Private Class Methods
  // Private Class Event Handlers
  // Private Instance Properties
  // Private Instance Property Functions
  // Private Instance Methods
  // Private Instance Event Handlers

}

