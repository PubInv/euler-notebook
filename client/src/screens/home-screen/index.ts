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

import { CssSelector } from "../../shared/common";
import { UserName, UserPassword } from "../../shared/user";

import { ClientUser } from "../../client-user";

import { Screen } from "..";
import { $, $attach } from "../../dom";
import { appInstance } from "../../app";
import { FolderPath } from "../../shared/folder";

// Types

interface LoginFormElements {
  userName: HTMLInputElement;
  password: HTMLInputElement;
}

// Constants

// const HOMESCREEN_HTML = <Html>`<h1>Euler Notebook</h1>`;

// Global Variables

// Exported Class

export class HomeScreen extends Screen {

  // Public Class Methods

  // Public Constructor

  public constructor() {
    const $elt = $<'div'>(document.body, '#homeScreen')
    super($elt);

    $attach(this.$elt, <CssSelector>'#loginForm', {
      asyncListeners: {
        submit: (e: Event)=>this.onLoginSubmit(e),
      }
    });
    this.show();
  }

  // Public Instance Properties

  // Public Instance Methods

  public show(): void {
    appInstance.header.switchScreen(<FolderPath>'/');
    super.show();
  }

  // Public Instance Event Handlers

  public onResize(_window: Window, _event: UIEvent): void { /* Nothing to do. */ }


  // --- PRIVATE ---

  // Private Instance Event Handlers

  private async onLoginSubmit(e: Event): Promise<void> {
    e.preventDefault();
    const $target = <HTMLFormElement>e.target!;
    const formElements = <LoginFormElements><unknown>$target.elements;

    // Clear any pre-existing error message
    const $formErrorMessage = $<'div'>($target, '.errorMessage');
    $formErrorMessage.innerHTML = '';

    // Fetch and normalize the user inputs
    const userName = normalizeUserName(formElements.userName.value);
    formElements.userName.value = userName;
    const password = normalizePassword(formElements.password.value);
    formElements.password.value = password;

    // Attempt the login.
    // A login failure will throw an exception.
    try {
      const user = await ClientUser.loginWithPassword(userName, password);
      window.location.href = `/#${user.homePath}`;
    } catch(err) {
      $formErrorMessage.innerHTML = err.message;
    }
  }
}

// Helper Functions

function normalizeUserName(value: string): UserName {
  // Strip leading and trailing spaces.
  // Convert to all lower case.
  // REVIEW: Strip interior spaces?
  // REVIEW: Coalesce sequences of underscores to a single underscore?
  // REVIEW: Strip leading and trailing underscores?
  return <UserName>value.toLowerCase().trim();
}

function normalizePassword(value: string): UserPassword {
  // Only normalizing of passwords is to trim leading and trailing whitespace
  // in case the user cut and pasted the password and accidentally got some extra whitespace.
  return <UserPassword>value.trim();
}
