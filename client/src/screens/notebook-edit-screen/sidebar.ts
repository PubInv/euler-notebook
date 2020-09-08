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

import { ButtonBar } from "../../button-bar"
import { svgIconReference, $new } from "../../dom"
import { NotebookEditScreen } from "."

// Types

// Constants

// Global Variables

// Exported Class

export class Sidebar extends ButtonBar {

  // Public Class Methods

  // Public Constructor

  public constructor(screen: NotebookEditScreen) {

    const $debugButton = $new({
      tag: 'button',
      class: 'iconButton',
      html: svgIconReference('iconMonstrBug12'),
      listeners: { click: e=>this.onDebugButtonClicked(e) },
      title: "Debug window",
    });

    const $redoButton = $new({ // TODO: Start out disabled?
      tag: 'button',
      class: 'iconButton',
      html: svgIconReference('iconMonstrRedo4'),
      listeners: { click: (e: MouseEvent)=>this.onRedoButtonClicked(e) },
      title: "Redo",
    });

    const $trashButton = $new({
      tag: 'button',
      class: 'iconButton',
      html: svgIconReference('iconMonstrTrashcan2'),
      listeners: { click: (e: MouseEvent)=>this.onTrashButtonClicked(e) },
      title: "Trash",
    });

    const $undoButton = $new({
      tag: 'button',
      class: 'iconButton',
      html: svgIconReference('iconMonstrUndo4'),
      listeners: { click: (e: MouseEvent)=>this.onUndoButtonClicked(e) },
      title: "Undo",
    });

    super({
      tag: 'div',
      appendTo: screen.$elt,
      class: 'sidebar',
      children: [
        { // #thumbnailViewButton
          tag: 'button',
          class: 'iconButton',
          html: svgIconReference('iconMonstrFile12'),
          listeners: { click: (_e: MouseEvent)=>{ window.location.href = `/#${screen.notebook.path}`; }},
          title: "Page thumbnail view",
        }, { // reading view
          tag: 'button',
          class: 'iconButton',
          html: svgIconReference('iconMonstrFile5'),
          listeners: { click: (_e: MouseEvent)=>{ window.location.href = `/#${screen.notebook.path}?view=read`; }},
          title: "Reading view",
        },{
          // edit view
          tag: 'button',
          class: 'iconButton',
          html: svgIconReference('iconMonstrNote23'),
          // listeners: { click: (_e: MouseEvent)=>{ window.location.href = `/#${screen.notebook.path}?view=edit`; }},
          title: "Editing view",
          disabled: true,
        }, {
          tag: 'div', class: 'separator'
        }, { // #inputKeyboardButton
          tag: 'button',
          class: 'iconButton',
          html: svgIconReference('iconMonstrKeyboard2'),
          listeners: { click: (e: MouseEvent)=>this.onKeyboardButtonClicked(e) },
          title: "Insert keyboard cell",
        }, { // #insertDrawingButton
          tag: 'button',
          class: 'iconButton',
          html: svgIconReference('iconMonstrPencil9'),
          listeners: { click: (e: MouseEvent)=>this.onInsertDrawingButtonClicked(e) },
          title: "Insert drawing cell",
        }, { // #insertHintButton
          tag: 'button',
          class: 'iconButton',
          html: svgIconReference('iconMonstrIdea10'),
          listeners: { click: (e: MouseEvent)=>this.onInsertHintButtonClicked(e) },
          title: "Insert hint cell",
        }, {
          tag: 'div', class: 'separator'
        },
        $undoButton,
        $redoButton
        , {
          tag: 'div', class: 'separator'
        }, { // #exportButton
          tag: 'button',
          class: 'iconButton',
          html: svgIconReference('iconMonstrLogout18'),
          listeners: { click: e=>this.onExportButtonClicked(e) },
          title: "Export notebook",
        },
        $debugButton,
        {
          tag: 'div', class: 'separator'
        }, { // #developmentButton
          tag: 'button',
          class: 'iconButton',
          html: svgIconReference('iconMonstrClothing18'),
          listeners: { click: (e: MouseEvent)=>this.onDevelopmentButtonClicked(e) },
          title: "For development use only",
        },
        $trashButton,
      ],
    });
    this.screen = screen;

    // Sidebar button events
    this.$debugButton = $debugButton;
    this.$redoButton = $redoButton;
    this.$trashButton = $trashButton;
    this.$undoButton = $undoButton;
  }

  // Public Instance Properties

  // Public Instance Methods

  public enableDebugButton(enable: boolean): void { this.$debugButton.disabled = !enable; }
  public enableRedoButton(enable: boolean): void { this.$redoButton.disabled = !enable; }
  public enableTrashButton(enable: boolean): void { this.$trashButton.disabled = !enable; }
  public enableUndoButton(enable: boolean): void { this.$undoButton.disabled = !enable; }

  // -- PRIVATE --

  // Private Instance Properties

  private $debugButton: HTMLButtonElement;
  private $redoButton: HTMLButtonElement;
  private $trashButton: HTMLButtonElement;
  private $undoButton: HTMLButtonElement;
  private screen: NotebookEditScreen;

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
    this.screen.debugPopup.showContents("<b>TODO: get HTML from notebook.</b>");
  }

  private onDevelopmentButtonClicked(_e: MouseEvent): void {
    this.asyncCommand("Development-Button", this.screen.view.developmentButtonClicked());
  }

  private onExportButtonClicked(_event: MouseEvent): void {
    this.screen.notebook.export();
  }

  private onInsertDrawingButtonClicked(_e: MouseEvent): void {
    this.asyncCommand("Insert-Drawing", this.screen.view.insertInkCellBelow());
  }

  private onInsertHintButtonClicked(_e: MouseEvent): void {
    this.asyncCommand("Insert-Hint", this.screen.view.insertHintCellBelow());
  }

  private onKeyboardButtonClicked(_e: MouseEvent): void {
    this.asyncCommand("Insert-Keyboard", this.screen.view.insertKeyboardCellBelow());
  }

  private onRedoButtonClicked(_e: MouseEvent): void {
    this.asyncCommand("Redo", this.screen.view.redo());
  }

  private onTrashButtonClicked(_e: MouseEvent): void {
    this.asyncCommand("Trash", this.screen.view.deleteSelectedCells());
  }

  private onUndoButtonClicked(_e: MouseEvent): void {
    this.asyncCommand("Undo", this.screen.view.undo());
  }

}