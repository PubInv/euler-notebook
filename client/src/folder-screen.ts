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

import { FolderPath } from './shared/folder';
import { $new } from "./dom";
import { FolderView } from './folder-view';
import { FolderSidebar } from './folder-sidebar';
import { Screen } from './screen';

// Types

// Constants

// Global Variables

// Exported Class

export class FolderScreen extends Screen {

  // Class Methods

  public static create($parent: HTMLElement, path: FolderPath): FolderScreen {
    return new this($parent, path);
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
    /* this.sidebar = */ FolderSidebar.create(this, path);
    /* this.view = */ FolderView.create(this, path);
  }
}
