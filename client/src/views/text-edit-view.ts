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
const debug = debug1('client:text-cell');

import { InputType, TextCellObject } from "../shared/cell";
import { CssClass, assertFalse, PlainText, notImplemented, Html } from "../shared/common";
import { Stroke } from "../shared/stylus";
import { NotebookUpdate } from "../shared/server-responses";
import { notebookChangeSynopsis, cellSynopsis } from "../shared/debug-synopsis";
import { TextCellKeyboardObject, TextCellStylusObject } from "../shared/cell";
import { AddStroke } from "../shared/client-requests";

import { $new, $outerSvg } from "../dom";
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

    this.$displayPanel = this.createDisplayPanel(cell.obj);
    this.$content.prepend(this.$displayPanel);

    this.$inputPanel = this.createInputPanel(cell.obj);
    if (this.$inputPanel) {
      this.$content.append(this.$inputPanel);
    }
  }

  // ClientNotebookWatcher Methods

  public onUpdate(update: NotebookUpdate, _ownRequest: boolean): void {
    debug(`onChange: style ${this.id} ${notebookChangeSynopsis(update)}`);

    switch (update.type) {
      case 'cellInserted': {
        // Ignore. Not something we are interested in.
        break;
      }
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
      case 'cellDeleted': {
        // Ignore. Not something we are interested in.
        break;
      }
      case 'cellMoved': assertFalse();
      default: assertFalse();
    }
  }

  // -- PRIVATE --

  // Private Instance Properties

  private $displayPanel?: SVGSVGElement;
  private $inputPanel?: HTMLDivElement;
  // @ts-expect-error // TODO: value is never read error
  private keyboardPanel?: KeyboardPanel;
  // @ts-expect-error // TODO: value is never read error
  private strokePanel?: StrokePanel;

  // Private Instance Methods

  private createDisplayPanel(cellObject: TextCellObject): SVGSVGElement {
    const $displayPanel = $outerSvg<'svg'>(cellObject.displaySvg);
    $displayPanel.classList.add('display');
    return $displayPanel;
  }

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
      const changeRequest: AddStroke = { type: 'addStroke', cellId: cellObject.id, stroke };
      await this.cell.sendChangeRequest(changeRequest)
      .catch(err=>{
        // REVIEW: Proper way to handle this error?
        logError(err, <Html>"Error sending stroke from text cell");
      });
    };
    const strokePanel = new StrokePanel(cellObject.cssSize, cellObject.displaySvg, callbackFn);
    return strokePanel;
  }

  // private updateDisplayPanel(style: CellObject): void {
  //   const $displayPanel = this.createDisplayPanel(style);
  //   this.$displayPanel!.replaceWith($displayPanel);
  //   this.$displayPanel = $displayPanel;
  // }

  // private updateInputPanelData(inputStyle: CellObject): void {
  //   switch(inputStyle.type) {
  //     case 'STROKE-DATA':
  //       assert(this.strokePanel);
  //       this.strokePanel!.updateStylusInput(inputStyle.data);
  //       break;
  //     case 'PLAIN-TEXT':
  //       assert(this.keyboardPanel);
  //       this.keyboardPanel!.updateText(inputStyle.data);
  //       break;
  //     default: assertFalse();
  //   }
  // }

  // private updateInputPanelDrawing(svgRepStyle: CellObject): void {
  //   assert(this.strokePanel);
  //   this.strokePanel!.updateSvgMarkup(svgRepStyle.data);
  // }

  // Private Instance Event Handlers

  protected onResize(deltaY: number, final: boolean): void {
    debug(`onResize: ${deltaY} ${final}`);
  }

}

// HELPER FUNCTIONS

