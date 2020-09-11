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

import { svgIconReference } from "../../dom";
import { ButtonBar } from "../../button-bar";
import { NotebookThumbnailsScreen } from "./index";

// Types

// Constants

// Global Variables

// Exported Class

export class Sidebar extends ButtonBar {

  // Class Methods

  // Constructor

  public constructor(screen: NotebookThumbnailsScreen) {
    super({
      tag: 'div',
      appendTo: screen.$elt,
      class: 'sidebar',
      children: [{
        // thumbnail view
        tag: 'button',
        class: 'iconButton',
        html: svgIconReference('iconMonstrFile12'),
        // listeners: { click: (_e: MouseEvent)=>{ window.location.href = `/#${screen.notebook.path}`; }},
        title: "Thumbnail view",
        disabled: true,
      },{
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
        listeners: { click: (_e: MouseEvent)=>{ window.location.href = `/#${screen.notebook.path}?view=edit`; }},
        title: "Editing view",
      }, {
        tag: 'div', class: 'separator'
      }]
     });
  }

  // Instance Properties


  // Instance Methods

  // -- PRIVATE --

  // Private Instance Properties

  // Private Instance Methods

  // Private Event Handlers


}