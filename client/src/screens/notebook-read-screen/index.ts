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

import { CssClass, Html, notImplementedWarning } from "../../shared/common";
import { NotebookUpdate, NotebookUserConnected, NotebookUserDisconnected } from "../../shared/server-responses";
import { NotebookPath } from "../../shared/folder";

import { NotebookReadView } from "../../views/notebook-read-view";

import { ClientNotebook, NotebookView } from "../../client-notebook";

import { ScreenBase } from "../screen-base";

import { Sidebar } from "./sidebar";
import { appInstance } from "../../app";

// Types

export enum Mode {
  Reading,
  Thumbnails,
}

// Constants

// Global Variables

// Exported Class

export class NotebookReadScreen extends ScreenBase  implements NotebookView {

  // Public Class Methods

  // Public Constructor

  public constructor(path: NotebookPath, mode: Mode) {
    super({
      tag: 'div',
      classes: [<CssClass>'screen', <CssClass>'notebookReadScreen'],
      styles: { display: 'none' },
      data: { path },
    });

    ClientNotebook.open(path, this)
    .then(
      (notebook: ClientNotebook)=>{
        this.notebook = notebook;
        appInstance.header.setPath(this.notebook.path);

        /* this.sidebar = */ new Sidebar(this, mode);
        this.readView = new NotebookReadView(this, mode);
      },
      (err)=>{
        this.displayError(err, <Html>`Error opening notebook <tt>${path}</tt>`);
      }
    );

  }

  // Public Instance Properties

  public notebook!: ClientNotebook;

  // Public Instance Methods

  public show(): void {
    if (this.notebook) {
      appInstance.header.setPath(this.notebook.path);
    }
    super.show();
  }

  // Public Instance Event Handlers

  public onResize(_window: Window, _event: UIEvent): void {
    // const bodyViewRect = $('#content').getBoundingClientRect();
    // REVIEW: Could this.pageView be undefined?
    this.readView!.resize(/* bodyViewRect.width */);
  }

  // NotebookView Interface Methods

  public onClosed(reason: string): void {
    this.readView.destroy();
    this.displayErrorMessage(<Html>`Server closed notebook <tt>${this.notebook.path}</tt>: ${reason}`);
  }

  public onRedoStateChange(_enabled: boolean): void { /* Nothing to do */ }

  public onUndoStateChange(_enabled: boolean): void { /* Nothing to do */ }

  public onUpdate(update: NotebookUpdate): void {
    this.readView.onUpdate(update);
  }

  public onUserConnected(_msg: NotebookUserConnected, _ownRequest: boolean): void {
    notImplementedWarning("NotebookReadScreen onUserConnected");
  };

  public onUserDisconnected(_msg: NotebookUserDisconnected, _ownRequest: boolean): void {
    notImplementedWarning("NotebookReadScreen onUserDisconnected");
  }

  // --- PRIVATE ---

  // Instance Properties

  // Instance Methods

  // Private Instance Properties

  private readView!: NotebookReadView;
  // private sidebar: Sidebar;

  // Private Property Functions

  // Private Instance Methods

  // Private Event Handlers

}
