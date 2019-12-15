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

import { $, $attach } from './dom.js';
import { NotebookView } from './notebook-view.js';

// Types

export type View = '' | 'notebook' | 'page' | 'thumbnail';

// Constants

// Global Variables

// Sidebar Class

export class Sidebar {

  // Class Methods

  public static attach($elt: HTMLDivElement): Sidebar { return new this($elt); }

  // Instance Properties

  public get $currentView(): HTMLDivElement { return this.$viewMap.get(this.currentView)!; }

  // Instance Methods

  public connect(notebookView: NotebookView): void { this.notebookView = notebookView; }

  public enableRedoButton(enable: boolean): void { this.$redoButton.disabled = !enable; }
  public enableTrashButton(enable: boolean): void { this.$trashButton.disabled = !enable; }
  public enableUndoButton(enable: boolean): void { this.$undoButton.disabled = !enable; }

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
      ['notebook',  $(document, '#notebookView')],
      ['page',      $(document, '#pageView')],
      ['thumbnail', $(document, '#thumbnailView')],
    ]);

    // Sidebar button events
    $attach($elt, '#thumbnailViewButton', { listeners: { click: (_e: MouseEvent)=>this.switchView('thumbnail') }});
    $attach($elt, '#pageViewButton', { listeners: { click: (_e: MouseEvent)=>this.switchView('page') }});
    $attach($elt, '#notebookViewButton', { listeners: { click: (_e: MouseEvent)=>this.switchView('notebook') }});
    $attach($elt, '#inputKeyboardButton', { listeners: { click: (e: MouseEvent)=>this.onKeyboardButtonClicked(e) }});
    $attach($elt, '#insertDrawingButton', { listeners: { click: (e: MouseEvent)=>this.onInsertDrawingButtonClicked(e) }});
    this.$redoButton = $attach<HTMLButtonElement>($elt, '#redoButton', { listeners: { click: (e: MouseEvent)=>this.onRedoButtonClicked(e) }});
    this.$trashButton = $attach<HTMLButtonElement>($elt, '#trashButton', { listeners: { click: (e: MouseEvent)=>this.onTrashButtonClicked(e) }});
    this.$undoButton = $attach<HTMLButtonElement>($elt, '#undoButton', { listeners: { click: (e: MouseEvent)=>this.onUndoButtonClicked(e) }});
    this.currentView = '';
  }

  // Private Instance Properties

  private $redoButton: HTMLButtonElement;
  private $trashButton: HTMLButtonElement;
  private $undoButton: HTMLButtonElement;
  private $viewMap: Map<View, HTMLDivElement>;
  private currentView: View;
  private notebookView!: NotebookView;  // Set in 'connect'

  // Private Instance Methods

  private asyncCommand(command: string, promise: Promise<void>): void {
    promise.catch(err=>{
      // TODO: Display error message to user.
      console.error(`Error executing async ${command} command: ${err.message}`);
      // TODO: Dump stack trace
    });
  }

  private focusOnCurrentView(): void { this.$currentView.focus(); }

  // Private Event Handlers

  private onInsertDrawingButtonClicked(_e: MouseEvent): void {
    this.notebookView.insertFigureCellBelow();
  }

  private onKeyboardButtonClicked(_e: MouseEvent): void {
    this.notebookView.insertKeyboardCellBelow();
  }

  private onRedoButtonClicked(_e: MouseEvent): void {
    this.asyncCommand("Redo", this.notebookView.redo());
    this.focusOnCurrentView();
  }

  private onTrashButtonClicked(_e: MouseEvent): void {
    this.asyncCommand("Trash", this.notebookView.deleteSelectedCells());
    this.focusOnCurrentView();
  }

  private onUndoButtonClicked(_e: MouseEvent): void {
    this.asyncCommand("Undo", this.notebookView.undo());
    this.focusOnCurrentView();
  }

}