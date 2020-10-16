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

import { StrokeData } from "../shared/notebook";
import { TexExpression } from "../shared/math-tablet-api";

import { Config } from "../config";
import { ServerKeys, postLatexRequest } from "../adapters/myscript";
import { ServerNotebook }  from "../server-notebook";

import { AsyncRules, BaseObserver, StyleRelation, SyncRules } from "./base-observer";

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// Types

// Exported Class

export class MyScriptObserver extends BaseObserver {

  // --- OVERRIDES ---

  protected get asyncRules(): AsyncRules { return MyScriptObserver.ASYNC_RULES; }
  protected get syncRules(): SyncRules { return MyScriptObserver.SYNC_RULES; }

  // --- PUBLIC ---

  public static async initialize(_config: Config, keys: ServerKeys): Promise<void> {
    debug(`Initialize: ${keys.applicationKey}/${keys.hmacKey}`);
    this.keys = keys;
}

  public static async onOpen(notebook: ServerNotebook): Promise<MyScriptObserver> {
    debug(`Opening MyScriptObserver for ${notebook.path}.`);
    return new this(notebook);
  }

  // --- PRIVATE ---

  // Private Class Constants

  private static ASYNC_RULES: AsyncRules = [
    {
      // TODO: Only recognize input on "formula" ink cells.
      name: "strokes-to-latex",
      styleTest: { role: 'INPUT', type: 'STROKE-DATA' },
      styleRelation: StyleRelation.PeerToPeer,
      props: { role: 'REPRESENTATION', type: 'TEX-EXPRESSION' },
      compute: MyScriptObserver.prototype.convertStrokesToLatexRule,
    },
  ];

  private static SYNC_RULES: SyncRules = [];

  // Private Class Properties

  private static keys: ServerKeys;

  // Private Instance Methods

  private async convertStrokesToLatexRule(data: StrokeData): Promise<TexExpression> {
    // TODO: Prevent multiple calls to MyScript at the same time. "serialze" flag on rule?
    // TODO: Gather up multiple changes that occur with a series of strokes, rather than stroke by stroke.
    debug("Converting strokes to TexExpression");
    const rval = await postLatexRequest(MyScriptObserver.keys, data.strokeGroups);
    debug(`Recognized TeX: ${rval}`);
    return rval;
  }

  // Private Constructor

  protected constructor(notebook: ServerNotebook) { super(notebook); }

}
