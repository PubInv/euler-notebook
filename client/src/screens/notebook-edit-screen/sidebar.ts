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

import { ButtonBar } from "../../button-bar";
import { svgIconReference, $new } from "../../dom";
import { NotebookEditScreen } from ".";

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
      listeners: { click: e=>this.onBugButtonClicked(e) },
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
        {
          // thumbnail view
          tag: 'button',
          class: 'iconButton',
          html: svgIconReference('iconMonstrFile12'),
          listeners: { click: (_e: MouseEvent)=>{ window.location.href = `/#${screen.notebook.path}`; }},
          title: "Page thumbnail view",
        }, {
          // reading view
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
        }, {
          // insert keyboard cell
          tag: 'button',
          class: 'iconButton',
          html: svgIconReference('iconMonstrKeyboard2'),
          listeners: { click: (e: MouseEvent)=>this.onKeyboardButtonClicked(e) },
          title: "Insert keyboard cell",
        }, {
          // insert ink cell
          tag: 'button',
          class: 'iconButton',
          html: svgIconReference('iconMonstrPencil9'),
          listeners: { click: (e: MouseEvent)=>this.onStylusButtonClicked(e) },
          title: "Insert drawing cell",
        }, {
          // insert hint
          tag: 'button',
          class: 'iconButton',
          html: svgIconReference('iconMonstrIdea10'),
          listeners: { click: (e: MouseEvent)=>this.onHintButtonClicked(e) },
          title: "Insert hint cell",
        }, {
          tag: 'div', class: 'separator'
        },
        $undoButton,
        $redoButton
        , {
          tag: 'div', class: 'separator'
        }, {
          // export
          tag: 'button',
          class: 'iconButton',
          html: svgIconReference('iconMonstrLogout18'),
          listeners: { click: e=>this.onExportButtonClicked(e) },
          title: "Export notebook",
        },
        $debugButton,
        {
          tag: 'div', class: 'separator'
        }, {
          // "underwear" for dev use only
          tag: 'button',
          class: 'iconButton',
          html: svgIconReference('iconMonstrClothing18'),
          listeners: { click: (e: MouseEvent)=>this.onUnderwearButtonClicked(e) },
          title: "For development use only",
        },
        $trashButton,
      ],
    });
    this.screen = screen;

    // Sidebar button events
    this.$bugButton = $debugButton;
    this.$redoButton = $redoButton;
    this.$trashButton = $trashButton;
    this.$undoButton = $undoButton;
  }

  // Public Instance Properties

  public $bugButton: HTMLButtonElement;
  public $redoButton: HTMLButtonElement;
  public $trashButton: HTMLButtonElement;
  public $undoButton: HTMLButtonElement;

  // Public Instance Methods


  // -- PRIVATE --

  // Private Instance Properties

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

  private onBugButtonClicked(_event: MouseEvent): void {
    this.$bugButton.disabled = true;
    this.screen.debugPopup.show();
  }

  private onUnderwearButtonClicked(_e: MouseEvent): void {
    this.asyncCommand("Development-Button", this.screen.view.developmentButtonClicked());
  }

  private onExportButtonClicked(_event: MouseEvent): void {
    this.screen.notebook.export();
  }

  private onStylusButtonClicked(_e: MouseEvent): void {
    this.asyncCommand("Insert-Drawing", this.screen.view.insertInkCellBelow());
  }

  private onHintButtonClicked(_e: MouseEvent): void {
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