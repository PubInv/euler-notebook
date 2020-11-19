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

import { CssClass, CssLength, assertFalse, Html } from "../shared/common";
import { Stroke } from "../shared/stylus";
import { NotebookUpdate } from "../shared/server-responses";
import { notebookChangeSynopsis } from "../shared/debug-synopsis";
import { FigureCellObject } from "../shared/cell";
import { AddStroke } from "../shared/client-requests";

import { $svg, HtmlElementSpecification } from "../dom";
import { logError } from "../error-handler";
import { StrokeCallbackFn, StrokePanel } from "../components/stroke-panel";

import { FigureCell } from "../client-cell/figure-cell";
import { CellEditView } from "./cell-edit-view";

// Types

// Exported Class

export class FigureEditView extends CellEditView<FigureCellObject> {

  // Public Class Methods

  // Public Constructor

  public constructor(cell: FigureCell) {

    const contentSpec: HtmlElementSpecification<'div'> = {
      tag: 'div',
      classes: [ <CssClass>'content', <CssClass>'figureCell' ],
    };
    super(cell, contentSpec);
    this.$inputPanel = this.createInputPanel();
    this.$content.append(this.$inputPanel);
  }

  // Public Instance Methods

  // ClientNotebookWatcher Methods

  public onUpdate(update: NotebookUpdate): void {
    debug(`onChange: style ${this.id} ${notebookChangeSynopsis(update)}`);

    // Update the SVG display if it has changed.

    switch (update.type) {
      case 'cellInserted': {
        // Ignore. Not something that affects our display.
        break;
      }
      // case 'styleChanged': {
      //   if (change.style.id == this.cellId) {
      //     this.strokePanel!.updateStylusInput(change.style.data);
      //     this.strokePanel!.updateSvgMarkup(change.style.data);
      //   } else {
      //     // Ignore. Not something that affects our display.
      //   }
      //   break;
      // }
      case 'cellDeleted':
        // Styles relevant to display of the figure are only deleted when the entire formula is deleted,
        // so we can ignore styleDeleted messages.
        break;
      case 'cellMoved': assertFalse();
      default: assertFalse();
    }
  }

  // -- PRIVATE --

  // Private Instance Properties

  private $inputPanel: HTMLDivElement;
  // @ts-expect-error // TODO: value is never read error
  private strokePanel?: StrokePanel;

  // Private Instance Property Functions

  // Private Instance Methods

  private createInputPanel(): HTMLDivElement {
    const panel = this.strokePanel = this.createStrokeSubpanel(this.cell.obj);
    return panel.$elt;
  }

  private createStrokeSubpanel(cellObject: FigureCellObject): StrokePanel {
    const callbackFn: StrokeCallbackFn = async (stroke: Stroke)=>{
      const changeRequest: AddStroke = { type: 'addStroke', cellId: cellObject.id, stroke };
      // TODO: Remove tentative stroke from subpanel.
      await this.cell.sendChangeRequest(changeRequest)
      .catch(err=>{
        // REVIEW: Proper way to handle this error?
        logError(err, <Html>"Error sending stroke from figure cell");
      });
    };
    // Create the panel
    const strokePanel = new StrokePanel(cellObject.cssSize, cellObject.displaySvg, callbackFn);
    return strokePanel;
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
    //   const changeRequest: StyleChangeRequest = { type: 'changeStyle', cellId: inputStyle.id, data };
    //   this.container.editStyle([ changeRequest ])
    //   .catch((err: Error)=>{
    //     // TODO: What to do here?
    //     reportError(err, <Html>"Error submitting resize");
    //   });
    // }

  }
}


