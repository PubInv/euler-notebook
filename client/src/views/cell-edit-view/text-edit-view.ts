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

import * as debug1 from "debug";
const debug = debug1('client:text-edit-view');

import { CellType, TextCellObject } from "../../shared/cell";
import { CssClass } from "../../shared/common";
import { NotebookUpdate } from "../../shared/server-responses";
import { notebookUpdateSynopsis, cellSynopsis } from "../../shared/debug-synopsis";

import { TextCell } from "../../models/client-cell/text-cell";

import { NotebookEditView } from "../notebook-edit-view";

import { CellEditView } from "./index";
import { CELL_ICONS, HtmlElementSpecification, svgIconReferenceMarkup } from "../../dom";

// Types

// Constants

// Exported Class

export class TextEditView extends CellEditView<TextCellObject> {

  // Public Class Methods

  // Public Constructor

  public constructor(notebookEditView: NotebookEditView, cell: TextCell) {
    debug(`Constructing: ${cellSynopsis(cell.obj)}`);

    // Create a button for the right margin that initiates recognizing the formula handwriting.
    const rightMarginButton: HtmlElementSpecification<'button'> = {
      tag: 'button',
      attrs: { tabindex: -1 },
      class: <CssClass>'iconButton',
      html: svgIconReferenceMarkup(CELL_ICONS.get(CellType.Text)!),
      syncButtonHandler: (e: MouseEvent)=>this.onRecognizeButtonClicked(e),
    };

    super(notebookEditView, cell, <CssClass>'textCell', rightMarginButton);
  }

  // ClientNotebookWatcher Methods

  public onUpdate(update: NotebookUpdate, ownRequest: boolean): void {
    debug(`onUpdate C${this.id} ${notebookUpdateSynopsis(update)}`);
    super.onUpdate(update, ownRequest);
    // switch (update.type) {
    //   default: /* Nothing to do */ break;
    // }
  }

  // -- PRIVATE --

  // Private Instance Properties

  // Private Instance Property Functions

  // private get textCell(): TextCell {
  //   return <TextCell>this.cell;
  // }

  // Private Instance Methods

  // Private Instance Event Handlers

  private onRecognizeButtonClicked(event: MouseEvent): void {
    // LATER: Cancel if user leaves screen when recognition request outstanding
    event.stopPropagation(); // Prevent our own 'onClicked' handler from being called.
    debug(`onRecognizeButtonClicked`);
    this.cell.notebook.recognizeTextRequest(this.id);
    // this.suggestionPanel.setTextRecognitionResults(response.results);
    // this.suggestionPanel.showIfHidden();
  }

}
