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

import { Path, FolderPath } from './shared/folder';
import { $new } from "./dom";
import { reportError } from "./error-handler";
import { FolderView } from './folder-view';
import { FolderSidebar } from './folder-sidebar';
import { Screen } from './screen';
// import { ServerSocket } from './server-socket';
import { FolderChange } from './shared/folder';
import { ServerSocket } from './server-socket';

// Types

// Constants

// Global Variables

// Exported Class

export class FolderScreen extends Screen {

  // Class Methods

  public static create($parent: HTMLElement, socket: ServerSocket, path: FolderPath): FolderScreen {
    const instance = new this($parent, path);
    instance.connect(socket, path).catch(err=>reportError(err, `Error opening folder ${path}.`));
    return instance;
  }

  // Public Instance Methods

  public smChange(_change: FolderChange): void { /* TODO: */ };

  public updateView(): void { /* TODO: */ };

  // --- PRIVATE ---

  // Private Constructor

  private constructor($parent: HTMLElement, path: Path) {
    const $elt = $new({
      tag: 'div',
      appendTo: $parent,
      classes: ['screen', 'folderScreen'],
      id: path,
      style: 'display: none',
    });
    super($elt);


    // // Window events
    // const that = this;
    // window.addEventListener<'resize'>('resize', function(this: Window, e: UIEvent) { that.onResize(this, e); });
  }

  // Private Instance Properties

  // private folder!: ClientFolder;

  // Private Instance Methods

  private async connect(socket: ServerSocket, path: FolderPath): Promise<void> {
    const folder = /* this.folder = */ await socket.openFolder(path);
    /* this.sidebar = */ FolderSidebar.create(this.$elt, folder);
    /* this.view = */ FolderView.create(this.$elt, folder);
  }

  // Private Instance Properties

  // private sidebar: FolderSidebar;
  // private view: FolderView;

  // Private Property Functions

  // Private Instance Methods

  // Private Event Handlers

//   private onResize(_window: Window, _event: UIEvent): void {
//     try {
//       // const bodyViewRect = $('#content').getBoundingClientRect();
//     } catch(err) {
//       showErrorMessage("Error handling window resize event.", err);
//     }
//   }
}

// Helper Functions

// function htmlIdFromPath(path: FolderPath|NotebookPath): string {
// }
