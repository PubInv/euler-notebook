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

import { NotebookChange } from "../shared/notebook"
import { Path, NotebookPath } from "../shared/folder"

import { ClientNotebook, OpenNotebookOptions } from "../client-notebook"
import { reportError } from "../error-handler"
import { PageView, PageViewType } from "./page-view"
import { Screen } from "../screen"
import { PageSidebar } from "./page-sidebar"

// Types

// Constants

// Global Variables

// Exported Class

export class PageScreen extends Screen {

  // Public Class Methods

  public static create($parent: HTMLElement, path: NotebookPath): PageScreen {
    const instance = new this($parent, path);
    instance.connect(path).catch(err=>reportError(err, `Error opening folder ${path}.`));
    return instance;
  }

  // Public Instance Event Handlers

  public onResize(_window: Window, _event: UIEvent): void {
    // const bodyViewRect = $('#content').getBoundingClientRect();
    // REVIEW: Could this.pageView be undefined?
    this.pageView!.resize(/* bodyViewRect.width */);
  }

  // Notebook Watcher Methods

  public onChange(_change: NotebookChange): void {
    // TODO:
  }

  public onChangesFinished(): void {
    // TODO:
  }

  public onClosed(_reason?: string): void {
    // TODO:
  }

  // --- PRIVATE ---

  // Private Constructor

  private constructor($parent: HTMLElement, path: Path) {
    super({
      tag: 'div',
      appendTo: $parent,
      classes: ['screen', 'pageScreen'],
      id: path,
      style: 'display: none',
    });
  }

  // Instance Properties

  // Instance Methods

  public async connect(path: NotebookPath): Promise<void> {
    const options: OpenNotebookOptions = { mustExist: true, watcher: this };
    const notebook = await ClientNotebook.open(path, options);
    this.pageView = PageView.create(this.$elt, notebook, PageViewType.Single);
    /* this.sidebar = */ PageSidebar.create(this.$elt, notebook);
  }

  // Private Instance Properties

  private pageView?: PageView;

  // private sidebar: PageSidebar;

  // Private Property Functions

  // Private Instance Methods

  // Private Event Handlers

}
