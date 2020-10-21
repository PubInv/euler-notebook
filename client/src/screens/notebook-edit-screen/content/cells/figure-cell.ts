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
const debug = debug1('client:figure-cell');

import { CssClass, CssLength, Html, assert, assertFalse } from "../../../../shared/common";
import { StrokeData, StyleObject, NotebookChange } from "../../../../shared/notebook";
import { StyleChangeRequest } from "../../../../shared/math-tablet-api";

import { $new, $svg } from "../../../../dom";
import { StrokePanel } from "../../../../components/stroke-panel";

import { Content } from "../index";

import { CellBase, isDisplayStyle, isInputStyle, isStrokeSvgStyle } from "./cell-base";

// Types

// Exported Class

export class FigureCell extends CellBase {

  // Public Class Methods

  // Public Constructor

  public constructor(container: Content, rootStyle: StyleObject) {

    const notebook = container.screen.notebook;
    // const svgRepStyle = notebook.findStyle({ role: 'REPRESENTATION', type: 'SVG-MARKUP' }, rootStyle.id);

    const $editPanel = $new({ tag: 'div', class: <CssClass>'editPanel', html: <Html>"Placeholder" });

    super(container, rootStyle, $editPanel);

    this.$editPanel = $editPanel;

    const inputStyle = notebook.findStyle({ role: 'INPUT' }, rootStyle.id);
    this.replaceEditPanel(inputStyle);
  }

  // Public Instance Methods

  // ClientNotebookWatcher Methods

  public onChange(change: NotebookChange): void {
    debug(`onChange: cell ${this.styleId}, type ${change.type}`);
    // TODO: Changes that affect the prefix panel.

    switch (change.type) {
      case 'relationshipDeleted':
      case 'relationshipInserted': {
        // Ignore. Not something that affects our display.
        break;
      }
      case 'styleInserted':
      case 'styleChanged': {
        const changedStyle = change.style;
        /* if (isDisplayStyle(changedStyle, this.styleId)) {
          this.updateDisplayPanel(change.type, changedStyle);
        } else */if (isInputStyle(changedStyle, this.styleId)) {
          this.updateEditPanelData(change.type, changedStyle);
        } else if (isStrokeSvgStyle(changedStyle, this.styleId, this.container.screen.notebook)) {
          this.updateEditPanelDrawing(change.type, changedStyle);
        } else {
          // Ignore. Not something that affects our display.
        }
        break;
      }
      case 'styleConverted': {
        // Currently the styles that we use to update our display are never converted, so we
        // do not handle that case.
        const style = this.container.screen.notebook.getStyle(change.styleId);
        assert(!isDisplayStyle(style, this.styleId));
        assert(!isInputStyle(style, this.styleId));
        assert(!isStrokeSvgStyle(style, this.styleId, this.container.screen.notebook));
        break;
      }
      case 'styleDeleted':
        // Styles relevant to display of the figure are only deleted when the entire formula is deleted,
        // so we can ignore styleDeleted messages.
        break;
      case 'styleMoved': assertFalse();
      default: assertFalse();
    }
  }

  public onChangesFinished(): void { /* Nothing to do. */ }

  // -- PRIVATE --

  // Private Instance Properties

  private $editPanel: HTMLDivElement;
  private strokePanel?: StrokePanel;

  // Private Instance Property Functions

  // Private Instance Methods

  private createStrokeSubpanel(inputStyle: StyleObject): StrokePanel {
    const svgRepStyle = this.container.screen.notebook.findStyle({ role: 'REPRESENTATION', type: 'SVG-MARKUP' }, inputStyle.id);
    const strokePanel = new StrokePanel(
      inputStyle.data,
      svgRepStyle?.data,
      async (strokeData: StrokeData)=>{
        const notebook = this.container.screen.notebook;
        const changeRequest: StyleChangeRequest = { type: 'changeStyle', styleId: inputStyle.id, data: strokeData };
        // TODO: We don't want to wait for *all* processing of the strokes to finish, just the svg update.
        // TODO: Incremental changes.
        await notebook.sendChangeRequest(changeRequest);
      },
    );
    return strokePanel;
  }

  private replaceEditPanel(inputStyle: StyleObject|undefined): void {
    if (!inputStyle) {
      // No edit panel can be created yet because the root style doesn't have the necessary substyles yet,
      return;
    }
    this.strokePanel = this.createStrokeSubpanel(inputStyle);
    const $newEditPanel = this.strokePanel.$elt;
    this.$editPanel.replaceWith($newEditPanel);
    this.$editPanel = $newEditPanel;
  }

  private updateEditPanelData(changeType: 'styleChanged'|'styleInserted', inputStyle: StyleObject): void {
    if (changeType == 'styleInserted') {
      assert(inputStyle.type == 'STROKE-DATA' || inputStyle.type == 'PLAIN-TEXT');
      assert(!this.strokePanel /* && !this.keyboardPanel */);
      this.replaceEditPanel(inputStyle);
    } else {
      // 'styleChanged'
      switch(inputStyle.type) {
        case 'STROKE-DATA':
          assert(this.strokePanel);
          this.strokePanel!.updateStrokeData(inputStyle.data);
          break;
        // case 'PLAIN-TEXT':
        //   assert(this.keyboardPanel);
        //   this.keyboardPanel!.updateText(inputStyle.data);
        //   break;
        default: assertFalse();
      }
    }
  }

  private updateEditPanelDrawing(_changeType: 'styleChanged'|'styleInserted', svgRepStyle: StyleObject): void {
    assert(this.strokePanel);
    this.strokePanel!.updateSvgMarkup(svgRepStyle.data);
  }

  // Private Instance Event Handlers

  protected onResize(deltaY: number, final: boolean): void {
    debug(`onResize: ${deltaY} ${final}`);
    const $svgPanel = $svg<'svg'>(this.$elt, '.svgPanel');
    const currentHeight = parseInt($svgPanel.getAttribute('height')!.slice(0, -2), 10);
    // TODO: resizer bar should enforce minimum.
    // TODO: minimum height should be based on ink content.
    const newHeight = Math.max(currentHeight + deltaY, 10);
    const newHeightStr = <CssLength>`${newHeight}px`;
    $svgPanel.setAttribute('height', newHeightStr);

    // if (final) {
    //   // TODO: Incremental change request?
    //   const inputStyle = this.inputStyleCopy!;
    //   assert(inputStyle);
    //   const data = <StrokeData>inputStyle.data;
    //   data.size.height = newHeightStr;
    //   // REVIEW: what if size is unchanged?
    //   const changeRequest: StyleChangeRequest = { type: 'changeStyle', styleId: inputStyle.id, data };
    //   this.container.editStyle([ changeRequest ])
    //   .catch((err: Error)=>{
    //     // TODO: What to do here?
    //     reportError(err, <Html>"Error submitting resize");
    //   });
    // }

  }

  // private async onStroke(strokeData: StrokeData): Promise<void> {
  // }

  // private onStrokeComplete(stroke: SvgStroke): Promise<void> {
  //   // TODO: What if socket to server is closed? We'll just accumulate strokes that will never get saved.
  //   //       How do we handle offline operation?
  //   // TODO: Incremental change request.
  //   const inputStyle = this.inputStyleCopy!;
  //   assert(inputStyle);
  //   const data = <StrokeData>inputStyle.data;
  //   data.strokeGroups[0].strokes.push(stroke.data);
  //   const changeRequest: StyleChangeRequest = { type: 'changeStyle', styleId: inputStyle.id, data };
  //   return this.container.editStyle([ changeRequest ]);
  // }
}


