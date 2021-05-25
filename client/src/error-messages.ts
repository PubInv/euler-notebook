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

/*
An "expected error" is one that we anticipated could occur, and has a
useful error message for the user.
Also, if you catch an expected error you can assume that it has already
been reported to the error logging system or does not need to be logged.
*/

// Requirements

import { escapeHtml, Html } from "./shared/common";
import { Code as ErrorCode, ExpectedError } from "./shared/expected-error";

// Types

// Constants

const LOGIN_MSG = "Perhaps you need to log in?";

const ERROR_MESSAGES = new Map<ErrorCode, Html>([
  ['cannotModifyFolder',     <Html>"You do not have permission to modify this folder."],
  ['cannotModifyNotebook',   <Html>"You do not have permission to modify this notebook."],
  ['cannotReadFolder',       <Html>"This folder is not public and is not shared with you."],
  ['cannotReadNotebook',     <Html>"This notebook is not public and is not shared with you."],
  ['folderDoesntExist',      <Html>"Folder doesn't exist."],
  ['invalidNotebookVersion', <Html>"Invalid notebook version #{actualVersion}. Expect version #{expectedVersion}"],
  ['invalidUsername',        <Html>"Invalid username."],
  ['logInToModifyFolder',    <Html>`This public folder is read-only. ${LOGIN_MSG}`],
  ['logInToModifyNotebook',  <Html>`This public notebook is read-only. ${LOGIN_MSG}`],
  ['logInToReadFolder',      <Html>`This folder is not public. ${LOGIN_MSG}`],
  ['logInToReadNotebook',    <Html>`This notebook is not public. ${LOGIN_MSG}`],
  ['notebookAlreadyExists',  <Html>"Notebook '#{path}' already exists."],
  ['notebookDoesntExist',    <Html>"Notebook doesn't exist."],
  ['passwordIncorrect',      <Html>"Password incorrect"],
  ['passwordTooShort',       <Html>"Password must be at least #{minLength} characters."],
  ['sessionTokenNotFound',   <Html>"Session token not found."],
  ['specifyPassword',        <Html>"Please specify password."],
  ['specifyUsername',        <Html>"Please specify username."],
  ['unexpectedError',        <Html>"An unexpected error occurred."],
  ['userDoesNotExist',       <Html>"User does not exist."],
]);

// Global Variables

// Exported Functions

export function errorTemplateForCode(code: ErrorCode): Html {
  let message = ERROR_MESSAGES.get(code)!;
  if (!message) {
    // TODO: logger system?
    console.warn(`WARNING: Expected error '${code}' does not have an error message.`);
    message = ERROR_MESSAGES.get('unexpectedError')!;
  }
  return message;
}

export function errorMessageForUser(err: Error): Html {
  let rval: Html;
  if (err instanceof ExpectedError) {
    const template = errorTemplateForCode(err.code);
    const info = err.info || {};
    rval = <Html>template.replace(/\#{(.*?)}/g, (_m,itemName)=>{
      return (info.hasOwnProperty(itemName) ? escapeHtml(info[itemName]!.toString()) : "???");
    })
  } else {
    rval = errorTemplateForCode('unexpectedError');
  }
  return rval;
}

// Helper Functions

