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

import { CssClass } from "../../shared/common";
import { $new, svgIconReference } from "../../dom";
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
      attrs: { title: "New Folder"},
      html: svgIconReference('iconMonstrFolder5'),
      asyncListeners: {
        click: (e: MouseEvent)=>this.onNewFolderClicked(e)
      },
      title: "Page thumbnail view",
    });

    const $newNotebookButton = $new({
      tag: 'button',
      class: <CssClass>'iconButton',
      attrs: { title: "New Notebook"},
      html: svgIconReference('iconMonstrFile15'),
      asyncListeners: {
        click: (e: MouseEvent)=>this.onNewNotebookClicked(e)
      },
      title: "Reading view",
    });

    super({
      tag: 'div',
      appendTo: screen.$elt,
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

  // Private Event Handlers

  private async onNewFolderClicked(e: MouseEvent): Promise<void> {
    e.preventDefault(); // Do not take focus.
    const entry = await this.screen.folder.newFolder();
    this.screen.view.editFolderName(entry.name);
    // Other possible behavior: open the new folder.
    // appInstance.navigateTo(path);
  }

  private async onNewNotebookClicked(e: MouseEvent): Promise<void> {
    e.preventDefault(); // Do not take focus.
    const entry = await this.screen.folder.newNotebook();
    this.screen.view.editNotebookName(entry.name);
    // Other possible behavior: open the new folder.
    // appInstance.navigateTo(entry.path);
  }

}
