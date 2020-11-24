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

import { CssClass, SvgMarkup, CssSize } from "../shared/common";
import { Stroke, StrokeData, StrokeId } from "../shared/stylus";

import { $newSvg, $outerSvg } from "../dom";

import { SvgStroke } from "../svg-stroke";
import { StylusDrawingPanel } from "./stylus-drawing-panel";

import { HtmlElement } from "../html-element";

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
    const svgMarkup = convertStrokesToSvg(strokeData);

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

  public insertStroke(_strokeId: StrokeId, stroke: Stroke): void {
    const shape = convertStrokeToPathShape(stroke);
    const $path = $newSvg({ tag: 'path', attrs: { d: shape }});
    this.$svgPanel.append($path);
  }

  // -- PRIVATE --

  // Private Instance Properties

  private $svgPanel: SVGSVGElement;
  private strokeCallbackFn: StrokeCallbackFn;

  // Private Instance Property Functions

  // Private Event Handlers

  // TODO: Remove or comment out all of the drag/drop console messages.

  // private onResize(deltaY: number, final: boolean): void {
  //   const $svgPanel = $svg<'svg'>(this.$elt, '.svgPanel');
  //   const currentHeight = parseInt($svgPanel.getAttribute('height')!.slice(0, -2), 10);
  //   // TODO: resizer bar should enforce minimum.
  //   // TODO: minimum height should be based on ink content.
  //   const newHeight = Math.max(currentHeight + deltaY, 10);
  //   const newHeightStr = `${newHeight}px`;
  //   $svgPanel.setAttribute('height', newHeightStr);

  //   if (final) {
  //     // TODO: Incremental change request?
  //     const inputStyle = this.inputStyleCopy!;
  //     assert(inputStyle);
  //     const data = <DrawingData>inputStyle.data;
  //     data.size.height = newHeightStr;
  //     // REVIEW: what if size is unchanged?
  //     const changeRequest: StyleChangeRequest = { type: 'changeStyle', cellId: inputStyle.id, data };
  //     this.view.editStyle([ changeRequest ])
  //     .catch((err: Error)=>{
  //       // TODO: What to do here?
  //       reportError(err, <Html>"Error submitting resize");
  //     });
  //   }
  // }

  private async onStrokeComplete(stroke: SvgStroke): Promise<void> {
    // TODO: What if socket to server is closed? We'll just accumulate strokes that will never get saved.
    //       How do we handle offline operation?
    debug(`Calling stroke callback function`);
    return this.strokeCallbackFn(stroke.data);
  }
}


// HELPER FUNCTIONS

function convertStrokesToSvg(strokeData: StrokeData): SvgMarkup {
  const paths: string[] = [];
  for (const strokeGroup of strokeData.strokeGroups) {
    for (const stroke of strokeGroup.strokes) {
      const path = convertStrokeToPath(stroke);
      paths.push(path);
    }
  }
  const svgMarkup = <SvgMarkup>`<svg class="svgPanel" height="${strokeData.size.height}" width="${strokeData.size.width}" fill="none" stroke="black">${paths.join('')}</svg>`;
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
