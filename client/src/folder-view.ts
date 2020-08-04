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

import { ClientFolder } from "./client-folder";
import { ClientNotebook } from "./client-notebook";
import { $new, svgIconReference } from "./dom";

// Requirements

// Exported Class

export class FolderView {

  // Class Methods

  public static create($parent: HTMLElement, folder: ClientFolder): FolderView {
    return new this($parent, folder);
  }

  // Instance Properties

  public $elt: HTMLElement;
  public folder!: ClientFolder;

  // Instance Methods

  // -- PRIVATE --

  // Private Constructor

  private constructor($parent: HTMLElement, folder: ClientFolder) {

    this.folder = folder;

    const $elt = this.$elt = $new({ tag: 'div', appendTo: $parent, class: 'view' });

    $new({
      tag: 'div',
      appendTo: $elt,
      html: "This folder is empty.",
      id: 'emptyFolderNotice',
      style: `display: ${folder.isEmpty?'block':'none'}`,
    });

    const $foldersList = $new({ tag: 'table', id: 'folderList', appendTo: $elt });
    for (const { name, path } of folder.folders) {
      $new({
        tag: 'tr',
        appendTo: $foldersList,
        class: 'folderListing',
        html: `<td>${svgIconReference('iconMonstrFolder2')}</td><td><a href="#${path}">${name}</a></td>`,
        id: path,
      });
    }

    const $notebooksList = $new({ tag: 'table', id: 'notebookList', appendTo: $elt });
    for (const { name, path } of folder.notebooks) {
      $new({
        tag: 'tr',
        appendTo: $notebooksList,
        class: 'notebookListing',
        html: `<td>${svgIconReference('iconMonstrFile5')}</td><td><a href="#${path}">${name}</a></td>`,
        id: ClientNotebook.htmlIdFromPath(path),
      });
    }

  }

  // Private Instance Properties

  // Private Event Handlers

}

