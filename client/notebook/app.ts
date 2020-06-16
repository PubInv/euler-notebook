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
import { DebugPopup } from './debug-popup.js';
import { showErrorMessage } from '../global.js';
import { Header } from './header.js';
import { NotebookView } from './notebook-view.js';
import { ClientNotebook } from './client-notebook.js';
import { PageView, PageViewType } from './page-view.js';
import { ServerSocket } from './server-socket.js';
import { Sidebar, View } from './sidebar.js';
import { NotebookPath } from '../shared/math-tablet-api.js';

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
    this.debugPopup = DebugPopup.attach($body.querySelector<HTMLDivElement>('#debugPopup')!);
    this.header = Header.attach($body.querySelector<HTMLDivElement>('#header')!);
    this.notebookView = NotebookView.attach($body.querySelector<HTMLDivElement>('#notebookView')!);
    this.sidebar = Sidebar.attach($body.querySelector<HTMLDivElement>('#sidebar')!);
    this.pageView = PageView.attach($body.querySelector<HTMLDivElement>('#pageView')!, PageViewType.Single);
    this.thumbnailView = PageView.attach($<HTMLDivElement>(document, '#thumbnailView')!, PageViewType.Thumbnail);

    // Window events
    const that = this;
    window.addEventListener<'resize'>('resize', function(this: Window, e: UIEvent) { that.onResize(this, e); });
  }

  // Instance Properties

  // Instance Methods

  public async connect(wsUrl: string, notebookPath: NotebookPath): Promise<void> {

    // Make websocket connection to the notebook.
    this.socket = await ServerSocket.connect(wsUrl);

    // Open the notebook specified in our URL.
    const openNotebook = this.openNotebook = await this.socket.openNotebook(notebookPath);
    if (false) { console.dir(this.openNotebook); }

    openNotebook.connect(this.notebookView);
    this.debugPopup.connect(this.header, openNotebook);
    this.header.connect(this.debugPopup, openNotebook);
    this.notebookView.connect(openNotebook, this.sidebar);
    this.pageView.connect(this.notebookView, this.sidebar);
    this.sidebar.connect(this.notebookView);
    this.thumbnailView.connect(this.notebookView, this.sidebar);


    // LATER: If the notebook could have a non-empty selection initially
    //        (e.g. selection was saved across browser refresh) then we
    //        need to enable or disable the #trashButton here
    //        depending on whether the selection is empty or not.
    // $<HTMLButtonElement>(document, '#trashButton') = gNotebook.selectionIsEmpty();

    // const initialView: View = (DOCUMENT.pages.length>1 ? 'thumbnail' : 'page');
    const initialView: View = 'notebook';
    this.sidebar.switchView(initialView);
  }

  // Private Instance Properties

  private debugPopup: DebugPopup;
  private header: Header;
  private notebookView: NotebookView;
  private openNotebook!: ClientNotebook;
  private pageView: PageView;
  private sidebar: Sidebar;
  private socket!: ServerSocket;
  private thumbnailView: PageView;

  // Private Property Functions

  // Private Instance Methods

  // Private Event Handlers

  private onResize(_window: Window, _event: UIEvent): void {
    try {
      // const bodyViewRect = $('#content').getBoundingClientRect();
      this.pageView.resize(/* bodyViewRect.width */);
      this.thumbnailView.resize(/* bodyViewRect.width */);
    } catch(err) {
      showErrorMessage("Error handling resize event.", err);
    }
  }
}

// Helper Functions

// Application Entry Point

// REVIEW: Class static method?
function onDomReady(_event: Event): void {
  try {
    console.log('DOM ready.');
    const wsUrl = `ws://${window.location.host}/`;
    const notebookPath: NotebookPath = <NotebookPath>window.location.pathname;
    gApp = App.attach(<HTMLBodyElement>document.body);
    gApp.connect(wsUrl, notebookPath)
    .then(
      function() { console.log('App ready.'); },
      function(err: Error) { console.error(`Asynchronous error in onDomReady: ${err.message}`); },
    )
  } catch (err) {
    showErrorMessage("App initialization error.", err);
    throw err;
  }
}

function main(){
  window.addEventListener('DOMContentLoaded', onDomReady);
}

main();
