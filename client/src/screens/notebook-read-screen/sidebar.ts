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

import { CssClass } from "../../shared/common";
import { svgIconReferenceMarkup } from "../../dom";
import { ButtonBar } from "../../components/button-bar";
import { Mode, NotebookReadScreen } from "./index";

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

  public constructor(screen: NotebookReadScreen, mode: Mode) {
    super({
      tag: 'div',
      class: <CssClass>'sidebar',
      children: [
        {
          // search
          tag: 'button',
          class: <CssClass>'iconButton',
          html: svgIconReferenceMarkup('iconMonstrMagnifier6'),
          //listeners: { click: (_e: MouseEvent): void =>{ this.screen.toggleSearchPanel(); }},
          title: "Search",
          disabled: true,
        },{
          // reference
          tag: 'button',
          class: <CssClass>'iconButton',
          html: svgIconReferenceMarkup('iconMonstrBook17'),
          //listeners: { click: (_e: MouseEvent): void =>{ this.screen.toggleReferencePanel(); }},
          title: "Reference",
          disabled: true,
        },
        SEPARATOR,
        {
          // thumbnail view
          tag: 'button',
          class: <CssClass>'iconButton',
          html: svgIconReferenceMarkup('iconMonstrFile12'),
          listeners: { click: (_e: MouseEvent)=>{ window.location.href = `/#${screen.notebook.path}`; }},
          title: "Reading view",
          disabled: mode == Mode.Thumbnails,
        },{
          // reading view
          tag: 'button',
          class: <CssClass>'iconButton',
          html: svgIconReferenceMarkup('iconMonstrFile5'),
          listeners: { click: (_e: MouseEvent)=>{ window.location.href = `/#${screen.notebook.path}?view=read`; }},
          title: "Reading view",
          disabled: mode == Mode.Reading,
        },{
          // edit view
          tag: 'button',
          class: <CssClass>'iconButton',
          html: svgIconReferenceMarkup('iconMonstrNote23'),
          listeners: { click: (_e: MouseEvent)=>{ window.location.href = `/#${screen.notebook.path}?view=edit`; }},
          title: "Editing view",
        },
        SEPARATOR,
        {
          tag: 'button',
          class: <CssClass>'iconButton',
          html: svgIconReferenceMarkup('iconMonstrPrinter6'),
          listeners: { click: e=>this.onExportToPdf(e) },
          title: "Print notebook",
        },
      ]
    });

    this.screen = screen;
  }

  // Instance Properties

  // Instance Methods

  // -- PRIVATE --

  // Private Instance Properties

  private screen: NotebookReadScreen;

  // Private Instance Methods

  // Private Instance Event Handlers

  private onExportToPdf(_event: MouseEvent): void {
    // Note: this function is duplicated in edit-screen sidebar.
    const url = `/pdf${this.screen.notebook.path}`;
    window.open(url, "_blank")
  }


}