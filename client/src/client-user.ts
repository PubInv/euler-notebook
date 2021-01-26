/*
Euler Notebook
Copyright (C) 2020-21 Public Invention
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

  public static loginWithPassword(userName: UserName, password: UserPassword): Promise<ClientUser> {
    const msg: LoginUserWithPassword = { type: 'user', operation: 'passwordLogin', userName, password };
    return this.finishLogin(msg);
  }

  public static async loginIfSavedToken(): Promise<boolean> {
    const sessionToken = <SessionToken|null>window.localStorage.getItem(STORAGE_KEY);
    if (!sessionToken) { return false; }
    const msg: LoginUserWithToken = { type: 'user', operation: 'tokenLogin', sessionToken };
    try {
      await this.finishLogin(msg);
    } catch(err) {
      // REVIEW: Only delete session token if we get a specific error? E.g. token not found error?
      window.localStorage.removeItem(STORAGE_KEY);
      throw err;
    }
    return true;
  }

  public static logout(): void {
    assert(this.loggedInUser);
    const sessionToken = <SessionToken>window.localStorage.getItem(STORAGE_KEY)!;
    assert(sessionToken);
    const msg: LogoutUser = { type: 'user', operation: 'logout', sessionToken }
    appInstance.socket.sendMessage(msg);
    window.localStorage.removeItem(STORAGE_KEY);
    this.loggedInUser = undefined;
    appInstance.header.onUserLogout();
  }


  // Public Class Event Handlers

  public static onServerResponse(msg: UserResponse, _ownRequest: boolean): void {
    // Nothing to do.
    // Login response is handled when request promise is resolved.
    switch(msg.operation) {
      case 'loggedOut':
        this.logout();
        break;
      default: /* Do nothing */ break;
    }
  }

  // Public Instance Properties

  // Public Instance Property Functions

  public get homePath(): FolderPath { return <FolderPath>`/${this.obj.userName}/`; }

  public get userName(): UserName { return this.obj.userName; }

  // Public Instance Methods

  // -- PRIVATE --

  // Private Class Methods

  private static async finishLogin(msg: LoginUserWithPassword|LoginUserWithToken): Promise<ClientUser> {
    assert(!this.loggedInUser);
    const responseMessages = await appInstance.socket.sendRequest<UserLoggedIn>(msg);
    assert(responseMessages.length == 1);
    const response = responseMessages[0];
    const instance = new this(response.obj);
    try { window.localStorage.setItem(STORAGE_KEY, response.sessionToken); }
    catch(err) { logError(err); }
    this.loggedInUser = instance;
    appInstance.header.onUserLogin(instance);
    return instance;
  }

  // Private Constructor

  private constructor(obj: UserObject) {
    this.obj = obj;
  }

  // Private Instance Properties

  private obj: UserObject;

  // Private Instance Methods

}
