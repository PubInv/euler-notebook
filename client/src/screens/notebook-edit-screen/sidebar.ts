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

import { CssClass } from "../../shared/common";
import { ButtonBar } from "../../components/button-bar";
import { svgIconReference, $new, SIGMA_ENTITY } from "../../dom";

import { NotebookEditScreen } from "./index";

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
      class: <CssClass>'iconButton',
      html: svgIconReference('iconMonstrBug12'),
      listeners: { click: (_e)=>{
        this.$bugButton.disabled = true;
        this.screen.debugPopup.show();
      }},
      title: "Debug popup",
    });

    const $redoButton = $new({ // TODO: Start out disabled?
      tag: 'button',
      class: <CssClass>'iconButton',
      html: svgIconReference('iconMonstrRedo4'),
      asyncListeners: { click: async (_e: MouseEvent)=>{
        await this.screen.content.redo();
      }},
      title: "Redo",
    });

    const $trashButton = $new({
      tag: 'button',
      class: <CssClass>'iconButton',
      html: svgIconReference('iconMonstrTrashcan2'),
      asyncListeners: { click: async (_e: MouseEvent)=>{
        await this.screen.content.deleteSelectedCells();
      }},
      title: "Trash",
    });

    const $undoButton = $new({
      tag: 'button',
      class: <CssClass>'iconButton',
      html: svgIconReference('iconMonstrUndo4'),
      asyncListeners: { click: async (_e: MouseEvent)=>{
        await this.screen.content.undo();
      }},
      title: "Undo",
    });

    super({
      tag: 'div',
      appendTo: screen.$elt,
      class: <CssClass>'sidebar',
      children: [
        {
          // search
          tag: 'button',
          class: <CssClass>'iconButton',
          html: svgIconReference('iconMagnifier6'),
          listeners: { click: (_e: MouseEvent): void =>{ this.screen.toggleSearchPanel(); }},
          title: "Search",
        }, {
          tag: 'div', class: <CssClass>'separator'
        }, {
          // thumbnail view
          tag: 'button',
          class: <CssClass>'iconButton',
          html: svgIconReference('iconMonstrFile12'),
          listeners: { click: (_e: MouseEvent): void =>{ window.location.href = `/#${screen.notebook.path}`; }},
          title: "Thumbnail view",
        }, {
          // reading view
          tag: 'button',
          class: <CssClass>'iconButton',
          html: svgIconReference('iconMonstrFile5'),
          listeners: { click: (_e: MouseEvent): void =>{ window.location.href = `/#${screen.notebook.path}?view=read`; }},
          title: "Reading view",
        },{
          // edit view
          tag: 'button',
          class: <CssClass>'iconButton',
          html: svgIconReference('iconMonstrNote23'),
          // listeners: { click: (_e: MouseEvent)=>{ window.location.href = `/#${screen.notebook.path}?view=edit`; }},
          title: "Editing view",
          disabled: true,
        }, {
          tag: 'div', class: <CssClass>'separator'
        }, {
          // insert formula (sigma)
          tag: 'button',
          class: <CssClass>'entityButton',
          html: SIGMA_ENTITY,
          asyncListeners: { click: async (_e: MouseEvent): Promise<void> =>{
            await this.screen.content.insertFormulaCellBelow();
          }},
          title: "Insert formula",
        }, {
          // insert text cell
          tag: 'button',
          class: <CssClass>'iconButton',
          html: svgIconReference('iconMonstrText1'),
          asyncListeners: { click: async (_e: MouseEvent): Promise<void> =>{
            await this.screen.content.insertTextCellBelow();
          }},
          title: "Insert text",
        }, {
          // insert drawing cell
          tag: 'button',
          class: <CssClass>'iconButton',
          html: svgIconReference('iconMonstrPencil9'),
          asyncListeners: { click: async (_e: MouseEvent): Promise<void> =>{
            await this.screen.content.insertFigureCellBelow();
          }},
          title: "Insert drawing cell",
        }, {
          tag: 'div', class: <CssClass>'separator'
        },
        $undoButton,
        $redoButton
        , {
          tag: 'div', class: <CssClass>'separator'
        }, {
          // export
          tag: 'button',
          class: <CssClass>'iconButton',
          html: svgIconReference('iconMonstrLogout18'),
          listeners: { click: _e=>{
            this.screen.notebook.export();
          }},
          title: "Export notebook",
        },
        $debugButton,
        {
          tag: 'div', class: <CssClass>'separator'
        }, {
          // "underwear" for dev use only
          tag: 'button',
          class: <CssClass>'iconButton',
          html: svgIconReference('iconMonstrClothing18'),
          asyncListeners: { click: async (_e: MouseEvent)=>{
            await this.screen.content.developmentButtonClicked();
          }},
          title: "Development use only",
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

  // Private Event Handlers

}