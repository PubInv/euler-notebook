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

// TODO: Don't have singleton debug popup window. Instead, anyone that needs a debug popup can create one,
//       and the element is destroyed when the user clicks the close button.

// Requirements

import { NotebookPath } from './shared/folder';
import { NotebookChange } from './shared/notebook';

import { $new } from './dom';
import { DebugPopup } from './debug-popup';
import { reportError } from './error-handler';
import { NotebookView } from './notebook-view';
import { NotebookBasedScreen } from './screen';
import { NotebookSidebar } from './notebook-sidebar';
import { NotebookTools } from './notebook-tools';
import { ClientNotebook } from './client-notebook';

// Types

// Constants

// Global Variables

// Exported Class

export class NotebookScreen extends NotebookBasedScreen {

  // Public Class Methods

  public static create($parent: HTMLElement, path: NotebookPath): NotebookScreen {
    const instance = new this($parent, path);
    instance.connect(path).catch(err=>reportError(err, `Error opening folder ${path}.`));
    return instance;
  }

  // Public Instance Methods

  public smChange(_change: NotebookChange): void { /* TODO: */ };

  public updateView(): void { /* TODO: */ };

  // --- PRIVATE ---

  // Private Constructor

  private constructor($parent: HTMLElement, path: NotebookPath) {
    const $elt = $new({
      tag: 'div',
      appendTo: $parent,
      classes: ['screen', 'notebookScreen'],
      id: path,
      style: 'display: none',
    });
    super($elt);

    this.sidebar = NotebookSidebar.create($elt);
    this.view = NotebookView.create($elt);
    this.tools = NotebookTools.create($elt);
    this.debugPopup = DebugPopup.create($elt);
  }

  // Instance Properties

  // Instance Methods

  public async connect(path: NotebookPath): Promise<void> {
    const notebook = await ClientNotebook.open(path);
    this.sidebar.connect(this.view, this.debugPopup);
    this.view.connect(notebook, this.sidebar, this.tools, this.debugPopup);
    this.tools.connect(this.view);
  }

  // Private Instance Properties

  private debugPopup: DebugPopup;
  private view: NotebookView;
  private sidebar: NotebookSidebar;
  private tools: NotebookTools;

  // Private Property Functions

  // Private Instance Methods

  // Private Event Handlers

}
