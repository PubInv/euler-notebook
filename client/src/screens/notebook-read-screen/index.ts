/*
Euler Notebook
Copyright (C) 2019-21 Public Invention
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

import * as debug1 from "debug";
const debug = debug1('client:notebook-read-screen');

import { assert, Html } from "../../shared/common";
import { CssClass } from "../../shared/css";
import { NotebookUpdate, NotebookCollaboratorConnected, NotebookCollaboratorDisconnected } from "../../shared/server-responses";
import { NotebookPath } from "../../shared/folder";

import { NotebookReadView } from "../../views/notebook-read-view";

import { ClientNotebook, NotebookView } from "../../models/client-notebook";

import { Screen } from "..";

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

export class NotebookReadScreen extends Screen  implements NotebookView {

  // Public Class Methods

  // Public Constructor

  public constructor(path: NotebookPath, mode: Mode) {
    debug(`Constructing.`);
    super({
      tag: 'div',
      classes: [<CssClass>'screen', <CssClass>'notebookReadScreen'],
      styles: { display: 'none' },
      data: { path },
    });

    ClientNotebook.open(path, this)
    .then(
      (notebook: ClientNotebook)=>{
        debug(`Notebook opened.`);
        this.notebook = notebook;
        // REVIEW: Switch the path over immediately at the beginning of the constructor,
        //         then updated the collaborators after the notebook has opened.
        appInstance.header.switchScreen(this.notebook.path, this.notebook.collaborators);
        const sidebar = new Sidebar(this, mode);
        this.readView = new NotebookReadView(this.notebook, mode);
        this.$elt.append(sidebar.$elt, this.readView.$elt);

        // Update the header and size our content for the area available.
        this.refresh();
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
    debug(`Showing.`);
    super.show();
    if (this.notebook) { this.refresh(); }
  }

  // Public Instance Event Handlers

  public onResize(_window: Window, _event: UIEvent): void { this.resize(); }

  // NotebookView Interface Methods

  public onClosed(reason: string): void {
    this.readView.destroy();
    this.displayErrorMessage(<Html>`Server closed notebook <tt>${this.notebook.path}</tt>: ${reason}`);
  }

  public onRedoStateChange(_enabled: boolean): void { /* Nothing to do */ }

  public onUndoStateChange(_enabled: boolean): void { /* Nothing to do */ }

  public onUpdate(_update: NotebookUpdate): void {
    // this.readView.onUpdate(update);
  }

  public onCollaboratorConnected(msg: NotebookCollaboratorConnected): void {
    appInstance.header.onCollaboratorConnected(msg.obj);
  };

  public onCollaboratorDisconnected(msg: NotebookCollaboratorDisconnected): void {
    appInstance.header.onCollaboratorDisconnected(msg.clientId);
  }

  // --- PRIVATE ---

  // Instance Properties

  // Instance Methods

  private refresh(): void {
    appInstance.header.switchScreen(this.notebook.path, this.notebook.collaborators);

    // We could have been resized since our window was last shown.
    this.resize();
  }

  private resize(): void {
    assert(this.readView);
    this.readView.resize();
  }

  // Private Instance Properties

  private readView!: NotebookReadView;
  // private sidebar: Sidebar;

  // Private Property Functions

  // Private Instance Methods

  // Private Event Handlers

}
