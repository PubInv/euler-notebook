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

import { ButtonBar } from './button-bar';
import { DebugPopup } from './debug-popup';
import { $new, $, svgIconReference } from './dom';
import {
  ICON_BUG12, ICON_CLOTHING18, ICON_FILE12, ICON_IDEA10, ICON_KEYBOARD2, ICON_LOGOUT18,
  ICON_PENCIL9, ICON_REDO4, ICON_TRASHCAN2, ICON_UNDO4
} from './iconmonstr-icons';
import { NotebookView } from './notebook-view';

// Types

// Constants

// Global Variables

// Exported Class

export class NotebookSidebar extends ButtonBar {

  // Public Class Methods

  public static create($parent: HTMLElement): NotebookSidebar {
    return new this($parent);
  }

  // Public Instance Properties

  // Public Instance Methods

  public connect(notebookView: NotebookView, debugPopup: DebugPopup): void {
    this.debugPopup = debugPopup;
    this.view = notebookView;
  }

  public enableDebugButton(enable: boolean): void { this.$debugButton.disabled = !enable; }
  public enableRedoButton(enable: boolean): void { this.$redoButton.disabled = !enable; }
  public enableTrashButton(enable: boolean): void { this.$trashButton.disabled = !enable; }
  public enableUndoButton(enable: boolean): void { this.$undoButton.disabled = !enable; }

  // -- PRIVATE --

  // Constructor

  private constructor($parent: HTMLElement) {
    const $elt = $new({
      tag: 'div',
      appendTo: $parent,
      class: 'sidebar',
      children: [
        { // #thumbnailViewButton
          tag: 'button',
          html: ICON_FILE12,
          listeners: { click: (_e: MouseEvent)=>{ throw new Error("TODO: NOT IMPLEMENTED"); }},
          title: "Page thumbnail view",
        }, { // #pageViewButton
          tag: 'button',
          html: svgIconReference('iconMonstrFile15'),
          listeners: { click: (_e: MouseEvent)=>{ throw new Error("TODO: NOT IMPLEMENTED"); }},
          title: "Reading view",
        }, {
          tag: 'div', class: 'separator'
        }, { // #inputKeyboardButton
          tag: 'button',
          html: ICON_KEYBOARD2,
          listeners: { click: (e: MouseEvent)=>this.onKeyboardButtonClicked(e) },
          title: "Insert keyboard cell",
        }, { // #insertDrawingButton
          tag: 'button',
          html: ICON_PENCIL9,
          listeners: { click: (e: MouseEvent)=>this.onInsertDrawingButtonClicked(e) },
          title: "Insert drawing cell",
        }, { // #insertHintButton
          tag: 'button',
          html: ICON_IDEA10,
          listeners: { click: (e: MouseEvent)=>this.onInsertHintButtonClicked(e) },
          title: "Insert hint cell",
        }, {
          tag: 'div', class: 'separator'
        }, { // #undoButton // TODO: Start out disabled?
          tag: 'button',
          class: 'undoButton',
          html: ICON_UNDO4,
          listeners: { click: (e: MouseEvent)=>this.onUndoButtonClicked(e) },
          title: "Undo",
        }, { // #redoButton // TODO: Start out disabled?
          tag: 'button',
          class: 'redoButton',
          html: ICON_REDO4,
          listeners: { click: (e: MouseEvent)=>this.onRedoButtonClicked(e) },
          title: "Redo",
        }, {
          tag: 'div', class: 'separator'
        }, { // #exportButton
          tag: 'button',
          html: ICON_LOGOUT18,
          listeners: { click: e=>this.onExportButtonClicked(e) },
          title: "Export notebook",
        }, { // #debugButton
          tag: 'button',
          class: 'debugButton',
          html: ICON_BUG12,
          listeners: { click: e=>this.onDebugButtonClicked(e) },
          title: "Debug window",
        }, {
          tag: 'div', class: 'separator'
        }, { // #developmentButton
          tag: 'button',
          html: ICON_CLOTHING18,
          listeners: { click: (e: MouseEvent)=>this.onDevelopmentButtonClicked(e) },
          title: "For development use only",
        }, { // #trashButton
          tag: 'button',
          class: 'trashButton',
          html: ICON_TRASHCAN2,
          listeners: { click: (e: MouseEvent)=>this.onTrashButtonClicked(e) },
          title: "Trash",
        },
      ],
    });
    super($elt);

    // Sidebar button events
    this.$debugButton = $<'button'>($elt, '.debugButton');
    this.$redoButton = $<'button'>($elt, '.redoButton');
    this.$trashButton = $<'button'>($elt, '.trashButton');
    this.$undoButton = $<'button'>($elt, '.undoButton');
  }

  // Private Instance Properties

  private $debugButton: HTMLButtonElement;
  private $redoButton: HTMLButtonElement;
  private $trashButton: HTMLButtonElement;
  private $undoButton: HTMLButtonElement;
  private debugPopup!: DebugPopup;  // Set in 'connect'
  private view!: NotebookView;      // Set in 'connect'

  // Private Instance Methods

  private asyncCommand(command: string, promise: Promise<void>): void {
    promise.catch(err=>{
      // TODO: Display error message to user.
      console.error(`Error executing async ${command} command: ${err.message}`);
      // TODO: Dump stack trace
    });
  }

  // Private Event Handlers

  private onDebugButtonClicked(_event: MouseEvent): void {
    this.enableDebugButton(false);
    this.debugPopup.show("<b>TODO: get HTML from notebook.</b>");
  }

  private onDevelopmentButtonClicked(_e: MouseEvent): void {
    this.asyncCommand("Development-Button", this.view.developmentButtonClicked());
  }

  private onExportButtonClicked(_event: MouseEvent): void {
    this.view.notebook.export();
  }

  private onInsertDrawingButtonClicked(_e: MouseEvent): void {
    this.asyncCommand("Insert-Drawing", this.view.insertInkCellBelow());
  }

  private onInsertHintButtonClicked(_e: MouseEvent): void {
    this.asyncCommand("Insert-Hint", this.view.insertHintCellBelow());
  }

  private onKeyboardButtonClicked(_e: MouseEvent): void {
    this.asyncCommand("Insert-Keyboard", this.view.insertKeyboardCellBelow());
  }

  private onRedoButtonClicked(_e: MouseEvent): void {
    this.asyncCommand("Redo", this.view.redo());
  }

  private onTrashButtonClicked(_e: MouseEvent): void {
    this.asyncCommand("Trash", this.view.deleteSelectedCells());
  }

  private onUndoButtonClicked(_e: MouseEvent): void {
    this.asyncCommand("Undo", this.view.undo());
  }

}