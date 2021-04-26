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

// TODO: Don't have singleton debug popup window. Instead, anyone that needs a debug popup can create one,
//       and the element is destroyed when the user clicks the close button.

// Requirements

import { Html } from "../../shared/common";
import { CssClass } from "../../shared/css";
import { NotebookPath } from "../../shared/folder";
import { NotebookUpdate, NotebookCollaboratorConnected, NotebookCollaboratorDisconnected } from "../../shared/server-responses";

import { NotebookEditView } from "./notebook-edit-view";

import { ClientNotebook, NotebookWatcher } from "../../models/client-notebook";

import { Screen } from "..";

import { DebugPopup } from "./debug-popup";
import { ReferencePanel } from "./reference-panel";
import { SearchPanel } from "./search-panel";
import { Sidebar } from "./sidebar";
import { appInstance } from "../../app";

// Types

// Constants

// Global Variables

// Exported Class

export class NotebookEditScreen extends Screen implements NotebookWatcher {

  // Public Constructor

  public constructor(path: NotebookPath) {
    super({
      tag: 'div',
      classes: [<CssClass>'screen', <CssClass>'notebookEditScreen'],
      styles: { display: 'none' },
      data: { path },
    });

    ClientNotebook.open(path, this)
    .then(
      (notebook: ClientNotebook)=>{
        this.notebook = notebook;
        appInstance.header.switchScreen(this.notebook.path, this.notebook.collaborators);

        this.editView = new NotebookEditView(this, notebook);
        this.sidebar = new Sidebar(this);
        this.referencePanel = new ReferencePanel(/* this */);
        this.searchPanel = new SearchPanel(this);
        this.debugPopup = new DebugPopup(this);

        this.$elt.append(this.sidebar.$elt, this.editView.$elt, this.searchPanel.$elt, this.referencePanel.$elt, this.debugPopup.$elt);
      },
      (err)=>{
        this.displayError(err, <Html>`Error opening notebook <tt>${path}</tt>`);
      }
    );
  }

  // Public Instance Properties

  public debugPopup!: DebugPopup;
  public notebook!: ClientNotebook;
  public searchPanel!: SearchPanel;
  public referencePanel!: ReferencePanel;
  public sidebar!: Sidebar;
  public editView!: NotebookEditView;

  // Public Instance Methods

  public toggleReferencePanel(): void {
    if (this.referencePanel.isHidden) {
      if (!this.searchPanel.isHidden) { this.searchPanel.hide(); }
      this.referencePanel.show();
      this.referencePanel.setFocus();
    } else {
      this.referencePanel.hide();
    }
  }

  public toggleSearchPanel(): void {
    if (this.searchPanel.isHidden) {
      if (!this.referencePanel.isHidden) { this.referencePanel.hide(); }
      this.searchPanel.show();
      this.searchPanel.setFocus();
    } else {
      this.searchPanel.hide();
    }
  }

  // Public Instance Event Handlers

  public onResize(_window: Window, _event: UIEvent): void { /* Nothing to do. */ }

  // NotebookWatcher Methods

  public onClosed(reason?: string): void {
    this.sidebar.destroy();
    this.editView.destroy();
    this.debugPopup.destroy();
    this.displayErrorMessage(<Html>`Server closed notebook <tt>${this.notebook.path}</tt>: ${reason}`);
  }

  public onRedoStateChange(enabled: boolean): void {
    this.sidebar.onRedoStateChange(enabled);
  }

  public onUndoStateChange(enabled: boolean): void {
    this.sidebar.onUndoStateChange(enabled);
  }

  public onUpdate(change: NotebookUpdate): void {
    this.editView.onUpdate(change);
  }

  public onCollaboratorConnected(msg: NotebookCollaboratorConnected): void {
    appInstance.header.onCollaboratorConnected(msg.obj);
  };

  public onCollaboratorDisconnected(msg: NotebookCollaboratorDisconnected): void {
    appInstance.header.onCollaboratorDisconnected(msg.clientId);
  }

  // --- PRIVATE ---

  // Private Instance Properties

  // Private Instance Methods

  // Private Instance Event Handlers

  protected onAfterShow(): void {
    super.onAfterShow();
    if (this.notebook) {
      appInstance.header.switchScreen(this.notebook.path, this.notebook.collaborators);
    }
  }


}
