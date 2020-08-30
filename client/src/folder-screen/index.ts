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

import { FolderPath, FolderChange } from "../shared/folder"
import { $new } from "../dom";
import { FolderView } from "./folder-view"
import { FolderSidebar } from "./folder-sidebar"
import { Screen } from "../screen"
import { ClientFolder, Watcher as ClientFolderWatcher } from "../client-folder"
import { reportError } from "../error-handler"

// Types

// Constants

// Global Variables

// Exported Class

export class FolderScreen extends Screen implements ClientFolderWatcher {

  // Public Class Methods

  public static create($parent: HTMLElement, path: FolderPath): FolderScreen {
    return new this($parent, path);
  }

  // Public Instance Properties

  public folder!: ClientFolder;     // Instantiated asynchronously in the constructor.
  public sidebar!: FolderSidebar;   // Instantiated asynchronously in the constructor.
  public view!: FolderView;         // Instantiated asynchronously in the constructor.

  // ClientFolder Watcher Methods

  public onChange(change: FolderChange): void {
    this.view.onChange(change);
  }

  public onChangesComplete(): void { }

  public onClosed(): void {
    this.sidebar.destroy();
    this.view.destroy();

    // LATER: Better way to display to display a closed message.
    // LATER: Give user helpful instructions, e.g. "refresh the page, go to the parent folder, or go to the home folder."
    $new({
      tag: 'div',
      class: 'error',
      html: `Folder ${this.folder.path} closed by server.`,
      replaceInner: this.$elt,
    });
  }

  // --- PRIVATE ---

  // Private Constructor

  private constructor($parent: HTMLElement, path: FolderPath) {
    const $elt = $new({
      tag: 'div',
      appendTo: $parent,
      classes: ['screen', 'folderScreen'],
      id: path,
      style: 'display: none',
    });
    super($elt);

    // LATER: Show loading gif
    ClientFolder.watch(path, this)
    .then(
      (folder: ClientFolder)=>{
        this.folder = folder;
        this.sidebar = FolderSidebar.create(this);
        this.view = FolderView.create(this);
          },
      (err)=>{
        // TODO: How to display folder open error?
        reportError(err, `Error opening folder '${path}'`);
      }
    );

  }

}
