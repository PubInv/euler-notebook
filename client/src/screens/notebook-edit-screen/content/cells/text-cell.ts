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

import { TextCellObject } from "../../../../shared/cell";
import { CssClass, assertFalse, PlainText, notImplemented } from "../../../../shared/common";
import { StrokeData } from "../../../../shared/stylus";
import { NotebookChange, } from "../../../../shared/notebook";
// import { StyleChangeRequest } from "../../../../shared/math-tablet-api";

import { $new, $outerSvg } from "../../../../dom";
import { KeyboardCallbackFn, KeyboardPanel } from "../../../../components/keyboard-panel";
import { StrokePanel } from "../../../../components/stroke-panel";

import { Content as CellContainer } from "../index";

import { CellBase } from "./cell-base";
import { notebookChangeSynopsis, cellSynopsis } from "../../../../shared/debug-synopsis";
import { TextCellKeyboardObject, TextCellStylusObject } from "../../../../shared/cell";

// Types

// Constants

// Class

export class TextCell extends CellBase {

  // Public Class Methods

  // Public Constructor

  public constructor(container: CellContainer, style: TextCellObject) {
    debug(`Constructing: ${cellSynopsis(style)}`);

    const $content = $new({
      tag: 'div',
      classes: [ <CssClass>'content', <CssClass>'textCell' ],
    });

    super(container, style, $content);

    this.$displayPanel = this.createDisplayPanel(style);
    this.$content.prepend(this.$displayPanel);

    this.$inputPanel = this.createInputPanel(style);
    this.$content.append(this.$inputPanel);
  }

  // ClientNotebookWatcher Methods

  public onChange(change: NotebookChange): void {
    debug(`onChange: style ${this.cellId} ${notebookChangeSynopsis(change)}`);

    switch (change.type) {
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

  public onChangesFinished(): void { /* Nothing to do. */ }

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

  private createInputPanel(_cellObject: TextCellObject): HTMLDivElement {
    notImplemented();
    // let panel: KeyboardPanel|StrokePanel;
    // if (styleIsKeyboard) {
    //   panel = this.keyboardPanel = this.createKeyboardSubpanel(style);
    // } else {
    //   panel = this.strokePanel = this.createStrokeSubpanel(style);
    // }
    // return panel.$elt;
  }

  // @ts-expect-error // TODO:
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

  // @ts-expect-error // TODO:
  private createStrokeSubpanel(cellObject: TextCellStylusObject): StrokePanel {
    const strokePanel = new StrokePanel(cellObject.stylusInput, cellObject.displaySvg, async (_strokeData: StrokeData)=>{
      throw new Error("TODO: Just send stroke to server");
      // const changeRequest: StyleChangeRequest = { type: 'changeStyle', cellId: style.id, data: strokeData };
      // // TODO: We don't want to wait for *all* processing of the strokes to finish, just the svg update.
      // // TODO: Incremental changes.
      // await this.container.screen.notebook.sendChangeRequest(changeRequest);
    });
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

