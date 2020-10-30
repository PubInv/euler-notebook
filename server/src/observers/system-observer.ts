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

import debug1 from "debug";

import { CssClass, PlainText, SvgMarkup, escapeHtml, stackTrace } from "../shared/common";
import { Stroke, StrokeData } from "../shared/stylus";
import { StyleObject } from "../shared/notebook";
import { TexExpression } from "../shared/math-tablet-api";

import { convertTexToSvg } from "../adapters/mathjax";
import { logWarning } from "../error-handler";
import { ServerNotebook } from "../server-notebook";

import { AsyncRules, BaseObserver, StyleRelation, SyncRules } from "./base-observer";

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// Constants

// Exported Class

export class SystemObserver extends BaseObserver {

  // --- OVERRIDES ---

  protected get asyncRules(): AsyncRules { return SystemObserver.ASYNC_RULES; }
  protected get syncRules(): SyncRules { return SystemObserver.SYNC_RULES; }

  // --- PUBLIC ---

  public static async onOpen(notebook: ServerNotebook): Promise<SystemObserver> {
    debug(`Opening SvgObserver for ${notebook.path}.`);
    return new this(notebook);
  }

  // --- PRIVATE ---

  // Private Class Constants

  private static ASYNC_RULES: AsyncRules = [];

  private static SYNC_RULES: SyncRules = [
    {
      debug: true,
      name: "convertStrokesToSvgRule",
      styleTest: { role: 'INPUT', type: 'STROKE-DATA' },
      styleRelation: StyleRelation.ParentToChild,
      props: { role: 'REPRESENTATION', type: 'SVG-MARKUP' },
      compute: SystemObserver.prototype.convertStrokesToSvgRule,
    },
    {
      name: "convertPlainTextToSvgRule",
      styleTest: { role: 'INPUT', type: 'PLAIN-TEXT' },
      styleRelation: StyleRelation.PeerToPeer,
      props: { role: 'REPRESENTATION', type: 'SVG-MARKUP' },
      compute: SystemObserver.prototype.convertPlainTextToSvgRule,
    },
    {
      // REVIEW: Move this to TeX observer?
      name: "convertTexToSvgRule",
      styleTest: { role: 'REPRESENTATION', type: 'TEX-EXPRESSION' },
      styleRelation: StyleRelation.PeerToPeer,
      props: { role: 'REPRESENTATION', type: 'SVG-MARKUP' },
      compute: SystemObserver.prototype.convertTexToSvgRule,
    },
  ];

  // Private Instance Methods

  private convertPlainTextToSvgRule(style: StyleObject): SvgMarkup {
    // TODO: Proper font
    // TODO: Wrap text
    // TODO: Line breaks matching those put into the input textarea
    const text: PlainText = style.data;
    debug(`convertPlainTextToSvgRule on: "${text.length>30 ? `${text.slice(0,30)}...`: text}".`);
    return <SvgMarkup>`<svg class="displayPanel" height="1in" width="6.5in" fill="none" stroke="black"><text x="20" y="20">${escapeHtml(text)}</text></svg>`;
  }

  private convertStrokesToSvgRule(style: StyleObject): SvgMarkup|undefined {
    const data: StrokeData = style.data;
    debug(`convertStrokesToSvgRule on ${JSON.stringify(data)}`);
    console.log(stackTrace());
    const paths: string[] = [];
    for (const strokeGroup of data.strokeGroups) {
      for (const stroke of strokeGroup.strokes) {
        const path = convertStrokeToPath(stroke);
        paths.push(path);
      }
    }
    const svgMarkup = <SvgMarkup>`<svg class="svgPanel" height="${data.size.height}" width="${data.size.width}" fill="none" stroke="black">${paths.join('')}</svg>`;
    debug(`convertDrawingToSvgRule returns '${svgMarkup}'`);
    return svgMarkup;
  }

  private convertTexToSvgRule(style: StyleObject): SvgMarkup {
    const tex: TexExpression = style.data;
    debug(`convertTexToSvgRule on: ${tex}`);
    return convertTexToSvg(tex, <CssClass>'displayPanel');
  }


  // Private Constructor

  protected constructor(notebook: ServerNotebook) { super(notebook); }

}

// HELPER FUNCTIONS

function convertStrokeToPath(stroke: Stroke): string {
  if (stroke.x.length<2) {
    logWarning(MODULE, `Have a stroke with too few data points: ${stroke.x.length}`)
    return "";
  }
  let dAttribute = `M${stroke.x[0]} ${stroke.y[0]}`;
  for (let i=1; i<stroke.x.length; i++) {
    dAttribute += ` L${stroke.x[i]} ${stroke.y[i]}`
  }
  return `<path d="${dAttribute}"></path>`;
}
