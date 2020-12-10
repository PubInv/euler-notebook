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

import { CssClass, assertFalse } from "../../../shared/common";
import { FolderName, NotebookName } from "../../../shared/folder";
import { FolderUpdate } from "../../../shared/server-responses";

import { FolderScreen } from "..";
import { HtmlElement } from "../../../html-element";

import { EntryList } from "./entry-list";
import { EntryType } from "./entry-row";

// Requirements

// Exported Class

export class Content extends HtmlElement<'div'> {

  // Public Class Methods

  // Public Constructor

  public constructor(screen: FolderScreen) {
    super({ tag: 'div', class: <CssClass>'content' });
    this.screen = screen;
    this.foldersList = new EntryList(this.$elt, screen.folder, EntryType.Folder, screen.folder.folders);
    this.notebooksList = new EntryList(this.$elt, screen.folder, EntryType.Notebook, screen.folder.notebooks);
  }

  // Public Instance Properties

  // Public Instance Methods

  public editFolderName(name: FolderName): void { this.foldersList.editName(name); }

  public editNotebookName(name: NotebookName): void { this.notebooksList.editName(name); }

  // ClientFolder Watcher Methods

  public onChange(change: FolderUpdate): void {
    switch(change.type) {
      case 'folderCreated':   this.foldersList.addEntry(this.screen.folder, change.entry);     break;
      case 'folderDeleted':   this.foldersList.removeEntry(change.entry);                      break;
      case 'folderRenamed':   this.foldersList.renameEntry(change.oldName, change.entry);      break;
      case 'notebookCreated': this.notebooksList.addEntry(this.screen.folder, change.entry);   break;
      case 'notebookDeleted': this.notebooksList.removeEntry(change.entry);                    break;
      case 'notebookRenamed': this.notebooksList.renameEntry(change.oldName, change.entry);    break;
      default: assertFalse(); break;
    }
  }

  // -- PRIVATE --

  // Private Instance Properties

  private screen: FolderScreen;
  private foldersList: EntryList<'folder'>;
  private notebooksList: EntryList<'notebook'>;

  // Private Instance Methods

}

