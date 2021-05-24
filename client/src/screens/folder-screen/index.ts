/*
Euler Notebook
Copyright (C) 2019-21 Public Invention
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

import { Html } from "../../shared/common";
import { CssClass } from "../../shared/css";
import { FolderPath } from "../../shared/folder";
import { FolderCollaboratorConnected, FolderCollaboratorDisconnected, FolderUpdate } from "../../shared/server-responses";

import { Screen } from "..";
import { ClientFolder, FolderWatcher } from "../../models/client-folder";

import { appInstance } from "../../app";

import { FolderView } from "./folder-view";
import { Sidebar } from "./sidebar";

// Types

// Constants

// Global Variables

// Exported Class

export class FolderScreen extends Screen implements FolderWatcher {

  // Public Class Methods

  // Public Constructor

  public constructor(path: FolderPath) {
    super({
      tag: 'div',
      classes: [<CssClass>'screen', <CssClass>'folderScreen'],
      styles: { display: 'none' },
      data: { path },
    });
    this.path = path;
    // Folder is opened in onAfterShow.
  }

  // Public Instance Event Handlers

  public onResize(_window: Window, _event: UIEvent): void { /* Nothing to do. */ }

  // Public Instance Properties

  public folder!: ClientFolder;     // Instantiated asynchronously in the constructor.
  public sidebar!: Sidebar;   // Instantiated asynchronously in the constructor.
  public view!: FolderView;         // Instantiated asynchronously in the constructor.

  // FolderWatcher Methods

  public onUpdate(change: FolderUpdate): void {
    this.view.onUpdate(change);
  }

  public onClosed(reason?: string): void {
    this.sidebar.destroy();
    this.view.destroy();
    this.displayErrorMessage(<Html>`Server closed folder <tt>${this.folder.path}</tt>: ${reason}`);
  }

  public onCollaboratorConnected(msg: FolderCollaboratorConnected): void {
    appInstance.header.onCollaboratorConnected(msg.obj);
  };

  public onCollaboratorDisconnected(msg: FolderCollaboratorDisconnected): void {
    appInstance.header.onCollaboratorDisconnected(msg.clientId);
  }

  // Public Instance Methods

  // --- PRIVATE ---

  // Private Instance Properties

  private path: FolderPath;

  // Private Instance Methods

  // Private Instance Event Handlers

  protected /* override */ onAfterShow(): void {
    super.onAfterShow();

    appInstance.header.setPath(this.path);

    if (this.folder) {
      appInstance.header.setCollaborators(this.folder.collaborators);
      return;
    }

    // TODO: Race condition: leave and possibly return before open completes.
    this.clearErrorMessages();
    ClientFolder.open(this.path, this)
    .then(
      (folder: ClientFolder)=>{
        this.folder = folder;
        appInstance.header.setCollaborators(this.folder.collaborators);

        this.sidebar = new Sidebar(this);
        this.view = new FolderView(this);

        this.$elt.append(this.sidebar.$elt, this.view.$elt);
      },
      (err)=>{
        this.displayError(err, <Html>`Error opening folder <tt>${this.path}</tt>`);
      }
    );

  }


}
