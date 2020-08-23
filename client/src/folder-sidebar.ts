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

import { appInstance } from "./app";
import { $new, svgIconReference } from "./dom";
import { FolderScreen } from "./folder-screen";
import { FolderPath, FolderChange } from './shared/folder';
import { ClientFolder, Watcher as ClientFolderWatcher } from './client-folder';

// Types

// Constants

// Global Variables

// Exported Class

export class FolderSidebar implements ClientFolderWatcher {

  // Class Methods

  public static create(screen: FolderScreen, path: FolderPath): FolderSidebar {
    return new this(screen, path);
  }

  // Instance Properties

  // Instance Methods

  // ClientFolder Watcher Methods

  public onChange(_change: FolderChange): void { }

  public onChangesComplete(): void { }

  public onClosed(): void {
    this.enableButtons(false);
  }

  // -- PRIVATE --

  // Constructor

  private constructor(screen: FolderScreen, path: FolderPath) {

    this.$elt = $new({
      tag: 'div',
      appendTo: screen.$elt,
      class: 'sidebar',
    });

    this.$newFolderButton = $new({ // #thumbnailViewButton
      tag: 'button',
      appendTo: this.$elt,
      html: svgIconReference('iconMonstrFolder5'),
      asyncListeners: {
        click: (e: MouseEvent)=>this.onNewFolderClicked(e)
      },
      title: "Page thumbnail view",
    });

    this.$newNotebookButton = $new({ // #pageViewButton
      tag: 'button',
      appendTo: this.$elt,
      html: svgIconReference('iconMonstrFile15'),
      asyncListeners: {
        click: (e: MouseEvent)=>this.onNewNotebookClicked(e)
      },
      title: "Reading view",
    });

    this.enableButtons(false);  // REVIEW: Create them disabled.

    ClientFolder.watch(path, this)
    .then(
      (folder: ClientFolder)=>{
        this.folder = folder;
        this.enableButtons(true);
      },
    );

  }

  // Private Instance Properties

  private $elt: HTMLDivElement;
  private $newFolderButton: HTMLButtonElement;
  private $newNotebookButton: HTMLButtonElement;
  private folder?: ClientFolder;  // Assigned asynchronously at end of constructor.

  // Private Instance Methods

  private enableButtons(enabled: boolean): void {
    this.$newFolderButton.disabled = !enabled;
    this.$newNotebookButton.disabled = !enabled;
  }

  // Private Event Handlers

  private async onNewFolderClicked(e: MouseEvent): Promise<void> {
    e.preventDefault(); // Do not take focus.
    const path = await this.folder!.newFolder();
    appInstance.navigateTo(path);
  }

  private async onNewNotebookClicked(e: MouseEvent): Promise<void> {
    e.preventDefault(); // Do not take focus.
    const path = await this.folder!.newNotebook();
    appInstance.navigateTo(path);
  }

}
