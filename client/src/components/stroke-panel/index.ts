/*
Math Tablet
Copyright (C) 2019-21 Public Invention
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
const debug = debug1('client:stroke-panel');

import { CssClass, SvgMarkup, CssSize, assert, assertFalse } from "../../shared/common";
import { convertStrokeToPathShape, Stroke, StrokeData, StrokeId } from "../../shared/stylus";

import { $, $newSvg, $newSvgFromMarkup, ElementId } from "../../dom";

import { HtmlElement } from "../../html-element";
import { CellResized, NotebookUpdate, StrokeDeleted, StrokeInserted } from "../../shared/server-responses";
import { notebookUpdateSynopsis } from "../../shared/debug-synopsis";
import { CellId, CellObject } from "../../shared/cell";

import { StrokeDrawingPanel } from "./stroke-drawing-panel";
import { StrokeSelectionPanel } from "./stroke-selection-panel";

// TODO: Rename stylus panel.

// Types

export type StrokeCallbackFn = (stroke: Stroke)=>Promise<void>;

export interface StrokePanelCallbacks {
  drawStroke: (stroke: Stroke)=>Promise<void>;
  eraseStroke: (strokeId: StrokeId)=>Promise<void>;
}

export enum StylusMode {
  Draw,
  Erase,
}

// Constants

// Exported Class

export class StrokePanel extends HtmlElement<'div'> {

  // Public Class Methods

  // Public Constructor

  public constructor(
    cellObject: CellObject,
    callbacks: StrokePanelCallbacks,
    stylusMode: StylusMode,
  ) {
    const { id: cellId, cssSize, strokeData } = cellObject;
    const svgMarkup = convertStrokesToSvg(cellId, cssSize, strokeData);

    const $svgPanel = $newSvgFromMarkup<'svg'>(svgMarkup);
    const strokeDrawingPanel = new StrokeDrawingPanel(cssSize, (stroke)=>callbacks.drawStroke(stroke.data));
    const strokeSelectionPanel = new StrokeSelectionPanel(cssSize, strokeData, (strokeId)=>callbacks.eraseStroke(strokeId));
    super({
      tag: 'div',
      classes: [ <CssClass>'inputPanel', <CssClass>'strokePanel'],
      children: [
        strokeDrawingPanel.$elt,
        strokeSelectionPanel.$elt,
        $svgPanel,
      ]
    });

    this.$svgPanel = $svgPanel;
    this.strokeDrawingPanel = strokeDrawingPanel;
    this.strokeSelectionPanel = strokeSelectionPanel;
    // REVIEW: Is stylusInput updated in-place?

    this.stylusMode = stylusMode;
  }

  // Public Instance Properties

  // Public Instance Property Functions

  public set stylusMode(value: StylusMode) {
    switch(value) {
      case StylusMode.Draw:
        this.strokeDrawingPanel.show();
        this.strokeSelectionPanel.hide();
        break;
      case StylusMode.Erase:
        this.strokeDrawingPanel.hide();
        this.strokeSelectionPanel.show();
        break;
      default: assertFalse();
    }
  }

  // Public Instance Methods

  // Public Instance Event Handlers

  public onUpdate(update: NotebookUpdate, ownRequest: boolean): void {
    debug(`onUpdate ${notebookUpdateSynopsis(update)}`);
    this.strokeSelectionPanel.onUpdate(update, ownRequest);
    switch (update.type) {
      case 'cellResized': this.onCellResized(update, ownRequest); break;
      case 'strokeDeleted': this.onStrokeDeleted(update, ownRequest); break;
      case 'strokeInserted': this.onStrokeInserted(update, ownRequest); break;
      default: /* Nothing to do. */ break;
    }
  };

  // -- PRIVATE --

  // Private Instance Properties

  private $svgPanel: SVGSVGElement;
  private strokeDrawingPanel: StrokeDrawingPanel;
  private strokeSelectionPanel: StrokeSelectionPanel;

  // Private Instance Property Functions

  // Private Event Handlers

  private onCellResized(update: CellResized, _ownRequest: boolean): void {
    this.$svgPanel.setAttribute('height', update.cssSize.height);
    assert(this.$svgPanel.getAttribute('width') === update.cssSize.width);
    // TODO: Resize StylusInputPanel.
  }

  private onStrokeDeleted(update: StrokeDeleted, _ownRequest: boolean): void {
    const $path = $(this.$svgPanel, `#${pathId(update.cellId, update.strokeId)}`);
    $path.remove();
  }

  private onStrokeInserted(update: StrokeInserted, _ownRequest: boolean): void {
    const shape = convertStrokeToPathShape(update.stroke);
    const $path = $newSvg({ tag: 'path', id: pathId(update.cellId, update.stroke.id), attrs: { d: shape }});
    this.$svgPanel.append($path);
  }
}


// HELPER FUNCTIONS

function convertStrokesToSvg(cellId: CellId, cssSize: CssSize, strokeData: StrokeData): SvgMarkup {
  const paths: string[] = [];
  for (const stroke of strokeData.strokes) {
    const path = convertStrokeToPath(cellId, stroke);
    paths.push(path);
  }
  const svgMarkup = <SvgMarkup>`<svg class="svgPanel" height="${cssSize.height}" width="${cssSize.width}" fill="none" stroke="black">${paths.join('')}</svg>`;
  return svgMarkup;
}

function convertStrokeToPath(cellId: CellId, stroke: Stroke): SvgMarkup {
  const shape = convertStrokeToPathShape(stroke);
  return <SvgMarkup>`<path id="${pathId(cellId, stroke.id)}" d="${shape}"></path>`;
}

function pathId(cellId: CellId, strokeId: StrokeId): ElementId {
  return <ElementId>`c${cellId}s${strokeId}`;
}
