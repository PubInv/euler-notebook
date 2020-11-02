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

import { CssClass, Html, assertFalse, assert } from "../../../../shared/common";
import { StrokeData } from "../../../../shared/stylus";
import { FormulaCellData, FormulaCellStylusData } from "../../../../shared/formula";
import { StyleObject, NotebookChange, StyleSubrole } from "../../../../shared/notebook";

import { $new, $outerSvg } from "../../../../dom";
import { Content as CellContainer } from "..";

import { CellBase } from "./cell-base";
import { KeyboardCallbackFn, KeyboardPanel } from "../../../../components/keyboard-panel";
import { StrokePanel } from "../../../../components/stroke-panel";
// import { StyleChangeRequest } from "../../../../shared/math-tablet-api";
import { notebookChangeSynopsis } from "../../../../shared/debug-synopsis";
import { InputType } from "../../../../shared/cell";
import { KeyboardChangeRequest } from "../../../../shared/math-tablet-api";
import { logError } from "../../../../error-handler";

// Types

// Constants

const FORMULA_SUBROLE_PREFIX = new Map<StyleSubrole,Html>([
  // IMPORTANT: Keep in sync with FORMULA_SUBROLE_OPTIONS
  [ 'ASSUME', <Html>"<i>Assume</i>&nbsp;" ],
  [ 'DEFINITION', <Html>"<i>Definition</i>&nbsp;" ],
  [ 'PROVE', <Html>"<i>Prove </i>&nbsp;" ],
  [ 'OTHER', <Html>"<i>Other </i>&nbsp;" ],
]);

// Class

export class FormulaCell extends CellBase {

  // Public Class Methods

  // Public Constructor

  public constructor(container: CellContainer, style: StyleObject) {
    debug(`Creating instance: style ${style.id}`);

    const $content = $new({
      tag: 'div',
      classes: [ <CssClass>'content', <CssClass>'formulaCell' ],
    });

    super(container, style, $content);

    this.$displayPanel = this.createDisplayPanel(style);
    this.$content.prepend(this.$displayPanel);

    this.$inputPanel = this.createInputPanel(style);
    if (this.$inputPanel) {
      this.$content.append(this.$inputPanel);
    }
  }

  // Public Instance Methods

  // ClientNotebookWatcher Methods

  public onChange(change: NotebookChange): boolean {
    debug(`onChange: cell ${this.styleId} ${notebookChangeSynopsis(change)}`);

    // TODO: Changes that affect the prefix panel.

    // TODO: Do we deal with showing the Wolfram Evaluation values in the formula,
    //       and therefore deal with updating them here, or should we move their display to the tools panel?
    switch (change.type) {
      case 'relationshipDeleted':
      case 'relationshipInserted': {
        // TODO: Do we continue to show equivalent style relationships in the formula, and therefore deal with
        //       updating them here, or should we move their display to the tools panel?
        break;
      }
      case 'styleInserted': {
        // Ignore. Not something we are interested in.
        break;
      }
      case 'styleChanged': {
        if (change.style.id == this.styleId) {
          this.updateDisplayPanel(change.style);
          this.updateInputPanelData(change.style);
          this.updateInputPanelDrawing(change.style);
        } else {
          // Ignore. Not something we are interested in.
        }
        break;
      }
      case 'styleConverted': {
        assertFalse();
        break;
      }
      case 'styleDeleted': {
        // Ignore. Not something we are interested in.
        break;
      }
      case 'styleMoved': assertFalse();
      default: assertFalse();
    }
    return false;
  }

  public onChangesFinished(): void { /* Nothing to do. */ }

  // -- PRIVATE --

  // Private Instance Properties

  private $displayPanel?: SVGSVGElement;
  private $inputPanel: HTMLDivElement|undefined;
  private keyboardPanel?: KeyboardPanel;
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

  private createDisplayPanel(style: StyleObject): SVGSVGElement {
    const data: FormulaCellData = style.data;
    const $displayPanel = $outerSvg<'svg'>(data.displaySvg);
    $displayPanel.classList.add('display');
    return $displayPanel;
  }

  private createInputPanel(style: StyleObject): HTMLDivElement|undefined {
    let panel: KeyboardPanel|StrokePanel|undefined;
    const data = <FormulaCellData>style.data;
    switch(data.inputType) {
      case InputType.Keyboard:
        panel = this.keyboardPanel = this.createKeyboardSubpanel(style);
        break;
      case InputType.Stylus:
        panel = this.createStrokeSubpanel(style);
        break;
      case InputType.None:
        // Do nothing.
        break;
      default: assertFalse();
    }

    if (panel) {
      const prefixHtml = style.subrole ? FORMULA_SUBROLE_PREFIX.get(style.subrole!)! : <Html>'';
      const $inputPanel = $new({
        tag: 'div',
        class: <CssClass>'formulaInput',
        children: [
          { tag: 'div', class: <CssClass>'prefixPanel', html: prefixHtml },
          panel.$elt,
          { tag: 'div', class: <CssClass>'handlePanel', html: <Html>`(${style.id})` },
          { tag: 'div', class: <CssClass>'statusPanel', html: <Html>'&nbsp;' },
        ],
      });
      return $inputPanel;
    } else {
      return undefined;
    }
  }

  private createKeyboardSubpanel(style: StyleObject): KeyboardPanel {
    const data = <FormulaCellData>style.data;
    const textChangeCallback: KeyboardCallbackFn = (event: InputEvent): void=>{
      const target = <HTMLTextAreaElement>event.target!;
      const changeRequest: KeyboardChangeRequest = {
        type: 'keyboardChange',
        styleId: style.id,
        inputType: event.inputType,
        data: event.data,
        value: target.value,
        selectionDirection: target.selectionDirection,
        selectionStart: target.selectionStart,
        selectionEnd: target.selectionEnd,
      };
      this.container.screen.notebook.sendChangeRequest(changeRequest)
      .catch(err=>{
        logError(err, <Html>"Error sending keyboardChangeRequest from formula cell");
      });
    }
    return new KeyboardPanel(data.plainTextMath, textChangeCallback);
  }

  private createStrokeSubpanel(style: StyleObject): StrokePanel {

    const data = <FormulaCellStylusData>style.data;

    // Callback function for when strokes in the panel have changed.
    // Submit a notebook change request.
    const strokesChangeCallback = async (_strokeData: StrokeData)=>{
      throw new Error("TODO: Just send stroke to server");
      // const changeRequest: StyleChangeRequest = { type: 'changeStyle', styleId: style.id, data: strokeData };
      // // TODO: We don't want to wait for *all* processing of the strokes to finish, just the svg update.
      // // TODO: Incremental changes.
      // await this.container.screen.notebook.sendChangeRequest(changeRequest);
    };

    // Create the panel
    const strokePanel = new StrokePanel(data.stylusInput, data.stylusSvg, strokesChangeCallback);
    return strokePanel;
  }

  private updateDisplayPanel(style: StyleObject): void {
    const $displayPanel = this.createDisplayPanel(style);
    this.$displayPanel!.replaceWith($displayPanel);
    this.$displayPanel = $displayPanel;
  }

  private updateInputPanelData(inputStyle: StyleObject): void {
    switch(inputStyle.type) {
      case 'STROKE-DATA':
        assert(this.strokePanel);
        this.strokePanel!.updateStylusInput(inputStyle.data);
        break;
      case 'TEX-EXPRESSION':
      case 'WOLFRAM-EXPRESSION':
        assert(this.keyboardPanel);
        this.keyboardPanel!.updateText(inputStyle.data);
        break;
      default: assertFalse();
    }
  }

  private updateInputPanelDrawing(svgRepStyle: StyleObject): void {
    assert(this.strokePanel);
    this.strokePanel!.updateSvgMarkup(svgRepStyle.data);
  }

  // Private Event Handlers

  protected onResize(deltaY: number, final: boolean): void {
    debug(`onResize: ${deltaY} ${final}`);
  }
}

// HELPER FUNCTIONS
