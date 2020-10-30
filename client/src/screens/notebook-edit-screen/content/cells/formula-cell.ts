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
import { StyleObject, NotebookChange, StyleSubrole } from "../../../../shared/notebook";

import { $new, $outerSvg } from "../../../../dom";
import { Content as CellContainer } from "..";

import { CellBase, isDisplaySvgStyle, isInputStyle, isStrokeSvgStyle } from "./cell-base";
import { KeyboardPanel } from "../../../../components/keyboard-panel";
import { StrokePanel } from "../../../../components/stroke-panel";
import { StyleChangeRequest } from "../../../../shared/math-tablet-api";
import { notebookChangeSynopsis } from "../../../../shared/debug-synopsis";

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

    const notebook = container.screen.notebook;
    const svgRepStyle = notebook.findStyle({ role: 'REPRESENTATION', type: 'SVG-MARKUP' }, style.id);
    if (svgRepStyle) {
      this.$displayPanel = this.createDisplayPanel(svgRepStyle);
      this.$content.prepend(this.$displayPanel);
    }

    const inputStyle = notebook.findStyle({ role: 'INPUT' }, style.id);
    if (inputStyle) {
      this.$inputPanel = this.createInputPanel(style, inputStyle);
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
        if (isDisplaySvgStyle(change.style, this.styleId)) {
          this.$displayPanel = this.createDisplayPanel(change.style);
          this.$content.prepend(this.$displayPanel);
        } else if (isInputStyle(change.style, this.styleId)) {
          const style = this.container.screen.notebook.getStyle(this.styleId);
          this.$inputPanel = this.createInputPanel(style, change.style);
          this.$content.append(this.$inputPanel);
        } else {
          // Ignore. Not something we are interested in.
        }
        break;
      }
      case 'styleChanged': {
        if (isDisplaySvgStyle(change.style, this.styleId)) {
          this.updateDisplayPanel(change.style);
        } else if (isInputStyle(change.style, this.styleId)) {
          this.updateInputPanelData(change.style);
        } else if (isStrokeSvgStyle(change.style, this.styleId, this.container.screen.notebook)) {
          this.updateInputPanelDrawing(change.style);
        } else {
          // Ignore. Not something we are interested in.
        }
        break;
      }
      case 'styleConverted': {
        // Currently the styles that we use to update our display are never converted, so we
        // do not handle that case.
        const style = this.container.screen.notebook.getStyle(change.styleId);
        assert(!isDisplaySvgStyle(style, this.styleId));
        assert(!isInputStyle(style, this.styleId));
        assert(!isStrokeSvgStyle(style, this.styleId, this.container.screen.notebook));
        break;
      }
      case 'styleDeleted': {
        if (isDisplaySvgStyle(change.style, this.styleId)) {
          this.removeDisplayPanel();
        } else if (isInputStyle(change.style, this.styleId)) {
          this.removeInputPanel();
        } else {
          // Ignore. Not something we are interested in.
        }
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
  private $inputPanel?: HTMLDivElement;
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
    const $displayPanel = $outerSvg<'svg'>(style.data);
    $displayPanel.classList.add('display');
    return $displayPanel;
  }

  private createInputPanel(style: StyleObject, inputStyle: StyleObject): HTMLDivElement {

    let panel: KeyboardPanel|StrokePanel;
    switch(inputStyle.type) {
      case 'WOLFRAM-EXPRESSION':
        panel = this.keyboardPanel = this.createKeyboardSubpanel(inputStyle);
        break;
      case 'STROKE-DATA': {
        panel = this.createStrokeSubpanel(inputStyle);
        break;
      }
      default: assertFalse();
    }

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
  }

  private createKeyboardSubpanel(inputStyle: StyleObject): KeyboardPanel {

    // Callback function for when text in the panel has changed.
    // Submit a notebook change request.
    const textChangeCallback = async (text: string)=>{
      const changeRequest: StyleChangeRequest = { type: 'changeStyle', styleId: inputStyle.id, data: text };
      await this.container.screen.notebook.sendChangeRequest(changeRequest);
    }

    // Create the panel
    return new KeyboardPanel(inputStyle.data, textChangeCallback);
  }

  private createStrokeSubpanel(inputStyle: StyleObject): StrokePanel {

    // Callback function for when strokes in the panel have changed.
    // Submit a notebook change request.
    const strokesChangeCallback = async (strokeData: StrokeData)=>{
      const changeRequest: StyleChangeRequest = { type: 'changeStyle', styleId: inputStyle.id, data: strokeData };
      // TODO: We don't want to wait for *all* processing of the strokes to finish, just the svg update.
      // TODO: Incremental changes.
      await this.container.screen.notebook.sendChangeRequest(changeRequest);
    };

    // Create the panel
    const svgRepStyle = this.container.screen.notebook.findStyle({ role: 'REPRESENTATION', type: 'SVG-MARKUP' }, inputStyle.id);
    const strokePanel = new StrokePanel(inputStyle.data, svgRepStyle?.data, strokesChangeCallback);
    return strokePanel;
  }

  private removeDisplayPanel(): void {
    this.$displayPanel!.remove();
    delete this.$displayPanel;
  }

  private removeInputPanel(): void {
    this.$inputPanel!.remove();
    delete this.$inputPanel;
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
        this.strokePanel!.updateStrokeData(inputStyle.data);
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
