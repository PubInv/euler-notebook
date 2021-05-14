/*
Euler Notebook
Copyright (C) 2019-21 Public Invention
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

import { CssClass } from "../../shared/css";
import { ButtonBar } from "../../components/button-bar";
import { CellType } from "../../shared/cell";

import { svgIconReferenceMarkup, $new, CELL_ICONS } from "../../dom";
import { StylusMode } from "../../components/stroke-panel";

import { NotebookEditScreen } from "./index";

// Types

// Constants

const SEPARATOR = {
  tag: 'div', class: <CssClass>'separator'
};

// Global Variables

// Exported Class

export class Sidebar extends ButtonBar {

  // Public Class Methods

  // Public Constructor

  public constructor(screen: NotebookEditScreen) {

    const insertMode = screen.editView.insertMode;
    const stylusMode = screen.editView.stylusMode;

    const $formulaModeButton = $new({
      tag: 'button',
      class: <CssClass>'iconButton',
      html: svgIconReferenceMarkup(CELL_ICONS.get(CellType.Formula)!),
      syncButtonHandler: (_e: MouseEvent): void =>{ this.onInsertModeChange(CellType.Formula); },
      title: "Insert formula",
      disabled: (insertMode === CellType.Formula),
    });

    const $textModeButton = $new({
      tag: 'button',
      class: <CssClass>'iconButton',
      html: svgIconReferenceMarkup(CELL_ICONS.get(CellType.Text)!),
      syncButtonHandler: (_e: MouseEvent): void =>{ this.onInsertModeChange(CellType.Text); },
      title: "Insert text",
      disabled: (insertMode === CellType.Text),
    });

    const $figureModeButton = $new({
      tag: 'button',
      class: <CssClass>'iconButton',
      html: svgIconReferenceMarkup(CELL_ICONS.get(CellType.Figure)!),
      syncButtonHandler: (_e: MouseEvent): void =>{ this.onInsertModeChange(CellType.Figure); },
      title: "Insert figure cell",
      disabled: (insertMode === CellType.Figure),
    });

    const $drawModeButton = $new({
      tag: 'button',
      class: <CssClass>'iconButton',
      html: svgIconReferenceMarkup('iconMonstrPencil9'),
      syncButtonHandler: (_e: MouseEvent):void=>{ this.onStylusModeChange(StylusMode.Draw); },
      title: "Drawing mode",
      disabled: (stylusMode === StylusMode.Draw),
    });

    const $eraseModeButton = $new({
      tag: 'button',
      class: <CssClass>'iconButton',
      html: svgIconReferenceMarkup('iconMonstrEraser2'),
      syncButtonHandler: (_e: MouseEvent):void=>{ this.onStylusModeChange(StylusMode.Erase); },
      title: "Erasing mode",
      disabled: (stylusMode === StylusMode.Erase),
    });

    const $debugButton = $new({
      tag: 'button',
      class: <CssClass>'iconButton',
      html: svgIconReferenceMarkup('iconMonstrBug12'),
      syncButtonHandler: (_e)=>{
        this.$bugButton.disabled = true;
        this.screen.debugPopup.show();
      },
      title: "Debug popup",
    });

    const $redoButton = $new({
      tag: 'button',
      class: <CssClass>'iconButton',
      html: svgIconReferenceMarkup('iconMonstrRedo4'),
      asyncButtonHandler: async (_e: MouseEvent)=>{ await this.screen.notebook.redoRequest(); },
      title: "Redo",
      disabled: true,
    });

    const $undoButton = $new({
      tag: 'button',
      class: <CssClass>'iconButton',
      html: svgIconReferenceMarkup('iconMonstrUndo4'),
      asyncButtonHandler: async (_e: MouseEvent)=>{ await this.screen.notebook.undoRequest(); },
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
          html: svgIconReferenceMarkup('iconMonstrMagnifier6'),
          syncButtonHandler: (_e: MouseEvent): void =>{ this.screen.toggleSearchPanel(); },
          title: "Search",
        }, {
          // reference
          tag: 'button',
          class: <CssClass>'iconButton',
          html: svgIconReferenceMarkup('iconMonstrBook17'),
          syncButtonHandler: (_e: MouseEvent): void =>{ this.screen.toggleReferencePanel(); },
          title: "Reference",
        }, {
          // photo
          tag: 'button',
          class: <CssClass>'iconButton',
          html: svgIconReferenceMarkup('iconMonstrPhotoCamera5'),
          syncButtonHandler: (_e: MouseEvent)=>{ this.screen.togglePhotoPanel(); },
          title: "Image capture",
        },
        SEPARATOR,
        {
          // thumbnail view
          tag: 'button',
          class: <CssClass>'iconButton',
          html: svgIconReferenceMarkup('iconMonstrFile12'),
          syncButtonHandler: (_e: MouseEvent): void =>{ window.location.href = `/#${screen.notebook.path}`; },
          title: "Thumbnail view",
        }, {
          // reading view
          tag: 'button',
          class: <CssClass>'iconButton',
          html: svgIconReferenceMarkup('iconMonstrFile5'),
          syncButtonHandler: (_e: MouseEvent): void =>{ window.location.href = `/#${screen.notebook.path}?view=read`; },
          title: "Reading view",
        }, {
          // edit view
          tag: 'button',
          class: <CssClass>'iconButton',
          html: svgIconReferenceMarkup('iconMonstrEdit9Modified'),
          // syncButtonHandler: (_e: MouseEvent)=>{ window.location.href = `/#${screen.notebook.path}?view=edit`; },
          title: "Editing view",
          disabled: true,
        },
        SEPARATOR,
        $drawModeButton,
        $eraseModeButton,
        SEPARATOR,
        $formulaModeButton,
        $textModeButton,
        $figureModeButton,
        SEPARATOR,
        $undoButton,
        $redoButton,
        SEPARATOR,
        {
          tag: 'button',
          class: <CssClass>'iconButton',
          html: svgIconReferenceMarkup('iconMonstrPrinter6'),
          syncButtonHandler: e=>this.onExportToPdf(e),
          title: "Print notebook",
        },
        $debugButton,
        SEPARATOR,
        {
          // "underwear" for dev use only
          tag: 'button',
          class: <CssClass>'iconButton',
          html: svgIconReferenceMarkup('iconMonstrClothing18'),
          syncButtonHandler: async (_e: MouseEvent)=>this.screen.debugPopup.toggleVisibility(),
          title: "Development use only",
        },
      ],
    });

    this.screen = screen;

    this.$bugButton = $debugButton;
    this.$redoButton = $redoButton;
    this.$undoButton = $undoButton;
    this.$formulaModeButton = $formulaModeButton;
    this.$figureModeButton = $figureModeButton;
    this.$textModeButton = $textModeButton;
    this.$drawModeButton = $drawModeButton;
    this.$eraseModeButton = $eraseModeButton;
  }

  // Public Instance Properties

  public $bugButton: HTMLButtonElement;
  public $redoButton: HTMLButtonElement;
  public $undoButton: HTMLButtonElement;

  // Public Instance Methods


  // -- PRIVATE --

  // Private Instance Properties

  private screen: NotebookEditScreen;
  private $drawModeButton: HTMLButtonElement;
  private $eraseModeButton: HTMLButtonElement;
  public $figureModeButton: HTMLButtonElement;
  public $formulaModeButton: HTMLButtonElement;
  public $textModeButton: HTMLButtonElement;

  // Private Instance Methods

  // Private Instance Event Handlers

  private onExportToPdf(_event: MouseEvent): void {
    // Note: this function is duplicated in read-screen sidebar.
    const url = `/pdf${this.screen.notebook.path}`;
    window.open(url, "_blank")
  }

  private onInsertModeChange(mode: CellType): void {
    this.screen.editView.insertMode = mode;
    this.$figureModeButton.disabled = (mode === CellType.Figure);
    this.$formulaModeButton.disabled = (mode === CellType.Formula);
    this.$textModeButton.disabled = (mode === CellType.Text);
  }

  public onRedoStateChange(enabled: boolean): void {
    this.$redoButton.disabled = !enabled;
  }

  private onStylusModeChange(mode: StylusMode): void {
    this.screen.editView.stylusMode = mode;
    this.$drawModeButton.disabled = (mode === StylusMode.Draw);
    this.$eraseModeButton.disabled = (mode === StylusMode.Erase);
  }

  onUndoStateChange(enabled: boolean): void {
    this.$undoButton.disabled = !enabled;
  }

}