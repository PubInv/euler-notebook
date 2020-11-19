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

// TODO: Render prefix, handle and status into display SVG.

// Requirements

import * as debug1 from "debug";
const debug = debug1('client:formula-cell');

import { CssClass, Html, assertFalse, PlainText, notImplemented } from "../shared/common";
import { Stroke } from "../shared/stylus";
import { FormulaCellKeyboardObject, FormulaCellObject, FormulaCellStylusObject } from "../shared/formula";
import { NotebookUpdate } from "../shared/server-responses";
import { notebookChangeSynopsis } from "../shared/debug-synopsis";
import { InputType } from "../shared/cell";
import { AddStroke } from "../shared/client-requests";

import { $new, $outerSvg } from "../dom";
import { Content as CellContainer } from "../screens/notebook-edit-screen/content";

import { CellBase } from "./cell-base";
import { KeyboardCallbackFn, KeyboardPanel } from "../components/keyboard-panel";
import { StrokeCallbackFn, StrokePanel } from "../components/stroke-panel";
import { logError } from "../error-handler";

// Types

// Constants

// Class

export class FormulaCell extends CellBase {

  // Public Class Methods

  // Public Constructor

  public constructor(container: CellContainer, cellObject: FormulaCellObject) {
    debug(`Creating instance: style ${cellObject.id}`);

    const $content = $new({
      tag: 'div',
      classes: [ <CssClass>'content', <CssClass>'formulaCell' ],
    });

    super(container, cellObject, $content);

    this.$displayPanel = this.createDisplayPanel(cellObject);
    this.$content.prepend(this.$displayPanel);

    this.$inputPanel = this.createInputPanel(cellObject);
    if (this.$inputPanel) {
      this.$content.append(this.$inputPanel);
    }
  }

  // Public Instance Methods

  // ClientNotebookWatcher Methods

  // public onCellChange(msg: ServerNotebookCellChangedMessage, ownRequest: boolean): void {

  //   // If input text has changed then update the keyboard panel.
  //   if (!ownRequest) {
  //     if (msg.inputText) {
  //       assert(this.keyboardPanel);
  //       // LATER: msg.inputTextStart/End/Replacement.
  //       this.keyboardPanel!.updateText(msg.inputText);
  //     }
  //   }

  // }

  public onChange(change: NotebookUpdate): boolean {
    debug(`onChange: cell ${this.cellId} ${notebookChangeSynopsis(change)}`);

    // TODO: Changes that affect the prefix panel.

    // TODO: Do we deal with showing the Wolfram Evaluation values in the formula,
    //       and therefore deal with updating them here, or should we move their display to the tools panel?
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
      //     // Ignore. Not something we are interested in.
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
    return false;
  }

  // -- PRIVATE --

  // Private Instance Properties

  private $displayPanel?: SVGSVGElement;
  private $inputPanel: HTMLDivElement|undefined;
  // @ts-expect-error // TODO: value is never read error
  private keyboardPanel?: KeyboardPanel;
  // @ts-expect-error // TODO: value is never read error
  private strokePanel?: StrokePanel;

  // Private Instance Methods

  //   // Render Wolfram evaluation if it exists.
  //   // REVIEW: Rendering evaluation annotations should probably be
  //   //         done separately from rendering the formula,
  //   //         but for now, for lack of a better place to put them,
  //   //         we are just appending the evaluation
  //   //         to the end of the formula.
  //   {
  //     const findOptions: FindStyleOptions = { role: 'EVALUATION', recursive: true };
  //     const evaluationStyles = notebook.findStyles(findOptions, rootStyleId);
  //     for (const evaluationStyle of evaluationStyles) {
  //       // HACK ALERT: We only take evaluations that are numbers:
  //       const evalStr = evaluationStyle.data.toString();
  //       if (/^\d+$/.test(evalStr)) {
  //         html = <Html>(html + ` [=${evalStr}]`);
  //       }
  //     }
  //   }

  //   // Render list of equivalent styles, if there are any.
  //   // REVIEW: Rendering equivalency annotations should probably be
  //   //         done separately from rendering the formula,
  //   //         but for now, for lack of a better place to put them,
  //   //         we are just appending the list of equivalent formulas
  //   //         to the end of the formula.
  //   {
  //     const findOptions: FindRelationshipOptions = { fromId: rootStyleId, toId: rootStyleId, role: 'EQUIVALENCE' };
  //     const relationships = notebook.findRelationships(findOptions);
  //     const equivalentStyleIds = relationships.map(r=>(r.toId!=rootStyleId ? r.toId : r.fromId)).sort();
  //     if (equivalentStyleIds.length>0) {
  //       html = <Html>(html + ` {${equivalentStyleIds.join(', ')}}`);
  //     }
  //   }

  //   return html;
  // }

  private createDisplayPanel(cellObject: FormulaCellObject): SVGSVGElement {
    const $displayPanel = $outerSvg<'svg'>(cellObject.displaySvg);
    $displayPanel.classList.add('display');
    return $displayPanel;
  }

  private createInputPanel(cellObject: FormulaCellObject): HTMLDivElement|undefined {
    let panel: KeyboardPanel|StrokePanel|undefined;
    switch(cellObject.inputType) {
      case InputType.Keyboard:
        panel = this.keyboardPanel = this.createKeyboardSubpanel(cellObject);
        break;
      case InputType.Stylus:
        panel = this.strokePanel = this.createStrokeSubpanel(cellObject);
        break;
      case InputType.None:
        // Do nothing.
        break;
      default: assertFalse();
    }

    if (panel) {
      const prefixHtml = <Html>''; // LATER: Prefix may be something like, "Assume", or "Define", or "Prove" etc.,
      const $inputPanel = $new({
        tag: 'div',
        class: <CssClass>'formulaInput',
        children: [
          { tag: 'div', class: <CssClass>'prefixPanel', html: prefixHtml },
          panel.$elt,
          { tag: 'div', class: <CssClass>'handlePanel', html: <Html>`(${cellObject.id})` },
          { tag: 'div', class: <CssClass>'statusPanel', html: <Html>'&nbsp;' },
        ],
      });
      return $inputPanel;
    } else {
      return undefined;
    }
  }

  private createKeyboardSubpanel(cellObject: FormulaCellKeyboardObject): KeyboardPanel {
    const callbackFn: KeyboardCallbackFn = (_start: number, _end: number, _replacement: PlainText, _value: PlainText): void=>{
      notImplemented();
      // const changeRequest: KeyboardInputRequest = { type: 'keyboardInputChange', cellId: style.id, start, end, replacement, value, };
      // this.container.screen.notebook.sendCellChangeRequest(changeRequest)
      // .catch(err=>{
      // // REVIEW: Proper way to handle this error?
      //   logError(err, <Html>"Error sending keyboardInputChange from formula cell");
      // });
    }
    return new KeyboardPanel(cellObject.inputText, callbackFn);
  }

  private createStrokeSubpanel(cellObject: FormulaCellStylusObject): StrokePanel {
    const callbackFn: StrokeCallbackFn = async (stroke: Stroke)=>{
      const changeRequest: AddStroke = { type: 'addStroke', cellId: cellObject.id, stroke };
      await this.container.screen.notebook.sendChangeRequest(changeRequest)
      .catch(err=>{
        // REVIEW: Proper way to handle this error?
        logError(err, <Html>"Error sending stroke from formula cell");
      });
    };
    // Create the panel
    const strokePanel = new StrokePanel(cellObject.cssSize, cellObject.stylusSvg, callbackFn);
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
  //     case 'TEX-EXPRESSION':
  //     case 'WOLFRAM-EXPRESSION':
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

  // Private Event Handlers

  protected onResize(deltaY: number, final: boolean): void {
    debug(`onResize: ${deltaY} ${final}`);
  }
}

// HELPER FUNCTIONS
