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

import { $ } from '../dom.js';
import { showErrorMessage } from '../global.js';

import { FilesAndFoldersView } from './files-and-folders-view.js';
import { Header } from './header.js';
import { Sidebar, View } from './sidebar.js';

// Types

// Constants

// Global Variables

let gApp: App;

// App Class

class App {

  // Class Methods

  public static attach($body: HTMLBodyElement): App {
    return new this($body);
  }

  // Constructor

  private constructor($body: HTMLBodyElement) {
    this.header = Header.attach($<HTMLDivElement>($body, '#header')!);
    this.folderView = FilesAndFoldersView.attach($<HTMLDivElement>($body, '#filesAndFoldersView')!);
    this.sidebar = Sidebar.attach($<HTMLDivElement>($body, '#sidebar')!);

    // // Window events
    // const that = this;
    // window.addEventListener<'resize'>('resize', function(this: Window, e: UIEvent) { that.onResize(this, e); });
  }

  // Instance Properties

  // Instance Methods

  public async connect(): Promise<void> {
    this.header.connect();
    this.folderView.connect();
    this.sidebar.connect();

    const initialView: View = 'filesAndFolders';
    this.sidebar.switchView(initialView);
  }

  // Private Instance Properties

  private header: Header;
  private folderView: FilesAndFoldersView;
  private sidebar: Sidebar;

  // Private Property Functions

  // Private Instance Methods

  // Private Event Handlers

//   private onResize(_window: Window, _event: UIEvent): void {
//     try {
//       // const bodyViewRect = $('#content').getBoundingClientRect();
//     } catch(err) {
//       showErrorMessage("Error handling window resize event.", err);
//     }
//   }
 }

// Helper Functions

// Application Entry Point

// REVIEW: Class static method?
function onDomReady(_event: Event): void {
  try {
    console.log('DOM ready.');
    gApp = App.attach(<HTMLBodyElement>document.body);
    gApp.connect()
    .then(
      function() { console.log('App ready.'); },
      function(err: Error) { console.error(`Asynchronous error in onDomReady: ${err.message}`); },
    )
  } catch (err) {
    showErrorMessage("App initialization error.", err);
    throw err;
  }
}

function main(): void {
  window.addEventListener('DOMContentLoaded', onDomReady);
}

main();
