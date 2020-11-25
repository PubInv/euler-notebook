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
const debug = debug1('client:stroke-panel');

import { CssClass, SvgMarkup, CssSize, assert } from "../shared/common";
import { StrokeData } from "../shared/stylus";
import { Stroke } from "../shared/myscript-types";

import { $newSvg, $outerSvg } from "../dom";

import { SvgStroke } from "../svg-stroke";
import { StylusDrawingPanel } from "./stylus-drawing-panel";

import { HtmlElement } from "../html-element";
import { CellResized, NotebookUpdate, StrokeInserted } from "../shared/server-responses";
import { notebookUpdateSynopsis } from "../shared/debug-synopsis";

// TODO: Rename stylus panel.

// Types

type PathDAttribute = '{PathDAttribute}';
export type StrokeCallbackFn = (stroke: Stroke)=>Promise<void>;

// Constants

// Exported Class

export class StrokePanel extends HtmlElement<'div'> {

  // Public Class Methods

  // Public Constructor

  public constructor(
    cssSize: CssSize,
    strokeData: StrokeData,
    strokeCallbackFn: StrokeCallbackFn,
  ) {
    const svgMarkup = convertStrokesToSvg(cssSize, strokeData);

    const $svgPanel = $outerSvg<'svg'>(svgMarkup);
    const stylusDrawingPanel = new StylusDrawingPanel(cssSize, (stroke)=>this.onStrokeComplete(stroke));

    super({
      tag: 'div',
      classes: [ <CssClass>'inputPanel', <CssClass>'strokePanel'],
      children: [
        stylusDrawingPanel.$elt,
        $svgPanel,
      ]
    });

    this.$svgPanel = $svgPanel;
    this.strokeCallbackFn = strokeCallbackFn;
    // REVIEW: Is stylusInput updated in-place?
  }

  // Public Instance Properties

  // Public Instance Methods

  // Public Event Handlers

  public onUpdate(update: NotebookUpdate, ownRequest: boolean): void {
    debug(`onUpdate ${notebookUpdateSynopsis(update)}`);
    switch (update.type) {
      case 'cellResized': this.onCellResized(update, ownRequest); break;
      case 'strokeInserted': this.onStrokeInserted(update, ownRequest); break;
      default: /* Nothing to do. */ break;
    }
  };

  // -- PRIVATE --

  // Private Instance Properties

  private $svgPanel: SVGSVGElement;
  private strokeCallbackFn: StrokeCallbackFn;

  // Private Instance Property Functions

  // Private Event Handlers

  private onCellResized(update: CellResized, _ownRequest: boolean): void {
    this.$svgPanel.setAttribute('height', update.cssSize.height);
    assert(this.$svgPanel.getAttribute('width') === update.cssSize.width);
    // TODO: Resize StylusInputPanel.
  }

  private onStrokeInserted(update: StrokeInserted, _ownRequest: boolean): void {
    const shape = convertStrokeToPathShape(update.stroke);
    const $path = $newSvg({ tag: 'path', attrs: { d: shape }});
    this.$svgPanel.append($path);
  }

  private async onStrokeComplete(stroke: SvgStroke): Promise<void> {
    // TODO: What if socket to server is closed? We'll just accumulate strokes that will never get saved.
    //       How do we handle offline operation?
    debug(`Calling stroke callback function`);
    return this.strokeCallbackFn(stroke.data);
  }
}


// HELPER FUNCTIONS

function convertStrokesToSvg(cssSize: CssSize, strokeData: StrokeData): SvgMarkup {
  const paths: string[] = [];
  for (const strokeGroup of strokeData.strokeGroups) {
    for (const stroke of strokeGroup.strokes) {
      const path = convertStrokeToPath(stroke);
      paths.push(path);
    }
  }
  const svgMarkup = <SvgMarkup>`<svg class="svgPanel" height="${cssSize.height}" width="${cssSize.width}" fill="none" stroke="black">${paths.join('')}</svg>`;
  return svgMarkup;
}

function convertStrokeToPath(stroke: Stroke): SvgMarkup {
  const shape = convertStrokeToPathShape(stroke);
  return <SvgMarkup>`<path d="${shape}"></path>`;
}

function convertStrokeToPathShape(stroke: Stroke): PathDAttribute {
  if (stroke.x.length<2) {
    console.warn(`Have a stroke with too few data points: ${stroke.x.length}`)
    return <PathDAttribute>"";
  }
  let shape: PathDAttribute = <PathDAttribute>`M${stroke.x[0]} ${stroke.y[0]}`;
  for (let i=1; i<stroke.x.length; i++) {
    shape += ` L${stroke.x[i]} ${stroke.y[i]}`
  }
  return shape;
}
