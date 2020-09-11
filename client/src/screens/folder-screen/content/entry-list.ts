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

// TODO: Keep list in sorted order.

// Requirements

import { assert } from "../../../shared/common";
import { NotebookName, FolderName } from "../../../shared/folder";

// import { $new, svgIconReference, $, CLOSE_X_ENTITY, PENCIL_ENTITY, Html, escapeHtml } from "../../dom";
import { ClientFolder } from "../../../client-folder";
import { HtmlElement } from "../../../html-element";

import { EntryRow, EntryType, EntryTypeMap } from "./entry-row";

// Types


// Exported Class

export class EntryList<K extends keyof EntryTypeMap> extends HtmlElement<'table'> {

  // Public Constructor

  public constructor($parentElt: HTMLDivElement, folder: ClientFolder, type: EntryType, entries: EntryTypeMap[K][]) {
    super({ tag: 'table', id: 'folderList', appendTo: $parentElt });
    this.type = type;
    this.entries = new Map();
    for (const entry of entries) { this.addEntry(folder, entry); }
  }

  // Public Instance Methods

  public addEntry(folder: ClientFolder, entry: EntryTypeMap[K]): void {
    const row = new EntryRow<K>(this.$elt, folder, this.type, entry);
    this.entries.set(entry.name, row);
    // TODO: If empty folder message is shown then remove it.
  }

  public editName(name: FolderName|NotebookName): void {
    const row = this.entries.get(name)!;
    row.editName();
  }

  public removeEntry(entry: EntryTypeMap[K]): void {
    // LATER: Some sort of animation.
    // LATER: Identify name of user that made the change.
    const row = this.entries.get(entry.name)!;
    assert(row);
    row.destroy();
  }

  public renameEntry(oldName: string, entry: EntryTypeMap[K]): void {
    const row = this.entries.get(oldName)!;
    assert(row);
    // LATER: Move into sorted order, preferrably animated.
    row.rename(entry);
  }

  // --- PRIVATE ---

  // Private Constructor

  // Private Instance Properties

  private type: EntryType;
  private entries: Map<string, EntryRow<K>>;
}
