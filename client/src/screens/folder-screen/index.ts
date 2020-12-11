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

import { CssClass, Html } from "../../shared/common";
import { FolderPath } from "../../shared/folder";
import { FolderUpdate } from "../../shared/server-responses";

import { ScreenBase } from "../screen-base";
import { ClientFolder, ClientFolderWatcher, OpenFolderOptions } from "../../client-folder";

import { appInstance } from "../../app";

import { Content } from "./content";
import { Sidebar } from "./sidebar";

// Types

// Constants

// Global Variables

// Exported Class

export class FolderScreen extends ScreenBase implements ClientFolderWatcher {

  // Public Class Methods

  // Public Constructor

  public constructor(path: FolderPath) {
    super({
      tag: 'div',
      classes: [<CssClass>'screen', <CssClass>'folderScreen'],
      styles: { display: 'none' },
      data: { path },
    });

    const options: OpenFolderOptions = { mustExist: true, watcher: this };
    ClientFolder.open(path, options)
    .then(
      (folder: ClientFolder)=>{
        this.folder = folder;
        appInstance.header.setPath(this.folder.path);

        this.sidebar = new Sidebar(this);
        this.view = new Content(this);

        this.$elt.append(this.sidebar.$elt, this.view.$elt);
      },
      (err)=>{
        this.displayError(err, <Html>`Error opening folder <tt>${path}</tt>`);
      }
    );
  }

  // Public Instance Event Handlers

  public onResize(_window: Window, _event: UIEvent): void { /* Nothing to do. */ }

  // Public Instance Properties

  public folder!: ClientFolder;     // Instantiated asynchronously in the constructor.
  public sidebar!: Sidebar;   // Instantiated asynchronously in the constructor.
  public view!: Content;         // Instantiated asynchronously in the constructor.

  // ClientFolderWatcher Methods

  public onChange(change: FolderUpdate): void {
    this.view.onChange(change);
  }

  public onClosed(reason?: string): void {
    this.sidebar.destroy();
    this.view.destroy();
    this.displayErrorMessage(<Html>`Server closed folder <tt>${this.folder.path}</tt>: ${reason}`);
  }

  // Public Instance Methods

  public show(): void {
    if (this.folder) {
      appInstance.header.setPath(this.folder.path);
    }
    super.show();
  }

  // --- PRIVATE ---

  // Private Instance Properties

  // Private Instance Methods

  // Private Event Handlers

}
