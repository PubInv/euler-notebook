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
import { svgIconReferenceMarkup, $new } from "../../dom";

import { NotebookEditScreen } from "./index";
import { CellType } from "../../shared/cell";

// Types

// Constants

// Global Variables

// Exported Class

export class Sidebar extends ButtonBar {

  // Public Class Methods

  // Public Constructor

  public constructor(screen: NotebookEditScreen) {

    const mode = screen.editView.insertMode;

    const $formulaModeButton = $new({
      tag: 'button',
      class: <CssClass>'iconButton',
      html: svgIconReferenceMarkup('iconMonstrCalculator2'),
      listeners: {
        click: (_e: MouseEvent): void =>{ this.onModeChange(CellType.Formula); }
      },
      title: "Insert formula",
      disabled: (mode === CellType.Formula),
    });

    const $textModeButton = $new({
      tag: 'button',
      class: <CssClass>'iconButton',
      html: svgIconReferenceMarkup('iconMonstrText1'),
      listeners: {
        click: (_e: MouseEvent): void =>{ this.onModeChange(CellType.Text); }
      },
      title: "Insert text",
      disabled: (mode === CellType.Text),
    });

    const $figureModeButton = $new({
      tag: 'button',
      class: <CssClass>'iconButton',
      html: svgIconReferenceMarkup('iconMonstrPencil9'),
      listeners: {
        click: (_e: MouseEvent): void =>{ this.onModeChange(CellType.Figure); }
      },
      title: "Insert figure cell",
      disabled: (mode === CellType.Figure),
    });

    const $debugButton = $new({
      tag: 'button',
      class: <CssClass>'iconButton',
      html: svgIconReferenceMarkup('iconMonstrBug12'),
      listeners: { click: (_e)=>{
        this.$bugButton.disabled = true;
        this.screen.debugPopup.show();
      }},
      title: "Debug popup",
    });

    const $redoButton = $new({
      tag: 'button',
      class: <CssClass>'iconButton',
      html: svgIconReferenceMarkup('iconMonstrRedo4'),
      asyncListeners: { click: async (_e: MouseEvent)=>{ await this.screen.notebook.redo(); }},
      title: "Redo",
      disabled: true,
    });

    const $trashButton = $new({
      tag: 'button',
      class: <CssClass>'iconButton',
      html: svgIconReferenceMarkup('iconMonstrTrashcan2'),
      asyncListeners: { click: async (_e: MouseEvent)=>{
        await this.screen.editView.deleteSelectedCells();
      }},
      title: "Trash",
    });

    const $undoButton = $new({
      tag: 'button',
      class: <CssClass>'iconButton',
      html: svgIconReferenceMarkup('iconMonstrUndo4'),
      asyncListeners: { click: async (_e: MouseEvent)=>{ await this.screen.notebook.undo(); }},
      title: "Undo",
      disabled: true,
    });

    super({
      tag: 'div',
      class: <CssClass>'sidebar',
      children: [
        {
          // search
          tag: 'button',
          class: <CssClass>'iconButton',
          html: svgIconReferenceMarkup('iconMagnifier6'),
          listeners: { click: (_e: MouseEvent): void =>{ this.screen.toggleSearchPanel(); }},
          title: "Search",
        }, {
          tag: 'div', class: <CssClass>'separator'
        }, {
          // thumbnail view
          tag: 'button',
          class: <CssClass>'iconButton',
          html: svgIconReferenceMarkup('iconMonstrFile12'),
          listeners: { click: (_e: MouseEvent): void =>{ window.location.href = `/#${screen.notebook.path}`; }},
          title: "Thumbnail view",
        }, {
          // reading view
          tag: 'button',
          class: <CssClass>'iconButton',
          html: svgIconReferenceMarkup('iconMonstrFile5'),
          listeners: { click: (_e: MouseEvent): void =>{ window.location.href = `/#${screen.notebook.path}?view=read`; }},
          title: "Reading view",
        },{
          // edit view
          tag: 'button',
          class: <CssClass>'iconButton',
          html: svgIconReferenceMarkup('iconMonstrNote23'),
          // listeners: { click: (_e: MouseEvent)=>{ window.location.href = `/#${screen.notebook.path}?view=edit`; }},
          title: "Editing view",
          disabled: true,
        }, {
          tag: 'div', class: <CssClass>'separator'
        },
        $formulaModeButton,
        $textModeButton,
        $figureModeButton,
        {
          tag: 'div', class: <CssClass>'separator'
        },
        $undoButton,
        $redoButton,
        {
          tag: 'div', class: <CssClass>'separator'
        }, {
          // export
          tag: 'button',
          class: <CssClass>'iconButton',
          html: svgIconReferenceMarkup('iconMonstrLogout18'),
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
          html: svgIconReferenceMarkup('iconMonstrClothing18'),
          asyncListeners: { click: async (_e: MouseEvent)=>{
            await this.screen.editView.developmentButtonClicked();
          }},
          title: "Development use only",
        },
        $trashButton,
      ],
    });

    this.screen = screen;

    this.$bugButton = $debugButton;
    this.$redoButton = $redoButton;
    this.$trashButton = $trashButton;
    this.$undoButton = $undoButton;
    this.$formulaModeButton = $formulaModeButton;
    this.$figureModeButton = $figureModeButton;
    this.$textModeButton = $textModeButton;
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
  public $figureModeButton: HTMLButtonElement;
  public $formulaModeButton: HTMLButtonElement;
  public $textModeButton: HTMLButtonElement;

  // Private Instance Methods

  // Private Event Handlers

  private onModeChange(mode: CellType): void {
    this.screen.editView.insertMode = mode;
    this.$figureModeButton.disabled = (mode === CellType.Figure);
    this.$formulaModeButton.disabled = (mode === CellType.Formula);
    this.$textModeButton.disabled = (mode === CellType.Text);
  }

  public onRedoStateChange(enabled: boolean): void {
    this.$redoButton.disabled = !enabled;
  }

  onUndoStateChange(enabled: boolean): void {
    this.$undoButton.disabled = !enabled;
  }

}