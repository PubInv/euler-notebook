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
const debug = debug1('client:hint-cell');

import { assert, assertFalse, CssClass } from "../../../../shared/common";
import { StyleObject, /* HintData, HintStatus, HintRelationship, */ NotebookChange, StrokeData } from "../../../../shared/notebook";

import { $new, $outerSvg } from "../../../../dom";
import { Content as CellContainer } from "../index";

import { CellBase, isDisplaySvgStyle, isInputStyle, isStrokeSvgStyle } from "./cell-base";
import { notebookChangeSynopsis, styleSynopsis } from "../../../../shared/debug-synopsis";
import { KeyboardPanel } from "../../../../components/keyboard-panel";
import { StrokePanel } from "../../../../components/stroke-panel";
import { StyleChangeRequest } from "../../../../shared/math-tablet-api";

// Types

// Constants

// Class

export class HintCell extends CellBase {

  // Public Class Methods

  // Public Constructor

  public constructor(container: CellContainer, style: StyleObject) {
    debug(`Constructing: ${styleSynopsis(style)}`);

    const $content = $new<'div'>({ tag: 'div', class: <CssClass>'hintCell' });
    super(container, style,  $content);
    // this.render(style);

    const notebook = container.screen.notebook;
    const svgRepStyle = notebook.findStyle({ role: 'REPRESENTATION', type: 'SVG-MARKUP' }, style.id);
    if (svgRepStyle) {
      this.$displayPanel = this.createDisplayPanel(svgRepStyle);
      this.$content.prepend(this.$displayPanel);
    }

    const inputStyle = notebook.findStyle({ role: 'INPUT' }, style.id);
    if (inputStyle) {
      this.$inputPanel = this.createInputPanel(inputStyle);
      this.$content.append(this.$inputPanel);
    }

  }

  // Public Instance Methods


  // ClientNotebookWatcher Methods

  public onChange(change: NotebookChange): void {
    debug(`onChange: style ${this.styleId} ${notebookChangeSynopsis(change)}`);

    switch (change.type) {
      case 'relationshipDeleted':
      case 'relationshipInserted': {
        // Ignore. Not something that affects our display.
        break;
      }
      case 'styleInserted': {
        if (isDisplaySvgStyle(change.style, this.styleId)) {
          this.$displayPanel = this.createDisplayPanel(change.style);
          this.$content.prepend(this.$displayPanel);
        } else if (isInputStyle(change.style, this.styleId)) {
          this.$inputPanel = this.createInputPanel(change.style);
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
          // Ignore. Not something that affects our display.
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
        // Styles relevant to display of the formula are only deleted when the entire formula is deleted,
        // so we can ignore styleDeleted messages.
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
  }

  public onChangesFinished(): void { /* Nothing to do. */ }

  // -- PRIVATE --

  // Private Instance Properties

  private $displayPanel?: SVGSVGElement;
  private $inputPanel?: HTMLDivElement;
  private keyboardPanel?: KeyboardPanel;
  private strokePanel?: StrokePanel;

  // Private Instance Methods

  private createDisplayPanel(style: StyleObject): SVGSVGElement {
    const $displayPanel = $outerSvg<'svg'>(style.data);
    $displayPanel.classList.add('display');
    return $displayPanel;
  }

  private createInputPanel(inputStyle: StyleObject): HTMLDivElement {
    let panel: KeyboardPanel|StrokePanel;
    switch(inputStyle.type) {
      case 'PLAIN-TEXT': {
        panel = this.keyboardPanel = this.createKeyboardSubpanel(inputStyle);
        break;
      }
      case 'STROKE-DATA': {
        panel = this.strokePanel = this.createStrokeSubpanel(inputStyle);
        break;
      }
      default: assertFalse();
    }
    return panel.$elt;
  }

private createKeyboardSubpanel(inputStyle: StyleObject): KeyboardPanel {
    return new KeyboardPanel(inputStyle.data, async (text: string)=>{
      const changeRequest: StyleChangeRequest = { type: 'changeStyle', styleId: inputStyle.id, data: text };
      await this.container.screen.notebook.sendChangeRequest(changeRequest);
    });
  }

  private createStrokeSubpanel(inputStyle: StyleObject): StrokePanel {
    const svgRepStyle = this.container.screen.notebook.findStyle({ role: 'REPRESENTATION', type: 'SVG-MARKUP' }, inputStyle.id);
    const strokePanel = new StrokePanel(inputStyle.data, svgRepStyle?.data, async (strokeData: StrokeData)=>{
      const notebook = this.container.screen.notebook;
      const changeRequest: StyleChangeRequest = { type: 'changeStyle', styleId: inputStyle.id, data: strokeData };
      // TODO: We don't want to wait for *all* processing of the strokes to finish, just the svg update.
      // TODO: Incremental changes.
      await notebook.sendChangeRequest(changeRequest);
    });
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
      case 'PLAIN-TEXT':
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

  // private render(style: StyleObject): void {
  //   // TODO: If hint cell is moved then it needs to be re-rendered.
  //   const repStyle = this.container.screen.notebook.findStyle({ role: 'INPUT' }, style.id);
  //   if (!repStyle) {
  //     // TODO: Better way to handle this error.
  //     this.$elt.innerHTML = "ERROR: No REPRESENTATION/INPUT substyle.";
  //     return;
  //   }

  //   const hintData = <HintData>style.data;
  //   let relationshipMark: string;
  //   let statusMark: string;

  //   if (typeof hintData === 'string' || hintData instanceof String) {
  //     relationshipMark = "???";
  //     statusMark = '<b style="color:blue"><i>?</i></b> ';
  //   } else {

  //     // TODO: Use ..._ENTITY constants from dom.ts.
  //     switch(hintData.relationship) {
  //       case HintRelationship.Unknown: relationshipMark = ""; break;
  //       case HintRelationship.Equivalent: relationshipMark = "&#x2261 "; break;
  //       case HintRelationship.NotEquivalent: relationshipMark = "&#x2262 "; break;
  //       case HintRelationship.Implies: relationshipMark = "&#x221D2 "; break;
  //       case HintRelationship.ImpliedBy: relationshipMark = "&#x21D0 "; break;
  //       default: assertFalse();
  //     }

  //     if (hintData.relationship == HintRelationship.Unknown) {
  //       statusMark = '';
  //     } else {
  //       // TODO: Use ..._ENTITY constants from dom.ts.
  //       switch(hintData.status) {
  //         case HintStatus.Unknown: statusMark = '<b style="color:blue"><i>?</i></b> '; break;
  //         case HintStatus.Correct: statusMark = '<span style="color:green">&#x2714;</span> '; break;
  //         case HintStatus.Incorrect: statusMark = '<span style="color:red">&#x2718;</span> '; break;
  //         default: assertFalse();
  //       }
  //     }
  //   }
  //   let innerHtml = `${relationshipMark}${statusMark}<i>${escapeHtml(repStyle.data||'blank')}</i> `;
  //   const precedingStyleId = this.container.screen.notebook.precedingStyleId(style.id);
  //   const hintedRelId : number | undefined = hintData.idOfRelationshipDecorated;
  //   if (hintedRelId) {
  //     const hintedRel = this.container.screen.notebook.getRelationship(hintedRelId);
  //     const afterFrom = (precedingStyleId == hintedRel.fromId);
  //     const followingStyleId = this.container.screen.notebook.followingStyleId(style.id);
  //     const beforeTo = (followingStyleId == hintedRel.toId);
  //     const inBetween =  afterFrom && beforeTo;
  //     if (!inBetween) {
  //       innerHtml =  `${innerHtml}: ${hintedRel.fromId} &#x290F; ${hintedRel.toId}`;
  //     }
  //   }
  //   this.$elt.innerHTML = innerHtml;
  // }

  protected onResize(deltaY: number, final: boolean): void {
    debug(`onResize: ${deltaY} ${final}`);
  }
}
