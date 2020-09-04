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

import { NotebookPath } from "../shared/folder"
import { NotebookChange, NotebookWatcher } from "../shared/notebook"

import { DebugPopup } from "./debug-popup"
import { reportError } from "../error-handler"
import { NotebookView } from "./notebook-view"
import { NotebookSidebar } from "./notebook-sidebar"
import { NotebookTools } from "./notebook-tools"
import { ClientNotebook, OpenNotebookOptions } from "../client-notebook"
import { Screen } from "../screen"

// Types

// Constants

// Global Variables

// Exported Class

export class NotebookScreen extends Screen implements NotebookWatcher {

  // Public Class Methods

  public static create($parent: HTMLElement, path: NotebookPath): NotebookScreen {
    return new this($parent, path);
  }

  // Public Instance Event Handlers

  public onResize(_window: Window, _event: UIEvent): void { /* Nothing to do. */ }

  // Public Instance Properties

  public debugPopup!: DebugPopup;
  public notebook!: ClientNotebook;
  public sidebar!: NotebookSidebar;
  public tools!: NotebookTools;
  public view!: NotebookView;

  // Public Instance Methods

  // ClientNotebookWatcher Methods

  public onChange(change: NotebookChange): void {
    this.view.onChange(change);
  }

  public onChangesFinished(): void {
    this.view.onChangesFinished();
  }

  public onClosed(reason?: string): void {
    this.sidebar.destroy();
    this.view.destroy();
    this.tools.destroy();
    this.debugPopup.destroy();
    this.displayErrorMessage(`Notebook ${this.notebook.path} closed by server: ${reason}`);
  }

  // --- PRIVATE ---

  // Private Constructor

  private constructor($parent: HTMLElement, path: NotebookPath) {
    super({
      tag: 'div',
      appendTo: $parent,
      classes: ['screen', 'notebookScreen'],
      id: path,
      style: 'display: none',
    });

    const options: OpenNotebookOptions = { mustExist: true, watcher: this };
    ClientNotebook.open(path, options)
    .then(
      (notebook: ClientNotebook)=>{
        this.notebook = notebook;
        this.sidebar = NotebookSidebar.create(this);
        this.view = NotebookView.create(this);
        this.tools = NotebookTools.create(this);
        this.debugPopup = DebugPopup.create(this);
      },
      (err)=>{
        reportError(err, `Error opening folder '${path}`);
        this.displayErrorMessage(`Error opening notebook '${path}'`);
      }
    );

  }

  // Private Instance Properties

  // Private Instance Methods

  // Private Event Handlers

}
