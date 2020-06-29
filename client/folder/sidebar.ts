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

import { $, $attach, $configureAll, $all } from '../src/dom.js';

// Types

export type View = '' | 'filesAndFolders' | 'createFolder' | 'createFile' | 'importFile';

// Constants

const FOCUS_MAP = new Map<View,string>([
  [ 'createFile', 'input[name="notebookName"]' ],
  [ 'createFolder', 'input[name="folderName"]' ],
  [ 'importFile', 'input[name="importFile"]' ],
]);

// Global Variables

// Sidebar Class

export class Sidebar {

  // Class Methods

  public static attach($elt: HTMLDivElement): Sidebar {
    return new this($elt);
  }

  // Instance Properties

  public get $currentView(): HTMLDivElement { return this.$viewMap.get(this.currentView)!; }

  // Instance Methods

  public connect(): void { }

  public switchView(newView: View): void {

    // TODO: assert(newView);
    if (newView == this.currentView) {
      console.warn(`Switching to view that is currently in view.`);
      return;
    }

    // Hide the old view, if any.
    if (this.currentView != '') {
      this.$currentView.style.display = 'none';
      $<HTMLButtonElement>(document, `#${this.currentView}ViewButton`).disabled = false;
    }

    // Show the new view.
    this.currentView = newView;
    this.$currentView.style.display = 'block';
    $<HTMLButtonElement>(document, `#${this.currentView}ViewButton`).disabled = true;

    this.focusOnCurrentView();
  }

  // -- PRIVATE --

  // Constructor

  private constructor($elt: HTMLDivElement) {

    this.$viewMap = new Map([
      ['filesAndFolders', $(document, '#filesAndFoldersView')],
      ['createFolder',    $(document, '#createFolderView')],
      ['createFile',      $(document, '#createFileView')],
      ['importFile',      $(document, '#importFileView')],
    ]);
    this.currentView = '';

    // Sidebar button events
    $attach($elt, '#filesAndFoldersViewButton', { listeners: { click: (_e: MouseEvent)=>this.switchView('filesAndFolders') }});
    $attach($elt, '#createFolderViewButton', { listeners: { click: (_e: MouseEvent)=>this.switchView('createFolder') }});
    $attach($elt, '#createFileViewButton', { listeners: { click: (_e: MouseEvent)=>this.switchView('createFile') }});
    $attach($elt, '#homeButton', { listeners: { click: _e=>{ window.location.href = '/'; }}});
    $attach($elt, '#importFileViewButton', { listeners: { click: (_e: MouseEvent)=>this.switchView('importFile') }});

    // Prevent sidebar buttons from taking focus when clicked.
    // REVIEW: Code duplicated in header.ts.
    $configureAll($all($elt, 'button'), {
      // REVIEW: Use pointer event instead? Will this handle touches and stylus taps?
      listeners: { mousedown: (e: MouseEvent)=>{ e.preventDefault(); }},
    });
  }

  // Private Instance Properties

  private $viewMap: Map<View, HTMLDivElement>;
  private currentView: View;

  // Private Instance Methods

  private focusOnCurrentView(): void {
    const $view = this.$viewMap.get(this.currentView);
    const selector = FOCUS_MAP.get(this.currentView);
    if (selector) {
      $<HTMLInputElement>($view!, selector).focus();
    }
  }

  // Private Event Handlers


}