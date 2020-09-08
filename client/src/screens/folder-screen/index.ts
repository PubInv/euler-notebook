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

// TODO: Show "connecting..." spinner

// Requirements

import { FolderPath, FolderChange } from "../../shared/folder"
import { Content } from "./content"
import { Sidebar } from "./sidebar"
import { ScreenBase } from "../screen-base"
import { ClientFolder, ClientFolderWatcher, OpenFolderOptions } from "../../client-folder"
import { reportError } from "../../error-handler"

// Types

// Constants

// Global Variables

// Exported Class

export class FolderScreen extends ScreenBase implements ClientFolderWatcher {

  // Public Class Methods

  public static create($parent: HTMLElement, path: FolderPath): FolderScreen {
    return new this($parent, path);
  }

  // Public Instance Event Handlers

  public onResize(_window: Window, _event: UIEvent): void { /* Nothing to do. */ }

  // Public Instance Properties

  public folder!: ClientFolder;     // Instantiated asynchronously in the constructor.
  public sidebar!: Sidebar;   // Instantiated asynchronously in the constructor.
  public view!: Content;         // Instantiated asynchronously in the constructor.

  // ClientFolderWatcher Methods

  public onChange(change: FolderChange): void {
    this.view.onChange(change);
  }

  public onChangesFinished(): void { }

  public onClosed(reason?: string): void {
    this.sidebar.destroy();
    this.view.destroy();
    this.displayErrorMessage(`Folder ${this.folder.path} closed by server: ${reason}`);
  }

  // --- PRIVATE ---

  // Private Constructor

  private constructor($parent: HTMLElement, path: FolderPath) {
    super({
      tag: 'div',
      appendTo: $parent,
      classes: ['screen', 'folderScreen'],
      id: path,
      style: 'display: none',
    });

    const options: OpenFolderOptions = { mustExist: true, watcher: this };
    ClientFolder.open(path, options)
    .then(
      (folder: ClientFolder)=>{
        this.folder = folder;
        this.sidebar = new Sidebar(this);
        this.view = new Content(this);
          },
      (err)=>{
        reportError(err, `Error opening folder '${path}'`);
        this.displayErrorMessage(`Error opening folder '${path}'`);
      }
    );

  }

  // Private Instance Properties

  // Private Instance Methods

  // Private Event Handlers

}
