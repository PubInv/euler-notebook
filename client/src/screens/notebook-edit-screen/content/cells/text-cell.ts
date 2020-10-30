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

import { CssClass, assert, assertFalse } from "../../../../shared/common";
import { StrokeData } from "../../../../shared/stylus";
import { StyleObject, NotebookChange, } from "../../../../shared/notebook";
import { StyleChangeRequest } from "../../../../shared/math-tablet-api";

import { $new, $outerSvg } from "../../../../dom";
import { KeyboardPanel } from "../../../../components/keyboard-panel";
import { StrokePanel } from "../../../../components/stroke-panel";

import { Content as CellContainer } from "../index";

import { CellBase, isDisplaySvgStyle } from "./cell-base";
import { notebookChangeSynopsis, styleSynopsis } from "../../../../shared/debug-synopsis";

// Types

// Constants

// Class

export class TextCell extends CellBase {

  // Public Class Methods

  // Public Constructor

  public constructor(container: CellContainer, style: StyleObject) {
    debug(`Constructing: ${styleSynopsis(style)}`);

    const $content = $new({
      tag: 'div',
      classes: [ <CssClass>'content', <CssClass>'textCell' ],
    });

    super(container, style, $content);

    const notebook = container.screen.notebook;
    const svgRepStyle = notebook.findStyle({ role: 'REPRESENTATION', type: 'SVG-MARKUP' }, style.id);
    if (svgRepStyle) {
      this.$displayPanel = this.createDisplayPanel(svgRepStyle);
      this.$content.prepend(this.$displayPanel);
    }

    this.$inputPanel = this.createInputPanel(style);
    this.$content.append(this.$inputPanel);
  }

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
        } else {
          // Ignore. Not something we are interested in.
        }
        break;
      }
      case 'styleChanged': {
        if (isDisplaySvgStyle(change.style, this.styleId)) {
          this.updateDisplayPanel(change.style);
        } else if (change.style.id == this.styleId) {
          this.updateInputPanelData(change.style);
          this.updateInputPanelDrawing(change.style);
        } else {
          // Ignore. Not something that affects our display.
        }
        break;
      }
      case 'styleConverted': {
        assertFalse();
        break;
      }
      case 'styleDeleted': {
        // Styles relevant to display of the formula are only deleted when the entire formula is deleted,
        // so we can ignore styleDeleted messages.
        if (isDisplaySvgStyle(change.style, this.styleId)) {
          this.removeDisplayPanel();
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

  // Private Instance Event Handlers

  protected onResize(deltaY: number, final: boolean): void {
    debug(`onResize: ${deltaY} ${final}`);
  }

}

// HELPER FUNCTIONS

