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

import { assertFalse } from "../shared/common";
import { FOLDER_PATH_RE, NOTEBOOK_PATH_RE, FolderPath, NotebookPath } from "../shared/folder";

import { headerInstance } from "../header";

import { ScreenBase } from "./screen-base";
import { addSyncEventListener } from "../error-handler";
import { FolderScreen } from "./folder-screen";
import { NotebookEditScreen } from "./notebook-edit-screen";
import { NotebookReadScreen } from "./notebook-read-screen";
import { NotebookThumbnailsScreen } from "./notebook-thumbnails-screen";

// Types

export type Pathname = '{Pathname}';

// Constants

const NOTEBOOK_PATH_WITH_VIEW_RE = new RegExp("^(" + NOTEBOOK_PATH_RE.toString().slice(2,-2) + ")\\?view=(read|edit)$");

// Exported Class

export abstract class Screens {

  // Public Class Methods

  public static initialize(): void {
    // REVIEW: Could resize come before DOMContentLoaded?
    addSyncEventListener<UIEvent>(window, 'resize', e=>this.onResize(window, e), "Window resize event");
  }

  public static navigateTo(pathname: Pathname): void {
    console.log(`Navigating to ${pathname}`);

    if (this.currentScreen) { this.currentScreen.hide(); }

    headerInstance.setPathTitle(</* BUGBUG */NotebookPath>pathname);

    let nextScreen = this.instanceMap.get(pathname);
    if (!nextScreen) {
      nextScreen = this.createScreenForPathname(pathname);
      this.instanceMap.set(pathname, nextScreen);
    } else {
      if (nextScreen == this.currentScreen) { assertFalse(); }
      nextScreen.show();
    }
    this.currentScreen = nextScreen;
  }

  // --- PRIVATE ---

  // Private Class Properties

  private static $body: HTMLBodyElement = <HTMLBodyElement>window.document.body;
  private static instanceMap: Map<Pathname, ScreenBase> = new Map;
  private static currentScreen: ScreenBase|undefined;

  // Private Class Methods

  private static createScreenForPathname(pathname: Pathname): ScreenBase {

    const match = NOTEBOOK_PATH_WITH_VIEW_RE.exec(pathname);
    if (match) {
      const path = <NotebookPath>match[1];
      const view = match[5];
      switch(view) {
        case 'edit':
          return NotebookEditScreen.create(this.$body, path);
        case 'read':
          return new NotebookReadScreen(this.$body, path);
        default:
          assertFalse();
          break;
      }
    } else if (NOTEBOOK_PATH_RE.test(pathname)) {
      return new NotebookThumbnailsScreen(this.$body, <NotebookPath>pathname);
    } else if (FOLDER_PATH_RE.test(pathname)) {
      return FolderScreen.create(this.$body, <FolderPath>pathname);
    } else  {
      throw new Error("Invalid path.");
    }
  }

  // Private Class Event Handlers

  public static onResize(window: Window, event: UIEvent): void {
    // REVIEW: Notify all screens of resize?
    this.currentScreen?.onResize(window, event);
  }


}
