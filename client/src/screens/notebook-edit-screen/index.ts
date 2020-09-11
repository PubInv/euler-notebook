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

import { NotebookPath } from "../../shared/folder";
import { NotebookChange, NotebookWatcher } from "../../shared/notebook";

import { DebugPopup } from "./debug-popup";
import { reportError } from "../../error-handler";
import { Content } from "./content";
import { Sidebar } from "./sidebar";
import { Tools } from "./tools";
import { ClientNotebook, OpenNotebookOptions } from "../../client-notebook";
import { ScreenBase } from "../screen-base";

// Types

// Constants

// Global Variables

// Exported Class

export class NotebookEditScreen extends ScreenBase implements NotebookWatcher {

  // Public Class Methods

  public static create($parent: HTMLElement, path: NotebookPath): NotebookEditScreen {
    return new this($parent, path);
  }

  // Public Instance Event Handlers

  public onResize(_window: Window, _event: UIEvent): void { /* Nothing to do. */ }

  // Public Instance Properties

  public debugPopup!: DebugPopup;
  public notebook!: ClientNotebook;
  public sidebar!: Sidebar;
  public tools!: Tools;
  public view!: Content;

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
      appendTo: $parent,
      classes: ['screen', 'notebookEditScreen'],
      data: { path },
      tag: 'div',
    });

    const options: OpenNotebookOptions = { mustExist: true, watcher: this };
    ClientNotebook.open(path, options)
    .then(
      (notebook: ClientNotebook)=>{
        this.notebook = notebook;
        this.sidebar = new Sidebar(this);
        this.view = new Content(this);
        this.tools = new Tools(this);
        this.debugPopup = new DebugPopup(this);
      },
      (err)=>{
        reportError(err, `Error opening notebook '${path} for editing`);
        this.displayErrorMessage(`Error opening notebook '${path}'`);
      }
    );

  }

  // Private Instance Properties

  // Private Instance Methods

  // Private Event Handlers

}
