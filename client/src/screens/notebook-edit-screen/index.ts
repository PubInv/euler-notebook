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

import { CssClass, Html } from "../../shared/common";
import { NotebookPath } from "../../shared/folder";
import { NotebookUpdate, NotebookUserConnected, NotebookUserDisconnected } from "../../shared/server-responses";

import { NotebookEditView } from "../../views/notebook-edit-view";

import { ClientNotebook, NotebookView } from "../../client-notebook";

import { ScreenBase } from "../screen-base";

import { DebugPopup } from "./debug-popup";
import { SearchPanel } from "./search-panel";
import { Sidebar } from "./sidebar";
import { Tools } from "./tools";
import { appInstance } from "../../app";

// Types

// Constants

// Global Variables

// Exported Class

export class NotebookEditScreen extends ScreenBase implements NotebookView {

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
        appInstance.header.setPath(this.notebook.path);

        this.editView = new NotebookEditView(this, notebook);
        this.sidebar = new Sidebar(this);
        // TODO: this.tools = new Tools(this);
        this.searchPanel = new SearchPanel(this);
        this.debugPopup = new DebugPopup(this);

        this.$elt.append(this.sidebar.$elt, this.editView.$elt, this.searchPanel.$elt, this.debugPopup.$elt);
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
  public sidebar!: Sidebar;
  public tools!: Tools;
  public editView!: NotebookEditView;

  // Public Instance Methods

  public show(): void {
    if (this.notebook) {
      appInstance.header.setPath(this.notebook.path);
    }
    super.show();
  }

  public toggleSearchPanel(): void {
    if (this.searchPanel.isHidden) {
      this.searchPanel.show();
      this.searchPanel.setFocus();
    } else {
      this.searchPanel.hide();
    }
  }

  // Public Instance Event Handlers

  public onResize(_window: Window, _event: UIEvent): void { /* Nothing to do. */ }

  // ClientNotebookWatcher Methods

  public onClosed(reason?: string): void {
    this.sidebar.destroy();
    this.editView.destroy();
    this.tools.destroy();
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

  public onUserConnected(_msg: NotebookUserConnected, _ownRequest: boolean): void {
    // TODO: this.header.onUserConnected(msg, ownRequest);
  };

  public onUserDisconnected(_msg: NotebookUserDisconnected, _ownRequest: boolean): void {
    // TODO: this.header.onUserDisconnected(msg, ownRequest);
  }

  // --- PRIVATE ---

  // Private Instance Properties

  // Private Instance Methods

  // Private Event Handlers

}
