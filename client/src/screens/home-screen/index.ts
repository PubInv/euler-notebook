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

import { Path } from "../../shared/folder";

import { Header } from "../../components/header";

import { ClientUser } from "../../client-user";

import { ScreenBase } from "../screen-base";
import { $, $attach, CssSelector } from "../../dom";
import { UserName, UserPassword } from "../../shared/user";

// Types

interface LoginFormElements {
  userName: HTMLInputElement;
  password: HTMLInputElement;
}

// Constants

// const HOMESCREEN_HTML = <Html>`<h1>Euler Notebook</h1>`;

// Global Variables

// Exported Class

export class HomeScreen extends ScreenBase {

  // Public Class Methods

  // Public Constructor

  public constructor() {
    const $elt = $<'div'>(document.body, '#homeScreen')
    super($elt);

    const header = new Header(<Path>'/');
    $elt.prepend(header.$elt);

    $attach(this.$elt, <CssSelector>'#loginForm', {
      asyncListeners: {
        submit: (e: Event)=>this.onLoginSubmit(e),
      }
    });
    this.show();
  }

  // Public Instance Properties

  // Public Instance Event Handlers

  public onResize(_window: Window, _event: UIEvent): void { /* Nothing to do. */ }


  // --- PRIVATE ---

  // Private Instance Event Handlers

  private async onLoginSubmit(e: Event): Promise<void> {
    e.preventDefault();
    const $target = <HTMLFormElement>e.target!;
    const formElements = <LoginFormElements><unknown>$target.elements;
    const userName = <UserName>formElements.userName.value.trim();
    const password = <UserPassword>formElements.password.value.trim();

    try {
      const user = await ClientUser.loginWithPassword(userName, password);
      window.location.href = `/#${user.homePath}`;
    } catch(err) {
      $($target, '.errorMessage').innerHTML = err.message;
    }
  }
}
