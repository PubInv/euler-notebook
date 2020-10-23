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

import { CssClass, CssLength, assert, assertFalse } from "../../../../shared/common";
import { StrokeData, StyleObject, NotebookChange } from "../../../../shared/notebook";
import { StyleChangeRequest } from "../../../../shared/math-tablet-api";

import { $svg, HtmlElementSpecification } from "../../../../dom";
import { StrokePanel } from "../../../../components/stroke-panel";

import { Content as CellContainer } from "../index";

import { CellBase, isDisplaySvgStyle, isInputStyle, isStrokeSvgStyle } from "./cell-base";
import { notebookChangeSynopsis } from "../../../../shared/debug-synopsis";

// Types

// Exported Class

export class FigureCell extends CellBase {

  // Public Class Methods

  // Public Constructor

  public constructor(container: CellContainer, rootStyle: StyleObject) {

    const contentSpec: HtmlElementSpecification<'div'> = {
      tag: 'div',
      classes: [ <CssClass>'content', <CssClass>'figureCell' ],
    };
    super(container, rootStyle, contentSpec);

    const notebook = container.screen.notebook;
    const inputStyle = notebook.findStyle({ role: 'INPUT' }, rootStyle.id);
    if (inputStyle) {
      this.createStrokePanel(inputStyle);
    }
  }

  // Public Instance Methods

  // ClientNotebookWatcher Methods

  public onChange(change: NotebookChange): void {
    debug(`onChange: style ${this.styleId} ${notebookChangeSynopsis(change)}`);

    // Update the SVG display if it has changed.

    switch (change.type) {
      case 'relationshipDeleted':
      case 'relationshipInserted': {
        // Ignore. Not something that affects our display.
        break;
      }
      case 'styleInserted': {
        if (isInputStyle(change.style, this.styleId)) {
          this.createStrokePanel(change.style);
        } else if (isStrokeSvgStyle(change.style, this.styleId, this.container.screen.notebook)) {
          this.strokePanel!.updateSvgMarkup(change.style.data);
        } else {
          // Ignore. Not something that affects our display.
        }
        break;
      }
      case 'styleChanged': {
        if (isInputStyle(change.style, this.styleId)) {
          this.strokePanel!.updateStrokeData(change.style.data);
        } else if (isStrokeSvgStyle(change.style, this.styleId, this.container.screen.notebook)) {
          this.strokePanel!.updateSvgMarkup(change.style.data);
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

  private strokePanel?: StrokePanel;

  // Private Instance Property Functions

  // Private Instance Methods

  private createStrokePanel(inputStyle: StyleObject): void {
    const svgRepStyle = this.container.screen.notebook.findStyle({ role: 'REPRESENTATION', type: 'SVG-MARKUP' }, inputStyle.id);
    this.strokePanel = new StrokePanel(
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
    this.$content.appendChild(this.strokePanel.$elt);
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

    // TODO: Save new cell height on final resize call.
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
}


