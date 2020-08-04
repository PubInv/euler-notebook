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

import { NotebookChange } from './shared/notebook';
import { Path, NotebookPath } from './shared/folder';

import { $new } from './dom';
import { reportError } from './error-handler';
import { PageView, PageViewType } from './page-view';
import { NotebookBasedScreen } from './screen';
import { ServerSocket } from './server-socket';
import { PageSidebar } from './page-sidebar';

// Types

// Constants

// Global Variables

// Exported Class

export class PageScreen extends NotebookBasedScreen {

  // Public Class Methods

  public static create($parent: HTMLElement, socket: ServerSocket, path: NotebookPath): PageScreen {
    const instance = new this($parent, path);
    instance.connect(socket, path).catch(err=>reportError(err, `Error opening folder ${path}.`));
    return instance;
  }

  public smChange(_change: NotebookChange): void { /* TODO: */ };

  public updateView(): void { /* TODO: */ };

  // --- PRIVATE ---

  // Private Constructor

  private constructor($parent: HTMLElement, path: Path) {
    const $elt = $new({
      tag: 'div',
      appendTo: $parent,
      classes: ['screen', 'pageScreen'],
      id: path,
      style: 'display: none',
    });
    super($elt);

    // Window events
    const that = this;
    window.addEventListener<'resize'>('resize', function(this: Window, e: UIEvent) { that.onResize(this, e); });
  }

  // Instance Properties

  // Instance Methods

  public async connect(socket: ServerSocket, path: NotebookPath): Promise<void> {
    const notebook = await socket.openNotebook(path);
    this.pageView = PageView.create(this.$elt, notebook, PageViewType.Single);
    /* this.sidebar = */ PageSidebar.create(this.$elt, notebook);
  }

  // Private Instance Properties

  private pageView?: PageView;

  // private sidebar: PageSidebar;

  // Private Property Functions

  // Private Instance Methods

  // Private Event Handlers

  private onResize(_window: Window, _event: UIEvent): void {
    try {
      // const bodyViewRect = $('#content').getBoundingClientRect();
      // REVIEW: Could this.pageView be undefined?
      this.pageView!.resize(/* bodyViewRect.width */);
    } catch(err) {
      reportError(err, "Error handling resize event.");
    }
  }
}
