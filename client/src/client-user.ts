/*
Math Tablet
Copyright (C) 2020 Public Invention
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

import { assert, SessionToken } from "./shared/common";
import { LoginUserWithPassword, LoginUserWithToken, LogoutUser } from "./shared/client-requests";
import { UserLoggedIn, UserResponse } from "./shared/server-responses";
import { FolderPath } from "./shared/folder";
import { UserObject, UserName, UserPassword } from "./shared/user";

import { appInstance } from "./app";
import { logError } from "./error-handler";

// Constants

const STORAGE_KEY = 'sessionToken';

// Exported Class

export class ClientUser {

  // Public Class Properties

  public static loggedInUser: ClientUser|undefined = undefined;

  // Public Class Methods

  public static async loginWithPassword(userName: UserName, password: UserPassword): Promise<ClientUser> {
    assert(!this.loggedInUser);
    const message: LoginUserWithPassword = { type: 'user', operation: 'passwordLogin', userName, password };
    const responseMessages = await appInstance.socket.sendRequest<UserLoggedIn>(message);
    assert(responseMessages.length == 1);
    const response = responseMessages[0];
    const instance = new this(response);
    this.loggedInUser = instance;
    return instance;
  }

  public static async loginIfSavedToken(): Promise<boolean> {
    assert(!this.loggedInUser);
    const sessionToken = <SessionToken>window.sessionStorage.getItem(STORAGE_KEY);
    if (!sessionToken) { return false; }
    const message: LoginUserWithToken = { type: 'user', operation: 'tokenLogin', sessionToken };
    let response: UserLoggedIn;
    try {
      const responseMessages = await appInstance.socket.sendRequest<UserLoggedIn>(message);
      assert(responseMessages.length == 1);
      response = responseMessages[0];
    } catch(err) {
      this.deleteSessionToken();
      throw err;
    }
    const instance = new this(response);
    this.loggedInUser = instance;
    return true;
  }

  // Public Class Event Handlers

  public static onServerResponse(_msg: UserResponse, _ownRequest: boolean): void {
    // Nothing to do.
    // Login response is handled when request promise is resolved.
  }

  // Public Instance Properties

  public sessionToken: SessionToken;

  // Public Instance Property Functions

  public get homePath(): FolderPath { return <FolderPath>`/${this.obj.userName}/`; }

  public get userName(): UserName { return this.obj.userName; }

  // Public Instance Methods

  public logout(): void {
    const msg: LogoutUser = { type: 'user', operation: 'logout', sessionToken: this.sessionToken }
    appInstance.socket.sendMessage(msg);
    ClientUser.loggedInUser = undefined;
    ClientUser.deleteSessionToken();
  }

  // public async reconnect(): Promise<void> {
  //   assert(ClientUser.loggedInUser === this);
  //   const message: LoginUserWithToken = { type: 'user', operation: 'tokenLogin', sessionToken: this.sessionToken };
  //   const responseMessages = await appInstance.socket.sendRequest<UserLoggedIn>(message);
  //   assert(responseMessages.length == 1);
  //   const response = responseMessages[0];
  //   this.sessionToken = response.sessionToken;
  //   this.obj = response.obj;
  //   this.saveSessionToken();
  // }

  // -- PRIVATE --

  // Private Class Methods

  private static deleteSessionToken(): void {
    window.sessionStorage.removeItem(STORAGE_KEY);
  }


  // Private Constructor

  private constructor(response: UserLoggedIn) {
    this.sessionToken = response.sessionToken;
    this.obj = response.obj;
    this.saveSessionToken();
  }

  // Private Instance Properties

  private obj: UserObject;

  // Private Instance Methods

  private saveSessionToken(): void {
    try { window.sessionStorage.setItem(STORAGE_KEY, this.sessionToken); }
    catch(err) { logError(err); }
  }
}
