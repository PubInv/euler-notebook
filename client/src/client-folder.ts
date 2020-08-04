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

// import { $ } from './dom';
import { assert } from './common';
import { Folder, FolderObject, FolderPath } from './shared/folder';
import { FolderChangeRequest, ChangeFolder, ChangeFolderOptions, FolderChanged } from './shared/math-tablet-api';
import { ServerSocket } from './server-socket';
import { FolderScreen } from './folder-screen';

// Types

// Constants

// Global Variables

// Class

export class ClientFolder extends Folder {

  // Class Methods

  public static create(socket: ServerSocket, obj: FolderObject): ClientFolder {
    assert(!this.folders.has(obj.path));
    const instance = new this(socket, obj);
    this.folders.set(obj.path, instance);
    return instance;
  }

  public static open(socket: ServerSocket, obj: FolderObject): ClientFolder {
    return this.folders.get(obj.path) || this.create(socket, obj);
  }

  public static get(folderPath: FolderPath): ClientFolder|undefined {
    return this.folders.get(folderPath);
  }

  // Instance Properties

  // Instance Property Functions

  // Instance Methods

  // REVIEW: When is this called?
  public close() {
    // TODO: mark closed?
    ClientFolder.folders.delete(this.path);
  }

  public connect(screen: FolderScreen): void {
    this.screen = screen;
  }

  public sendChangeRequest(changeRequest: FolderChangeRequest, options: ChangeFolderOptions): void {
    this.sendChangeRequests([ changeRequest ], options);
  }

  public sendChangeRequests(changeRequests: FolderChangeRequest[], options: ChangeFolderOptions): void {
    if (changeRequests.length == 0) { return; }
    const msg: ChangeFolder = {
      type: 'changeFolder',
      folderPath: this.path,
      changeRequests,
      options,
    }
    this.socket.sendMessage(msg);
  }

  // Server Message Event Handlers

  public smChange(msg: FolderChanged): void {

    // Apply changes to the notebook data structure, and notify the view of the change.
    // If the change is not a delete, then update the data structure first, then notify the view.
    // Otherwise, notify the view of the change, then update the data structure.
    // (The view needs to trace the deleted style or relationship to the top-level style to
    //  determine what cell to update. If the style has been deleted from the notebook already
    //  then it cannot do that.)
    for (const change of msg.changes) {
      this.applyChange(change);
      this.screen.smChange(change);
    }
  }

  public smClose(): void { return this.close(); }

  // -- PRIVATE --

  // Private Class Properties

  private static folders: Map<FolderPath, ClientFolder> = new Map();

  // Private Constructor

  private constructor(socket: ServerSocket, obj: FolderObject) {
    super(obj);
    this.socket = socket;
  }

  // Private Instance Properties

  // REVIEW: Could there be more than one screen attached to this openNotebook?
  private screen!: FolderScreen;
  private socket: ServerSocket;

  // Private Instance Methods

  // Private Change Event Handlers

}
