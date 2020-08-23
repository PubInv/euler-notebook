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

// TODO: Show last modified time for folders and notebooks
// TODO: Animate the when adding or removing folders and notebooks
// TODO: When another user makes a change show an indicator of what user made the change.

import { FolderChange, FolderEntry, NotebookEntry, FolderName, NotebookName, FolderPath } from "./shared/folder";

import { $new, svgIconReference, $, CLOSE_X_ENTITY } from "./dom";
import { ClientFolder, Watcher as ClientFolderWatcher } from './client-folder';
import { reportError } from "./error-handler";
import { FolderScreen } from "./folder-screen";
import { assert } from "./shared/common";

// Requirements

// Exported Class

export class FolderView implements ClientFolderWatcher {

  // Class Methods

  public static create(screen: FolderScreen, path: FolderPath): FolderView {
    return new this(screen, path);
  }

  // Instance Properties

  public $elt: HTMLElement;

  // Instance Methods

  // ClientFolder Watcher Methods

  public onChange(change: FolderChange): void {
    switch(change.type) {
      case 'folderCreated':   this.addFolderEntry(change.entry);     break;
      case 'folderDeleted':   this.removeFolderEntry(change.name);   break;
      case 'notebookCreated': this.addNotebookEntry(change.entry);   break;
      case 'notebookDeleted': this.removeNotebookEntry(change.name); break;
      default: assert(false); break;
    }
  }

  public onChangesComplete(): void { }

  public onClosed(): void {
    // TODO: Visual indicator that the folder is closed.
  }

  // -- PRIVATE --

  // Private Constructor

  private constructor(screen: FolderScreen, path: FolderPath) {

    const $elt = this.$elt = $new({ tag: 'div', appendTo: screen.$elt, class: 'view' });
    this.$foldersList = $new({ tag: 'table', id: 'folderList', appendTo: $elt });
    this.$notebooksList = $new({ tag: 'table', id: 'notebookList', appendTo: $elt });

    ClientFolder.watch(path, this)
    .then(
      (folder: ClientFolder)=>{
        this.folder = folder;
        for (const entry of folder.folders) { this.addFolderEntry(entry); }
        for (const entry of folder.notebooks) { this.addNotebookEntry(entry); }
      },
      (err)=>{
        // TODO: How to display folder open error?
        reportError(err, `Error opening folder '${path}'`);
      }
    );
  }

  // Private Instance Properties

  private $foldersList: HTMLTableElement;
  private $notebooksList: HTMLTableElement;
  private folder!: ClientFolder;

  // Private Instance Methods

    // $new({
    //   tag: 'div',
    //   appendTo: $elt,
    //   html: "This folder is empty.",
    //   id: 'emptyFolderNotice',
    //   style: `display: ${screen.folder.isEmpty?'block':'none'}`,
    // });

  private addFolderEntry(entry: FolderEntry): void {
    // TODO: If empty folder message is shown then remove it.
    $new({
      tag: 'tr',
      appendTo: this.$foldersList,
      class: 'folderListing',
      children: [
        { tag: 'td', html: svgIconReference('iconMonstrFolder2') },
        { tag: 'td', html: `<a href="#${entry.path}">${entry.name}</a>` },
        {
          tag: 'td',
          children: [{
            tag: 'button',
            html: CLOSE_X_ENTITY,
            asyncListeners: {
              click: (e: MouseEvent)=>this.onRemoveFolderClicked(e, entry.name),
            },
          }]
        }
      ],
      id: folderIdFromName(entry.name),
    });
  }

  private addNotebookEntry(entry: NotebookEntry): void {
    // TODO: If empty folder message is shown then remove it.
    $new({
      tag: 'tr',
      appendTo: this.$notebooksList,
      class: 'notebookListing',
      children: [
        { tag: 'td', html: svgIconReference('iconMonstrFile5') },
        { tag: 'td', html: `<a href="#${entry.path}">${entry.name}</a>` },
        {
          tag: 'td',
          children: [{
            tag: 'button',
            html: CLOSE_X_ENTITY,
            asyncListeners: {
              click: (e: MouseEvent)=>this.onRemoveNotebookClicked(e, entry.name),
            },
          }]
        }
      ],
      id: notebookIdFromName(entry.name),
    });
  }

  private removeFolderEntry(name: FolderName): void {
    $(this.$elt, `#${folderIdFromName(name)}`).remove();
    // TODO: If this is the last folder or notebook then display folder empty message.
  }

  private removeNotebookEntry(name: NotebookName): void {
    $(this.$elt, `#${notebookIdFromName(name)}`).remove();
    // TODO: If this is the last folder or notebook then display folder empty message.
  }

  // Private Event Handlers

  private async onRemoveFolderClicked(e: MouseEvent, name: FolderName): Promise<void> {
    e.preventDefault(); // Do not take focus.
    await this.folder.removeFolder(name);
    // TODO: removeFolderEntry(name);
  }

  private async onRemoveNotebookClicked(e: MouseEvent, name: NotebookName): Promise<void> {
    e.preventDefault(); // Do not take focus.
    await this.folder.removeNotebook(name);
    // TODO: removeFolderEntry(name);
  }

}

// Helper Functions

function folderIdFromName(name: FolderName): string { return `F-${name}`; }
function notebookIdFromName(name: NotebookName): string { return `N-${name}`; }
