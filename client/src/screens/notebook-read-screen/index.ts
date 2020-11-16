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

import { CssClass, Html, escapeHtml } from "../../shared/common";
import { NotebookUpdate } from "../../shared/server-responses";
import { NotebookPath } from "../../shared/folder";

import { ClientNotebook, OpenNotebookOptions } from "../../client-notebook";
import { reportError } from "../../error-handler";
import { ScreenBase } from "../screen-base";

import { Content } from "./content";
import { Sidebar } from "./sidebar";

// Types

export enum Mode {
  Reading,
  Thumbnails,
}

// Constants

// Global Variables

// Exported Class

export class NotebookReadScreen extends ScreenBase {

  // Public Class Methods

  // Public Constructor

  public constructor($parent: HTMLElement, path: NotebookPath, mode: Mode) {
    super({
      appendTo: $parent,
      classes: [<CssClass>'screen', <CssClass>'notebookReadScreen'],
      data: { path },
      tag: 'div',
    });

    const options: OpenNotebookOptions = { mustExist: true, watcher: this };
    ClientNotebook.open(path, options)
    .then(
      (notebook: ClientNotebook)=>{
        this.notebook = notebook;
        /* this.sidebar = */ new Sidebar(this, mode);
        this.content = new Content(this, mode);
      },
      (err)=>{
        const message = <Html>`Error opening notebook '${path}'`;
        reportError(err, message);
        this.displayErrorMessage(<Html>`${message}: ${escapeHtml(err.message)}`);
      }
    );

  }

  // Public Instance Properties

  public notebook!: ClientNotebook;

  // Public Instance Event Handlers

  public onResize(_window: Window, _event: UIEvent): void {
    // const bodyViewRect = $('#content').getBoundingClientRect();
    // REVIEW: Could this.pageView be undefined?
    this.content!.resize(/* bodyViewRect.width */);
  }

  // Notebook Watcher Methods

  public onChange(_change: NotebookUpdate): void {
    // TODO:
  }

  public onChangesFinished(): void {
    // TODO:
  }

  public onClosed(_reason?: string): void {
    // TODO:
  }

  // --- PRIVATE ---

  // Instance Properties

  // Instance Methods

  // Private Instance Properties

  private content?: Content;
  // private sidebar: Sidebar;

  // Private Property Functions

  // Private Instance Methods

  // Private Event Handlers

}
