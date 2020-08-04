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

// TODO: Dispose of screens if they have not been shown in a sufficiently long time.

// Requirements

import { FOLDER_PATH_RE, NOTEBOOK_PATH_RE, Path, FolderPath, NotebookPath } from './shared/folder';

import { $ } from './dom';
import { addAsyncEventListener, addSyncEventListener } from './error-handler';
import { FolderScreen } from './folder-screen';
import { Header } from './header';
import { NotebookScreen } from './notebook-screen';
import { PageScreen } from './page-screen';
import { Screen } from './screen';
import { ServerSocket } from './server-socket';

// Types

// Constants

// Global Variables

// App Class

class App {

  // Class Methods

  public static create(): App {
    return new this();
  }

  // Constructor

  private constructor() {
    this.$body = <HTMLBodyElement>window.document.body;
    this.screens = new Map();
    addAsyncEventListener(window, 'DOMContentLoaded', e=>this.onDomReady(e), "App initialization error.");
    addSyncEventListener<HashChangeEvent>(window, 'hashchange', e=>this.onHashChange(e), "App navigation error.");
  }

  // Instance Properties

  // Instance Methods

  // Private Instance Properties

  private $body: HTMLBodyElement;
  private header?: Header;
  private screens: Map<Path, Screen>;
  private socket?: ServerSocket;

  // Private Property Functions

  private get currentPath(): Path {
    const hash = window.location.hash;
    return <Path>(hash.length <= 1 ? '/' : hash.slice(1));
  }

  // Private Instance Methods

  private createScreenForPath(path: Path): Screen {
    // Check if the path is to a folder or a notebook.
    if (NOTEBOOK_PATH_RE.test(path)) {
      // const clientNotebook = await this.socket.openNotebook(path);
      const isPageView = false;
      if (!isPageView) {
        return NotebookScreen.create(this.$body, this.socket!, <NotebookPath>path);
        // await this.notebookScreen.connect(this.socket, clientNotebook);
        // clientNotebook.connect(this.notebookScreen);
      } else {
        return PageScreen.create(this.$body, this.socket!, <NotebookPath>path);
        // await this.pageScreen.connect(this.socket, clientNotebook);
        // clientNotebook.connect(this.pageScreen);
      }
    } else if (FOLDER_PATH_RE.test(path)) {
      return FolderScreen.create(this.$body, this.socket!, <FolderPath>path);
    } else {
      throw new Error("Invalid path.");
    }
  }

  private navigateTo(path: Path): void {
    console.log(`Navigating to ${this.currentPath}`);

    let nextScreen = this.screens.get(path);
    if (!nextScreen) {
      nextScreen = this.createScreenForPath(path);
      this.screens.set(path, nextScreen);
    }
    this.header!.setPathTitle(path);
    Screen.show(nextScreen);
  }

  // Private Event Handlers

  private async onDomReady(_event: Event): Promise<void> {
    // TODO: this.banner = Banner.attach($(document, '#banner'));
    this.header = Header.attach($<'div'>(document, '#header'));
    // TODO: Show a "connecting..." spinner.
    this.socket = await ServerSocket.connect(`ws://${window.location.host}/`);
    this.navigateTo(this.currentPath);
  }

  private onHashChange(_event: HashChangeEvent): void {
    this.navigateTo(this.currentPath);
  }
}

// Exported singleton instance

export const appInstance = App.create();
