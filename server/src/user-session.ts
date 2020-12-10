/*
Math Tablet
Copyright (C) 20209 Public Invention
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

import { randomBytes } from "crypto";

import { deleteConfigFile, FileName, readConfigFile, writeConfigFile } from "./adapters/file-system";

import { assert, SessionToken } from "./shared/common";
import { UserName } from "./shared/user";

// Requirements

// Types

interface UserSessionObject {
  userName: UserName;
}

interface UserSessionsObject {
  [ sessionToken: /* TYPESCRIPT: SessionToken */string]: UserSessionObject;
}

// Constants

const SESSIONS_FILENAME = <FileName>'sessions.json';

// Global Variables

// Exported Class

export class UserSession {

  // Public Class Properties
  // Public Class Property Functions

  public static generateSessionToken(): SessionToken {
    return <SessionToken>randomBytes(32).toString('hex');
  }

  public static getSession(sessionToken: SessionToken): UserSession|undefined {
    return this.instances.get(sessionToken);
  }

  public static async loadIfAvailable(): Promise<void> {
    let obj: UserSessionsObject;
    try {
      obj = await readConfigFile<UserSessionsObject>(SESSIONS_FILENAME);
    } catch (err) {
      if (err.code == 'ENOENT') { debug("Sessions file not present."); return; }
      else { throw err; }
    }
    debug("Sessions file loaded. Deleting.");
    await deleteConfigFile(SESSIONS_FILENAME);
    for (const [sessionToken, sessionObj] of Object.entries(obj)) {
      new this(<SessionToken>sessionToken, sessionObj);
    }
  }

  public static async save(): Promise<void> {
    debug("Saving sessions file.")
    const obj: UserSessionsObject = {};
    for (const [sessionToken, session] of this.instances.entries()) {
      obj[sessionToken] = session.obj;
    }
    await writeConfigFile(SESSIONS_FILENAME, obj);
  }

  // Public Class Methods

  public static login(userName: UserName): SessionToken {
    const sessionToken = this.generateSessionToken();
    assert(!this.instances.has(sessionToken));
    const sessionObj: UserSessionObject = { userName };
    new this(sessionToken, sessionObj)
    return sessionToken;
  }

  public static logout(sessionToken: SessionToken): void {
    const had = UserSession.instances.delete(sessionToken);
    assert(had);
  }

  // Public Class Event Handlers

  // Public Instance Properties

  public get userName(): UserName { return this.obj.userName; }

  // Public Instance Property Functions

  // Public Instance Methods

  // Public Instance Event Handlers

  // --- PRIVATE ---

  // Private Class Properties

  private static instances: Map<SessionToken, UserSession> = new Map();

  // Private Class Property Functions
  // Private Class Methods
  // Private Class Event Handlers

  // Private Constructor

  private constructor(sessionToken: SessionToken, obj: UserSessionObject) {
    this.obj = obj;
    UserSession.instances.set(sessionToken, this);
  }

  // Private Instance Properties

  private obj: UserSessionObject;

  // Private Instance Property Functions
  // Private Instance Methods
  // Private Instance Event Handlers

}

