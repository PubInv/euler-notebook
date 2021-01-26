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

import * as debug1 from "debug";
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

import { assert, assertFalse, ExpectedError, SessionToken } from "./shared/common";
import { LoginUserWithPassword, LoginUserWithToken, LogoutUser, RequestId, UserRequest } from "./shared/client-requests";
import { clientUserMessageSynopsis } from "./shared/debug-synopsis";
import { UserId, UserObject, UserName, UserPassword, USERNAME_RE } from "./shared/user";
import { UserLoggedIn } from "./shared/server-responses";
import { FolderPath } from "./shared/folder";

import { FileName, readJsonFile } from "./adapters/file-system";

import { ServerSocket } from "./server-socket";

import { UserSession } from "./user-session";
import { logWarning } from "./error-handler";

// Requirements

// Types

interface ServerUserObject {
  clientObj: UserObject;
  password: UserPassword;  // TODO: INSECURE TO SAY THE LEAST!
}

// Constants

const USER_INFO_FILENAME = <FileName>'.user-info.json';

// Exported Class

export class ServerUser {

  // Public Class Property Functions

  // Public Class Event Handlers

  public static async onClientRequest(socket: ServerSocket, msg: UserRequest): Promise<void> {
    debug(`Recd: ${clientUserMessageSynopsis(msg)}`);
    // Called by ServerSocket when a client sends a user request.
    switch(msg.operation) {
      case 'logout': {
        const session = UserSession.getSession(msg.sessionToken);
        if (session) {
          const instance = await this.getFromUserName(session.userName);
          instance.onLogout(socket, msg, session);
        } else {
          logWarning(MODULE, `Session token ${msg.sessionToken} not found for logout.`);
          socket.logoutUser();
        }
        break;
      }
      case 'tokenLogin': {
        const session = UserSession.getSession(msg.sessionToken);
        if (session) {
          const instance = await this.getFromUserName(session.userName);
          instance.onTokenLogin(socket, msg, session);
        } else {
          throw new ExpectedError(`Session token not found.`);
        }
        break;
      }
      case 'passwordLogin': {
        const instance = await this.getFromUserName(msg.userName);
        instance.onPasswordLogin(socket, msg);
        break;
      }
      default: assertFalse();
    }
  }

  // public static async fromSessionToken(sessionToken: SessionToken): Promise<ServerUser> {
  //   const session = UserSession.getSession(sessionToken);
  //   const instance = await this.load(session.userName);
  //   return instance;
  // }

  // Public Instance Properties

  public get id(): UserId { return this.obj.clientObj.id }
  public get userName(): UserName { return this.obj.clientObj.userName };


  // --- PRIVATE ---

  // Private Class Properties

  private static instanceMap: Map<UserName, ServerUser> = new Map();

  // Private Class Methods

  private static async getFromUserName(userName: UserName): Promise<ServerUser> {
    // TODO: Race condition. Open multiple at same time.
    let instance = this.instanceMap.get(userName);
    if (!instance) { instance = await this.load(userName); }
    return instance;
  }

  private static async load(userName: UserName): Promise<ServerUser> {
    assert(!this.instanceMap.has(userName));

    if (userName.length == 0) { throw new ExpectedError("Please specify username."); }

    if (!USERNAME_RE.test(userName)) { throw new ExpectedError("Invalid username."); }

    const path = <FolderPath>`/${userName}/`;
    let obj: ServerUserObject;
    try {
      obj = await readJsonFile<ServerUserObject>(path, USER_INFO_FILENAME);
    } catch (err) {
      if (err.code === 'ENOENT') { throw new ExpectedError(`User does not exist.`); }
      else { throw err; }
    }
    obj.clientObj.userName = userName;
    const instance = new this(obj);
    this.instanceMap.set(instance.userName, instance);
    return instance;
  }

  // Private Constructor

  private constructor(serverObj: ServerUserObject) {
    this.obj = serverObj;
  }

  // Private Instance Properties

  private obj: ServerUserObject;

  // Private Instance Methods

  private finishLogin(socket: ServerSocket, requestId: RequestId, sessionToken: SessionToken): void {

    assert(!socket.user);
    socket.loginUser(this);

    const response: UserLoggedIn = {
      requestId,
      type: 'user',
      operation: 'loggedIn',
      obj: this.obj.clientObj,
      sessionToken,
      complete: true,
    };
    socket.sendMessage(response);
  }

  // Private Instance Event Handlers

  private onLogout(socket: ServerSocket, msg: LogoutUser, session: UserSession): void {
    console.log("SERVER USER LOGOUT")
    assert(socket.user && socket.user.userName === session.userName);
    UserSession.logout(msg.sessionToken);
    socket.logoutUser();
  }

  private async onPasswordLogin(socket: ServerSocket, msg: LoginUserWithPassword): Promise<void> {
    // TODO: validate username?
    if (msg.password.length == 0) { throw new ExpectedError("Please specify password."); }
    if (msg.password != this.obj.password) { throw new ExpectedError("Password incorrect"); }

    const sessionToken = UserSession.login(this.userName);
    this.finishLogin(socket, msg.requestId!, sessionToken)
  }

  private async onTokenLogin(socket: ServerSocket, msg: LoginUserWithToken, _session: UserSession): Promise<void> {
    this.finishLogin(socket, msg.requestId!, msg.sessionToken);
  }
}