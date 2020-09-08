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

import { addAsyncEventListener, addSyncEventListener } from "./error-handler"
import { Header } from "./header"
import { Pathname, Screens } from "./screens"
import { ServerSocket } from "./server-socket"

// Types

// Constants

// Global Variables

// App Class

class App {

  // Class Methods

  // Public Constructor

  public constructor() {
    // DO NOT CALL. Just use appInstance singleton.
    addAsyncEventListener(window, 'DOMContentLoaded', e=>this.onDomContentLoaded(e), "App initialization error");
    addSyncEventListener<HashChangeEvent>(window, 'hashchange', e=>this.onHashChange(e), "App navigation error");

    Screens.initialize();
  }

  // Public Instance Properties

  // REVIEW: Ensure these are read-only?
  public header?: Header;
  public socket!: ServerSocket;  // Connection initiated at DOM ready.

  // Public Instance Methods

  // --- PRIVATE ---

  // Private Instance Properties


  // Private Property Functions

  private get currentPath(): Pathname {
    const hash = window.location.hash;
    return <Pathname>(hash.length <= 1 ? '/' : hash.slice(1));
  }

  // Private Instance Methods

  // Private Event Handlers

  private async onDomContentLoaded(_event: Event): Promise<void> {
    // TODO: this.banner = Banner.attach($(document, '#banner'));
    const $body = <HTMLBodyElement>window.document.body;
    this.header = Header.create($body);
    // TODO: Show a "connecting..." spinner.
    this.socket = await ServerSocket.connect(`ws://${window.location.host}/`);
    Screens.navigateTo(this.currentPath);
  }

  private onHashChange(_event: HashChangeEvent): void {
    Screens.navigateTo(this.currentPath);
  }
}

// Exported singleton instance

export const appInstance = new App();
