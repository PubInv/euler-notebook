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

import { deleteFile, FileName, readJsonFile, writeJsonFile } from "../adapters/file-system";
import { ServerUser } from "./server-user";

// Requirements

// Types

export interface PermissionsObject {
  // LATER: groups?: ...
  public?: boolean;
  users?: { [userName:string /* TYPESCRIPT: UserName */]: UserPermissions };
}

// Constants

const PERMISSIONS_FILENAME = <FileName>'permissions.json';

// Global Variables

// Exported Class

export class Permissions {

  // Public Class Methods

  public static async createOnDisk(path: Path, enclosingPermissions: Permissions): Promise<void> {
    // NOTE: Does not create an instance of the class. Just writes the bits to disk.
    await this.save(path, enclosingPermissions.obj);
  }

  public static async deleteOnDisk(path: Path): Promise<void> {
    await deleteFile(path, PERMISSIONS_FILENAME);
  }

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

  // Public Instance Property Functions

  public getUserPermissions(user: ServerUser|undefined): UserPermissions {
    let rval: UserPermissions;
    if (user && this.path.startsWith(`/${user.userName}/`)) {
      // User is owner. They have all permissions.
      rval = UserPermission.All;
    } else {
      // Public notebooks are readable by defaults.
      // Non-public notebooks have no default permissions.
      const defaultPermissions = (this.obj.public ? UserPermission.Read : UserPermission.None);

      if (user && this.obj.users && this.obj.users.hasOwnProperty(user.userName)) {
        // User with explicit permissions is logged in.
        // Add whatever explicit permissions are granted to the default permissions.
        rval = defaultPermissions | this.obj.users[user.userName];
      } else {
        // No user is logged in, or user does not have explicit permissions.
        // Use default permissions.
        rval = defaultPermissions;
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

  // Private Class Methods

  private static async save(path: Path, obj: PermissionsObject): Promise<void> {
    await writeJsonFile(path, PERMISSIONS_FILENAME, obj);
  }

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

  private async save(): Promise<void> {
    await Permissions.save(this.path, this.obj);
  }
}

