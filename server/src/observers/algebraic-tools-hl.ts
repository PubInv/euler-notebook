/*
  Math Tablet
  Copyright (C) 2019 Public Invention
  https://pubinv.github.io/PubInv/

  This program is free software: you can redistribute it and/or modify
  oit under the terms of the GNU Affero General Public License as published by
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
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

import { Html } from "../shared/common";
import { FormulaData, PlainTextMath } from "../shared/formula";
import {
  StyleObject, WolframExpression
} from "../shared/notebook";
import {
  ToolData, NotebookChangeRequest, StyleInsertRequest, StylePropertiesWithSubprops,
  TransformationToolData,TexExpression,
} from "../shared/math-tablet-api";
import { AsyncComputeFunction, AsyncRule, AsyncRules, BaseObserver, StyleRelation, SyncRules } from "./base-observer";


import { ServerNotebook, ObserverInstance } from "../server-notebook";
import { execute,
         convertWolframToMTL,
         convertMTLToTeX
       } from "../adapters/wolframscript";
import { Config } from "../config";
import { CellType } from "../shared/cell";

// Types

// Exported Class

export class AlgebraicToolsObserverHL extends BaseObserver {

  // --- OVERRIDES ---
  protected get asyncRules(): AsyncRules { return AlgebraicToolsObserverHL.ASYNC_RULES; }
  protected get syncRules(): SyncRules { return AlgebraicToolsObserverHL.SYNC_RULES; }

  // Class Methods

  public static async initialize(_config: Config): Promise<void> {
    debug(`initialize`);
  }

  public static async onOpen(notebook: ServerNotebook): Promise<ObserverInstance> {
    debug(`onOpen`);
    return new this(notebook);
  }

  // Instance Methods
    // Private Class Properties

  // Private Constructor

  protected constructor(notebook: ServerNotebook) { super(notebook); }

  // --- PRIVATE ---

  // Private Class Constants

  private static ASYNC_RULES: AsyncRules = [
    { name: "FactorRule", compute: AlgebraicToolsObserverHL.prototype.addFactorRule },
    { name: "ExpandRule", compute: AlgebraicToolsObserverHL.prototype.addExpandRule },
    { name: "ExpandAllRule", compute: AlgebraicToolsObserverHL.prototype.addExpandAllRule },
    { name: "SimplifyRule", compute: AlgebraicToolsObserverHL.prototype.addSimplifyRule },
    { name: "CancelRule", compute: AlgebraicToolsObserverHL.prototype.addCancelRule },
    { name: "TogetherRule", compute: AlgebraicToolsObserverHL.prototype.addTogetherRule },
    { name: "ApartRule", compute: AlgebraicToolsObserverHL.prototype.addApartRule },
  ].map((param: { name: string, compute: AsyncComputeFunction }): AsyncRule => ({
    name: param.name,
    styleTest: { role: 'EVALUATION', type: 'WOLFRAM-EXPRESSION' },
    styleRelation: StyleRelation.PeerToPeer,
    props: { role: 'ATTRIBUTE', type: 'TOOL-DATA' },
    compute: param.compute,
  }));

  private static SYNC_RULES: SyncRules = [];

  private async addFactorRule(style: StyleObject): Promise<ToolData|undefined> {
    return this.addTool(style,
                       <WolframExpression>"InputForm[Factor[${expr}]]",
                       "factor",
                       (s : string) => <Html>`Factor: ${s}`,
                        (s : string) => <TexExpression>`\\text{Factor: } ${s}`);
  }
  private async addExpandRule(style: StyleObject): Promise<ToolData|undefined> {
    return this.addTool(style,
                       <WolframExpression>"InputForm[Expand[${expr}]]",
                       "expand",
                       (s : string) => <Html>`Expand: ${s}`,
                       (s : string) => <TexExpression>`\\text{Expand: } ${s}`);
  }
  private async addExpandAllRule(style: StyleObject): Promise<ToolData|undefined> {
    return this.addTool(style,
                       <WolframExpression>"InputForm[ExpandAll[${expr}]]",
                       "expand all",
                       (s : string) => <Html>`ExpandAll: ${s}`,
                       (s : string) => <TexExpression>`\\text{ExpandAll: } ${s}`);
  }
  private async addSimplifyRule(style: StyleObject): Promise<ToolData|undefined> {
    return this.addTool(style,
                       <WolframExpression>"InputForm[Simplify[${expr}]]",
                       "simplify",
                       (s : string) => <Html>`Simplify: ${s}`,
                       (s : string) => <TexExpression>`\\text{Simplify: } ${s}`);
  }
  private async addCancelRule(style: StyleObject): Promise<ToolData|undefined> {
    return this.addTool(style,
                       <WolframExpression>"InputForm[Cancel[${expr}]]",
                       "cancel",
                       (s : string) => <Html>`Cancel: ${s}`,
                       (s : string) => <TexExpression>`\\text{Cancel: } ${s}`);
  }
  private async addTogetherRule(style: StyleObject): Promise<ToolData|undefined> {
    return this.addTool(style,
                       <WolframExpression>"InputForm[Together[${expr}]]",
                       "together",
                       (s : string) => <Html>`Together: ${s}`,
                       (s : string) => <TexExpression>`\\text{Together: } ${s}`);
  }
  private async addApartRule(style: StyleObject): Promise<ToolData|undefined> {
    return this.addTool(style,
                       <WolframExpression>"InputForm[Apart[${expr}]]",
                       "apart",
                       (s : string) => <Html>`Apart: ${s}`,
                       (s : string) => <TexExpression>`\\text{Apart: } ${s}`);
  }

  public async useTool(toolStyle: StyleObject): Promise<NotebookChangeRequest[]> {
//    debug(`useTool ${this.notebook.path} ${toolStyle.id}`);

    const toolData: ToolData = toolStyle.data;
    const transformationData: TransformationToolData = toolData.data;

    // We made a design decision that the relationship
    // is from top level formula and to top level formula

    debug("xxx",toolData);

    const toId = this.notebook.reserveId();

    debug("toolData.output", transformationData.output);

    const formulaData: FormulaData = {
      type: CellType.Formula,
      height: 72, // points
      plainTextMath: <PlainTextMath>transformationData.output,
    };
    const styleProps: StylePropertiesWithSubprops = {
      id: toId,
      role: 'FORMULA',
      type: 'FORMULA-DATA',
      data: formulaData,
    };

    const changeReq: StyleInsertRequest = {
      type: 'insertStyle',
      // TODO: afterId should be ID of subtrivariate.
      styleProps,
    };

    return [ changeReq ];
  }

  private effectiveEqual(a : string,b :string) : boolean {
    const ae = a.replace( / \r?\n|\r/g,"");
    const be = b.replace( / \r?\n|\r/g,"");
    return ae === be;
  }
  private async addTool(style: StyleObject,
                        transformation: WolframExpression,
                        name: string,
                        html_fun: (s: string) => Html,
                        tex_fun: (s: string) => TexExpression) :
  Promise<ToolData|undefined> {
    const data = <WolframExpression>style.data;
    const input = <WolframExpression>transformation.replace('${expr}', data);
    debug("TOOL EXPR",input);

    const output = await execute(input);
    if (this.effectiveEqual(output,data)) { // nothing interesting to do!
      return undefined;
    }

    // WARNING: I'm producing LaTeX here, but I am not handling variable
    // substitutions or changes. This will likely not work very well
    // in the presence of those things.  However, this will let DEJ do
    // some rendering work on the tool side immediately. I will have to
    // come back in and handle this more complete later. - rlr

    const output_mtl = convertWolframToMTL(output);
    const tex_f : string = await convertMTLToTeX(output_mtl);

        debug("output_mtl",output_mtl);

    // (Actually we want to put the LaTeX in here, but that is a separate step!
    const tdata = { output: output_mtl,
                   transformation: transformation,
                   transformationName: name };
    const toolData: ToolData = { name: name,
                                 html: html_fun(output_mtl),
                                 tex: tex_fun(tex_f),
                                 data: tdata,
                                 origin_id: style.id
                               };
    return toolData;
  }

}
