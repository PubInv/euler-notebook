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

import { CssClass } from "../../shared/css";
import { $new, svgIconReferenceMarkup } from "../../dom";
import { FolderScreen } from ".";
import { ButtonBar } from "../../components/button-bar";

// Types

// Constants

// Global Variables

// Exported Class

export class Sidebar extends ButtonBar {

  // Public Class Methods

  // Public Constructor

  public constructor(screen: FolderScreen) {

    const $newFolderButton = $new({
      tag: 'button',
      class: <CssClass>'iconButton',
      html: svgIconReferenceMarkup('iconMonstrFolder5'),
      asyncButtonHandler: (e: MouseEvent)=>this.onNewFolderClicked(e),
      title: "New folder",
    });

    const $newNotebookButton = $new({
      tag: 'button',
      class: <CssClass>'iconButton',
      html: svgIconReferenceMarkup('iconMonstrFile15'),
      asyncButtonHandler: (e: MouseEvent)=>this.onNewNotebookClicked(e),
      title: "New notebook",
    });

    super({
      tag: 'div',
      class: <CssClass>'sidebar',
      children: [ $newFolderButton, $newNotebookButton ],
    });

    this.screen = screen;
  }

  // Public Instance Properties

  // Public Instance Methods

  // -- PRIVATE --

  // Public Constructor

  // Private Instance Properties

  private screen: FolderScreen;

  // Private Instance Event Handlers

  private async onNewFolderClicked(e: MouseEvent): Promise<void> {
    e.preventDefault(); // Do not take focus.
    const entry = await this.screen.folder.newFolder();
    this.screen.view.editFolderName(entry.name);
  }

  private async onNewNotebookClicked(e: MouseEvent): Promise<void> {
    e.preventDefault(); // Do not take focus.
    const entry = await this.screen.folder.newNotebook();
    this.screen.view.editNotebookName(entry.name);
  }

}
