/*
Euler Notebook
Copyright (C) 20209-21 Public Invention
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

import { Path } from "../shared/folder";
import { UserPermission, UserPermissions } from "../shared/permissions";

import { FileName, readJsonFile, writeJsonFile } from "../adapters/file-system";
import { ServerUser } from "./server-user";

// Requirements

// Types

export interface PermissionsObject {
  public?: boolean;
  users?: { [userName:string /* TYPESCRIPT: UserName */]: UserPermissions };
}

// Constants

const PERMISSIONS_FILENAME = <FileName>'permissions.json';

// Global Variables

// Exported Class

export class Permissions {

  // Public Class Properties
  // Public Class Property Functions

  // Public Class Methods

  public static async load(path: Path): Promise<Permissions> {
    let obj: PermissionsObject;
    try {
      obj = await readJsonFile<PermissionsObject>(path, PERMISSIONS_FILENAME);
    } catch(err) {
      if (err.code == 'ENOENT') { obj = {}; }
      else { throw err; }
    }
    const instance = new this(path, obj);
    return instance;
  }

  // Public Class Event Handlers
  // Public Instance Properties

  // Public Instance Property Functions

  public getUserPermissions(user: ServerUser|undefined): UserPermissions {
    let rval: UserPermissions = this.obj.public ? UserPermission.Read : UserPermission.None;
    if (user) {
      if (this.path.startsWith(`/${user.userName}/`)) {
        // User is owner. Allow everything.
        rval |= UserPermission.All;
      } else if (this.obj.users && this.obj.users.hasOwnProperty(user.userName)) {
        rval |= this.obj.users[user.userName];
      }
    }
    return rval;
  }

  // Public Instance Methods

  public async setUserPermissions(user: ServerUser, permissions: UserPermissions): Promise<void> {
    if (!this.obj.users) { this.obj.users = {}; }
    this.obj.users[user.userName] = permissions;
    await this.save();
  }

  // Public Instance Event Handlers

  // --- PRIVATE ---

  // Private Class Properties
  // Private Class Property Functions
  // Private Class Methods
  // Private Class Event Handlers

  // Private Constructor

  private constructor(path: Path, obj: PermissionsObject) {
    this.path = path;
    this.obj = obj;
  }

  // Private Instance Properties

  private path: Path;
  private obj: PermissionsObject;

  // Private Instance Property Functions

  // Private Instance Methods

  // LATER:
  private async save(): Promise<void> {
    await writeJsonFile(this.path, PERMISSIONS_FILENAME, this.obj);
  }

  // Private Instance Event Handlers

}

