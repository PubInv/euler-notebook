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

import { $new, svgIconReference } from "../dom";
import { FolderScreen } from ".";
import { HtmlElement } from "../html-element";

// Types

// Constants

// Global Variables

// Exported Class

export class FolderSidebar extends HtmlElement<'div'>  {

  // Public Class Methods

  public static create(screen: FolderScreen): FolderSidebar {
    return new this(screen);
  }

  // Public Instance Properties

  // Public Instance Methods

  // -- PRIVATE --

  // Constructor

  private constructor(screen: FolderScreen) {

    const $newFolderButton = $new({
      tag: 'button',
      html: svgIconReference('iconMonstrFolder5'),
      asyncListeners: {
        click: (e: MouseEvent)=>this.onNewFolderClicked(e)
      },
      title: "Page thumbnail view",
    });

    const $newNotebookButton = $new({
      tag: 'button',
      html: svgIconReference('iconMonstrFile15'),
      asyncListeners: {
        click: (e: MouseEvent)=>this.onNewNotebookClicked(e)
      },
      title: "Reading view",
    });

    super({
      tag: 'div',
      appendTo: screen.$elt,
      class: 'sidebar',
      children: [ $newFolderButton, $newNotebookButton ],
    });

    this.screen = screen;


  }

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
