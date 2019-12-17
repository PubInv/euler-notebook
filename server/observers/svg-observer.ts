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
import { SvgData } from '../../client/math-tablet-api';
import { Stroke, DrawingData } from '../../client/notebook';

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// Constants

// Exported Class

export class SvgObserver extends BaseObserver {

  // --- OVERRIDES ---

  protected get rules(): Rules { return SvgObserver.RULES; }

  // --- PUBLIC ---

  public static async onOpen(notebook: ServerNotebook): Promise<SvgObserver> {
    debug(`Opening StrokeObserver for ${notebook._path}.`);
    return new this(notebook);
  }

  // --- PRIVATE ---

  // Private Class Constants

  private static RULES: Rules = [
    {
      name: "strokes-to-svg",
      peerStyleTest: { role: 'REPRESENTATION', type: 'STROKES' },
      props: { role: 'REPRESENTATION', subrole: 'ALTERNATE', type: 'SVG' },
      computeSync: SvgObserver.ruleConvertDrawingToSvg,
    },
  ];

  // Private Class Methods

  private static ruleConvertDrawingToSvg(data: DrawingData): SvgData|undefined {
    const paths: string[] = [];
    for (const strokeGroup of data.strokeGroups) {
      for (const stroke of strokeGroup.strokes) {
        const path = convertStrokeToPath(stroke);
        paths.push(path);
      }
    }
    return `<svg height="${data.size.height}" width="${data.size.width}"  fill="none" stroke="black">${paths.join('')}</svg>`;
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
