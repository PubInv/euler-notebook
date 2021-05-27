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

// TODO: Keep list in sorted order.

// Requirements

import { assert } from "../../../shared/common";
import { NotebookName, FolderName, FolderEntry, NotebookEntry } from "../../../shared/folder";

import { ClientFolder } from "../../../models/client-folder";
import { HtmlElement } from "../../../html-element";

import { EntryRow, EntryType } from "./entry-row";
import { CssClass } from "../../../shared/css";

// Types


// Exported Class

export class EntryList extends HtmlElement<'table'> {

  // Public Constructor

  public constructor(folder: ClientFolder, type: EntryType) {
    super({ tag: 'table', class: <CssClass>'folderList' });
    this.type = type;
    this.entries = new Map();

    const entries = type==EntryType.Folder ? folder.folderEntries : folder.notebookEntries;
    for (const entry of entries) { this.addEntry(folder, entry); }
  }

  // Public Instance Methods

  public addEntry(folder: ClientFolder, entry: FolderEntry|NotebookEntry): void {
    const row = new EntryRow(folder, this.type, entry);
    this.$elt.append(row.$elt);
    this.entries.set(entry.name, row);
    // TODO: If empty folder message is shown then remove it.
  }

  public enterEditMode(name: FolderName|NotebookName): void {
    const row = this.entries.get(name)!;
    row.enterEditMode();
  }

  public removeEntry(name: FolderName|NotebookName): void {
    // LATER: Some sort of animation.
    // LATER: Identify name of user that made the change.
    const row = this.entries.get(name)!;
    assert(row);
    row.destroy();
    this.entries.delete(name);
  }

  public renameEntry(oldName: string, entry: FolderEntry|NotebookEntry): void {
    const row = this.entries.get(oldName)!;
    assert(row);
    // LATER: Move into sorted order, preferrably animated.
    row.rename(entry);
    this.entries.delete(oldName);
    this.entries.set(entry.name, row);
  }

  // --- PRIVATE ---

  // Private Constructor

  // Private Instance Properties

  private type: EntryType;
  private entries: Map<string, EntryRow>;
}
