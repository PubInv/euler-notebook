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

import { BaseObserver, Rules, StyleRelation } from './base-observer';
import { ServerNotebook } from '../server-notebook';
import { SvgData } from '../shared/math-tablet-api';
import { Stroke, DrawingData } from '../shared/notebook';

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// Constants

// Exported Class

export class SvgObserver extends BaseObserver {

  // --- OVERRIDES ---

  protected get rules(): Rules { return SvgObserver.RULES; }

  // --- PUBLIC ---

  public static async onOpen(notebook: ServerNotebook): Promise<SvgObserver> {
    debug(`Opening SvgObserver for ${notebook._path}.`);
    return new this(notebook);
  }

  // --- PRIVATE ---

  // Private Class Constants

  private static RULES: Rules = [
    {
      name: "strokes-to-svg",
      styleTest: { role: 'INPUT', type: 'STROKE-DATA' },
      styleRelation: StyleRelation.PeerToPeer,
      props: { role: 'REPRESENTATION', type: 'SVG-MARKUP' },
      computeSync: SvgObserver.convertDrawingToSvgRule,
    },
  ];

  // Private Class Methods

  private static convertDrawingToSvgRule(data: DrawingData): SvgData|undefined {
    debug(`convertDrawingToSvg rule on ${JSON.stringify(data)}`);
    const paths: string[] = [];
    for (const strokeGroup of data.strokeGroups) {
      for (const stroke of strokeGroup.strokes) {
        const path = convertStrokeToPath(stroke);
        paths.push(path);
      }
    }
    const svgMarkup = `<svg class="svgPanel" height="${data.size.height}" width="${data.size.width}"  fill="none" stroke="black">${paths.join('')}</svg>`;
    debug(`convertDrawingToSvg rule returns '${svgMarkup}'`);
    return svgMarkup;
  }

  // Private Constructor

  protected constructor(notebook: ServerNotebook) { super(notebook); }

}

// HELPER FUNCTIONS

function convertStrokeToPath(stroke: Stroke): string {
  if (stroke.x.length<2) {
    console.warn(`Have a stroke with too few data points: ${stroke.x.length}`)
    return "";
  }
  let dAttribute = `M${stroke.x[0]} ${stroke.y[0]}`;
  for (let i=1; i<stroke.x.length; i++) {
    dAttribute += ` L${stroke.x[i]} ${stroke.y[i]}`
  }
  return `<path d="${dAttribute}"></path>`;
}
