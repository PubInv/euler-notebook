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

import debug1 from 'debug';

import { BaseObserver, Rules } from './base-observer';
import { ServerNotebook } from '../server-notebook';
import { SvgData,PngData } from '../../client/math-tablet-api';

const svg2img = require('svg2img');
// const fs = require('fs')

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// Constants
// A green square for debugging
// var svgString = [
//     '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="236" height="120" ',
//     'viewBox="0 0 236 120">',
//     '<rect x="14" y="23" width="200" height="50" fill="#55FF55" stroke="black" stroke-width="1" />',
//     '</svg>'
//   ].join('');

// const svgExample = [
//   '<svg height="1in" width="6.5in" fill="none" stroke="red" stroke-width="5" >',
//   '<path d="M75.37,69.74l0.52,0l3.29,0l3.29,0l3.29,0l6.63,0l3.93,0l7.32,-2.16l5.36,-1.46l9.24,-1.85l3.93,-1.31l7.04,-2.14l2.7,-1.16l3.84,-1.06l2.16,-0.72l3.35,-1.35l1.34,-1.01l2.17,-1.56l1,-1.35l1.29,-2.2l0.33,-1.68l0.31,-1.24l0.31,-2.49l0,-1.24l0,-2.49l-0.34,-1.68l-2.4,-2.61l-1.35,-1.35l-2.59,-1.63l-1.68,-1.01l-2.92,-1.3l-0.86,0l-2.92,-0.34l-2.71,0l-3.85,0l-2.17,0l-3.41,-0.36l-2.17,0.72l-2.92,1.29l-1.24,0.62l-0.78,1.04l0,0.85l0,0.85l0,1.37l0.31,1.24l2.68,2.68l1,1.34l3.15,2.45l2.88,2.06l3.17,2.11l2.32,1.54l3.35,2.01l1.68,0.67l3.84,1.03l1.68,0.33l3.35,0.33l3.29,0l3.84,0l3.29,0l4.38,-0.39l3.93,-0.44l6.58,-0.41l3.93,0l7.86,0l3.93,0l1.68,0l9.29,0l2.7,0l6.58,0l3.29,-0.41l3.93,-0.44l0,0"></path>',
//     '</svg>'
//    ].join('');


// Exported Class

export class SvgToPngObserver extends BaseObserver {

  // --- OVERRIDES ---

  protected get rules(): Rules { return SvgToPngObserver.RULES; }

  // --- PUBLIC ---

  public static async onOpen(notebook: ServerNotebook): Promise<SvgToPngObserver> {
    debug(`Opening StrokeObserver for ${notebook._path}.`);
    return new this(notebook);
  }

  // --- PRIVATE ---

  // Private Class Constants

  private static RULES: Rules = [
    {
      name: "svg-to-png",
      peerStyleTest: { role: 'REPRESENTATION', type: 'SVG' },
      props: { role: 'REPRESENTATION', subrole: 'ALTERNATE', type: 'PNG-BUFFER' },
      computeAsync: SvgToPngObserver.ruleConvertSvgToPng,
    },
  ];

  // Private Class Methods



  private static async ruleConvertSvgToPng(data: SvgData): Promise<PngData|undefined> {
    // from : https://stackoverflow.com/questions/5010288/how-to-make-a-function-wait-until-a-callback-has-been-called-using-node-js
    // myFunction wraps the above API call into a Promise
    // and handles the callbacks with resolve and reject
    function apiFunctionWrapper(data: string) : Promise<Buffer> {
      // @ts-ignore
      return new Promise((resolve, reject) => {
        // @ts-ignore
        svg2img(data,function(error, buffer) {
          resolve(buffer);
        });
      });
    };

    if (data) {
      try {
        console.log("svg data:",data);
        const b: Buffer = await apiFunctionWrapper(data);
        return b;
      } catch (e) {
        console.error("Something went wrong in svg conversiong:", e);
        return;
      }
    }
    return ;
  }

// Private Constructor

protected constructor(notebook: ServerNotebook) { super(notebook); }

}

// HELPER FUNCTIONS
