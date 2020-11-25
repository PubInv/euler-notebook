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

import * as debug1 from "debug";
const debug = debug1('client:text-edit-view');

import { InputType, TextCellObject } from "../shared/cell";
import { CssClass, assertFalse, PlainText, notImplemented, Html } from "../shared/common";
import { Stroke } from "../shared/myscript-types";
import { NotebookUpdate } from "../shared/server-responses";
import { notebookUpdateSynopsis, cellSynopsis } from "../shared/debug-synopsis";
import { TextCellKeyboardObject, TextCellStylusObject } from "../shared/cell";
import { InsertStroke } from "../shared/client-requests";

import { $new } from "../dom";
import { logError } from "../error-handler";

import { KeyboardCallbackFn, KeyboardPanel } from "../components/keyboard-panel";
import { StrokeCallbackFn, StrokePanel } from "../components/stroke-panel";

import { TextCell } from "../client-cell/text-cell";
import { CellEditView } from "./cell-edit-view";

// Types

// Constants

// Exported Class

export class TextEditView extends CellEditView<TextCellObject> {

  // Public Class Methods

  // Public Constructor

  public constructor(cell: TextCell) {
    debug(`Constructing: ${cellSynopsis(cell.obj)}`);

    const $content = $new({
      tag: 'div',
      classes: [ <CssClass>'content', <CssClass>'textCell' ],
    });

    super(cell, $content);

    const $inputPanel = this.createInputPanel(cell.obj);
    if ($inputPanel) {
      this.$content.append($inputPanel);
    }
  }

  // ClientNotebookWatcher Methods

  public onUpdate(update: NotebookUpdate, ownRequest: boolean): void {
    debug(`onUpdate C${this.id} ${notebookUpdateSynopsis(update)}`);
    super.onUpdate(update, ownRequest);
    switch (update.type) {
      // case 'styleChanged': {
      //   if (change.style.id == this.cellId) {
      //     this.updateDisplayPanel(change.style);
      //     this.updateInputPanelData(change.style);
      //     this.updateInputPanelDrawing(change.style);
      //   } else {
      //     // Ignore. Not something that affects our display.
      //   }
      //   break;
      // }
    }
  }

  // -- PRIVATE --

  // Private Instance Properties

  // @ts-expect-error // TODO: value is never read error
  private keyboardPanel?: KeyboardPanel;
  // @ts-expect-error // TODO: value is never read error
  private strokePanel?: StrokePanel;

  // Private Instance Methods

  private createInputPanel(cellObject: TextCellObject): HTMLDivElement|undefined {
    let panel: KeyboardPanel|StrokePanel|undefined;
    switch(cellObject.inputType) {
      case InputType.Keyboard:
        panel = this.keyboardPanel = this.createKeyboardSubpanel(cellObject);
        break;
      case InputType.Stylus:
        panel = this.createStrokeSubpanel(cellObject);
        break;
      case InputType.None:
        // Do nothing.
        break;
      default: assertFalse();
    }
    return panel && panel.$elt;
  }

  private createKeyboardSubpanel(cellObject: TextCellKeyboardObject): KeyboardPanel {
    const textChangeCallback: KeyboardCallbackFn = (_start: number, _end: number, _replacement: PlainText, _value: PlainText): void =>{
      notImplemented();
      // const changeRequest: KeyboardInputRequest = { type: 'keyboardInputChange', cellId: style.id, start, end, replacement, value, };
      // this.container.screen.notebook.sendCellChangeRequest(changeRequest)
      // .catch(err=>{
      //   logError(err, <Html>"Error sending keyboardInputChange from text cell");
      // });
    }
    return new KeyboardPanel(cellObject.inputText, textChangeCallback);
  }

  private createStrokeSubpanel(cellObject: TextCellStylusObject): StrokePanel {
    const callbackFn: StrokeCallbackFn = async (stroke: Stroke)=>{
      const changeRequest: InsertStroke = { type: 'insertStroke', cellId: cellObject.id, stroke };
      await this.cell.sendChangeRequest(changeRequest)
      .catch(err=>{
        // REVIEW: Proper way to handle this error?
        logError(err, <Html>"Error sending stroke from text cell");
      });
    };
    const strokePanel = new StrokePanel(cellObject.cssSize, cellObject.strokeData, callbackFn);
    return strokePanel;
  }

  // Private Instance Event Handlers

}
