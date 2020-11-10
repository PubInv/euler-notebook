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

import { CssClass, CssLength, SvgMarkup, assert, deepCopy } from "../shared/common";
import { StylusInput } from "../shared/stylus";

import { $outerSvg, $newSvg, $svg } from "../dom";

import { SvgStroke } from "../svg-stroke";
import { StylusDrawingPanel } from "./stylus-drawing-panel";

import { HtmlElement } from "../html-element";

// TODO: Rename stylus panel.

// Types

type StrokeCallbackFn = (stylusInput: StylusInput)=>Promise<void>;

// Constants

// Exported Class

export class StrokePanel extends HtmlElement<'div'> {

  // Public Class Methods

  // Public Constructor

  public constructor(
    stylusInput: StylusInput,
    svgMarkup: SvgMarkup|undefined,
    strokeCallbackFn: StrokeCallbackFn,
  ) {
    debug(`Creating instance ${svgMarkup?'with':'without'} SVG markup.`);

    // REVIEW: Why do we have to specify height here?
    const $svgPanel = svgMarkup ? $outerSvg<'svg'>(svgMarkup) : $newSvg<'svg'>({ tag: 'svg', class: <CssClass>'svgPanel', attrs: { height: stylusInput.size.height, width:stylusInput.size.width }});

    const width = <CssLength>$svgPanel.getAttribute('width'); // REVIEW: Get computed value instead?
    const height = <CssLength>$svgPanel.getAttribute('height');
    const stylusDrawingPanel = new StylusDrawingPanel(width, height, (stroke)=>this.onStrokeComplete(stroke));

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
    this.stylusInput = deepCopy(stylusInput);
  }

  // Public Instance Properties


  // Public Instance Methods

  public updateStylusInput(stylusInput: StylusInput): void {
    this.stylusInput = deepCopy(stylusInput);
  }

  public updateSvgMarkup(markup: SvgMarkup): void {
    debug(`Updating SVG markup`);
    assert(this.$svgPanel);
    this.$svgPanel!.outerHTML = markup;
    this.$svgPanel = $svg<'svg'>(this.$elt, '.svgPanel');
  }

  // -- PRIVATE --

  // Private Instance Properties

  private $svgPanel: SVGSVGElement|undefined;
  private strokeCallbackFn: StrokeCallbackFn;
  private stylusInput: StylusInput;

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
    // TODO: Incremental change request.
    this.stylusInput.strokeGroups[0].strokes.push(stroke.data);
    debug(`Calling stroke callback function`);
    return this.strokeCallbackFn(this.stylusInput);
  }
}


// HELPER FUNCTIONS
