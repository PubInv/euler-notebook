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
import {
  StyleType,NotebookChange, StyleObject, RelationshipProperties, HintData, HintRelationship,
  HintStatus, FormulaData, WolframExpression, MTLExpression
} from "../shared/notebook";
import {
  ToolData, NotebookChangeRequest, StyleInsertRequest, StyleDeleteRequest, StylePropertiesWithSubprops,
  TransformationToolData,RelationshipInsertRequest, TexExpression,
} from "../shared/math-tablet-api";


import { ServerNotebook, ObserverInstance } from "../server-notebook";
import { execute,
         convertWolframToMTL,
         convertMTLToTeX
       } from "../adapters/wolframscript";
import { Config } from "../config";
import { notebookSynopsis } from "../debug-synopsis";

// Types

// Exported Class

export class AlgebraicToolsObserver implements ObserverInstance {

  // Class Methods

  public static async initialize(_config: Config): Promise<void> {
    debug(`initialize`);
  }

  public static async onOpen(notebook: ServerNotebook): Promise<ObserverInstance> {
    debug(`onOpen`);
    return new this(notebook);
  }

  // Instance Methods

  public async onChangesAsync(changes: NotebookChange[]): Promise<NotebookChangeRequest[]> {
//    debug(`onChanges ${changes.length}`);
    const rval: NotebookChangeRequest[] = [];
    for (const change of changes) {
      await this.onChange(change, rval);
    }
//    debug(`onChanges returning ${rval.length} changes.`);
    return rval;
  }

  public onChangesSync(_changes: NotebookChange[]): NotebookChangeRequest[] {
    return [];
  }

  public onClose(): void {
    debug(`onClose ${this.notebook.path}`);
  }

  // TODO: This is a direct duplicate code in symbol-classifier.ts
  // that duplication must be removed.
  public async useTool(toolStyle: StyleObject): Promise<NotebookChangeRequest[]> {
//    debug(`useTool ${this.notebook.path} ${toolStyle.id}`);

    const toolData: ToolData = toolStyle.data;
    const transformationData: TransformationToolData = toolData.data;

    //    const fromId = toolData.origin_id!;

    // We made a design decision that the relationship
    // is from top level formula and to top level formula

    debug("xxx",toolData);

    const origin_top = this.notebook.topLevelStyleOf(toolData.origin_id!);
    var fromId : number;
    debug("origin_top",origin_top);
    if (origin_top.role == 'FORMULA' && origin_top.type == 'FORMULA-DATA') {
      fromId = origin_top.id;
    } else {
      debug("notebook", notebookSynopsis(this.notebook));
      fromId = this.notebook.findStyle({role: 'FORMULA', type: 'FORMULA-DATA',recursive: true },
                               origin_top!.id)!.id;
    }

    const toId = this.notebook.reserveId();
    const hintId = this.notebook.reserveId();
    const relId = this.notebook.reserveId();

    const data: HintData = {
      relationship: HintRelationship.Equivalent,
      status: HintStatus.Correct,
      idOfRelationshipDecorated: relId
    };

    // TODO: "Input" doesn't see like right place for Hint string unless Hint text came from user.
    const hintProps: StylePropertiesWithSubprops = {
      role: 'HINT', type: 'HINT-DATA', data,
      id: hintId,
      subprops: [
        { role: 'INPUT', type: 'PLAIN-TEXT', data: `From ${toolData.name}` },
      ]
    };
    const hintReq: StyleInsertRequest = {
      type: 'insertStyle',
      // TODO: afterId should be ID of subtrivariate.
      styleProps: hintProps,
    };

    // I believe the "id" in relationsFrom is not working below!!!
    // const styleProps: StylePropertiesWithSubprops = {
    //   role: 'FORMULA',
    //   type: 'FORMULA-DATA',
    //   data: { wolframData: toolData.output },
    //   relationsFrom: {
    //     [fromId]: { role: 'TRANSFORMATION',
    //                 data: toolData,
    //                 id: relId },
    //   }
    // };

    debug("toolData.output", transformationData.output);

    const formulaData: FormulaData = { wolframData: <MTLExpression>transformationData.output };
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

    const relProps : RelationshipProperties =
      { role: 'TRANSFORMATION',
        data: transformationData.transformation, // Change this to Wolfram expression
        dataflow: true,
        id: relId,
        logic: HintRelationship.Equivalent,
        status: HintStatus.Correct,
      };

    const relReq: RelationshipInsertRequest =
      { type: 'insertRelationship',
        fromId,
        toId,
        inStyles: [
                    { role: 'INPUT-FORMULA', id: fromId},
                    { role: 'TRANSFORMATION-TOOL', id: toolStyle.id}
                  ],
        outStyles: [
                     { role: 'OUTPUT-FORMULA', id: toId},
                     { role: 'TRANSFORMATION-HINT', id: hintId}
                   ],
        props: relProps };

    return [ hintReq, changeReq, relReq ];
  }

  // --- PRIVATE ---

  // Private Constructor

  private constructor(notebook: ServerNotebook) {
    this.notebook = notebook;
  }

  // Private Instance Properties

  private notebook: ServerNotebook;

  // Private Instance Methods

  private async onChange(change: NotebookChange, rval: NotebookChangeRequest[]): Promise<void> {
//    debug(`onChange ${this.notebook.path} ${change.type}`);
    switch (change.type) {
      case 'styleInserted': {
        await this.algebraicToolsStyleInsertRule(change.style, rval);
        break;
      }
      case 'styleChanged': {
        //        await this.algebraicToolsStyleChangeRule(change.style, rval);
        break;
      }
        // case 'relationshipInserted':
        //   await this.algebraicToolsChangedRule(change.relationship, rval);
        //   break;
        // case 'relationshipDeleted':
        //   await this.algebraicToolsChangedRule(change.relationship, rval);
        //   break;
      default: break;
    }
  }

  private effectiveEqual(a : string,b :string) : boolean {
    const ae = a.replace( / \r?\n|\r/g,"");
    const be = b.replace( / \r?\n|\r/g,"");
    return ae === be;
  }
  private async addTool(style : StyleObject,
                        rval: NotebookChangeRequest[],
                        transformation: WolframExpression,
                        name: string,
                        html_fun: (s: string) => Html,
                        tex_fun: (s: string) => TexExpression) :
  Promise<void> {

    const input = <WolframExpression>transformation.replace('${expr}', style.data);
    debug("TOOL EXPR",input);

    const output = await execute(input);
    if (this.effectiveEqual(output,style.data)) { // nothing interesting to do!
      return;
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
    const data = { output: output_mtl,
                   transformation: transformation,
                   transformationName: name };
    const toolData: ToolData = { name: name,
                                 html: html_fun(output_mtl),
                                 tex: tex_fun(tex_f),
                                 data,
                                 origin_id: style.id};
    const styleProps2: StylePropertiesWithSubprops = {
      type: 'TOOL-DATA',
      role: 'ATTRIBUTE',
      data: toolData,
    }
    const changeReq2: StyleInsertRequest = {
      type: 'insertStyle',
      parentId: style.id,
      styleProps: styleProps2
    };
    rval.push(changeReq2);
  }

  // This will be needed soon, but is not in use now - rlr
  // @ts-ignore
  private removeAllOffspringOfType(obj: StyleObject,
                                   rval: NotebookChangeRequest[], typeToRemove: StyleType) {
    const kids : StyleObject[] =
      this.notebook.findStyles({ type: typeToRemove, recursive: true }, obj.id);
    kids.forEach(k => {
      const changeReq: StyleDeleteRequest = {
        type: 'deleteStyle',
        styleId: k.id
      };
      rval.push(changeReq);
    });

  }

  private async algebraicToolsStyleInsertRule(style: StyleObject, rval: NotebookChangeRequest[]): Promise<void> {

    if (style.type != 'WOLFRAM-EXPRESSION' || style.role != 'EVALUATION') { return; }

    // TODO: collect these strings in some way so that
    // if they are duplicates (which happens often), we add only
    // one tool for them.
    await this.addTool(style,rval,
                       <WolframExpression>"InputForm[Factor[${expr}]]",
                       "factor",
                       (s : string) => <Html>`Factor: ${s}`,
                       (s : string) => <TexExpression>`\\text{Expand: } ${s}`);
    await this.addTool(style,rval,
                       <WolframExpression>"InputForm[Expand[${expr}]]",
                       "expand",
                       (s : string) => <Html>`Expand: ${s}`,
                       (s : string) => <TexExpression>`\\text{Expand: } ${s}`);
    await this.addTool(style,rval,
                       <WolframExpression>"InputForm[ExpandAll[${expr}]]",
                       "expand all",
                       (s : string) => <Html>`ExpandAll: ${s}`,
                       (s : string) => <TexExpression>`\\text{ExpandAll: } ${s}`);
    await this.addTool(style,rval,
                       <WolframExpression>"InputForm[Simplify[${expr}]]",
                       "simplify",
                       (s : string) => <Html>`Simplify: ${s}`,
                       (s : string) => <TexExpression>`\\text{Simplify: } ${s}`);
    await this.addTool(style,rval,
                       <WolframExpression>"InputForm[Cancel[${expr}]]",
                       "cancel",
                       (s : string) => <Html>`Cancel: ${s}`,
                       (s : string) => <TexExpression>`\\text{Cancel: } ${s}`);
    await this.addTool(style,rval,
                       <WolframExpression>"InputForm[Together[${expr}]]",
                       "together",
                       (s : string) => <Html>`Together: ${s}`,
                       (s : string) => <TexExpression>`\\text{Together: } ${s}`);
    await this.addTool(style,rval,
                       <WolframExpression>"InputForm[Apart[${expr}]]",
                       "apart",
                       (s : string) => <Html>`Apart: ${s}`,
                       (s : string) => <TexExpression>`\\text{Apart: } ${s}`);
  }

  // This is a mechanism of calling the function
  // that we hope to call from the more abstract API.
  // It is therefore a temporary scaffold.
  // TODO: REMOVE
  // @ts-ignore
  private async fakeDataFlowStyleChangeRule(style: StyleObject, rval: NotebookChangeRequest[]): Promise<void> {

    // Possibly if we are not an evaluation we should do something else,
    // like a simple recalculcaiton, but I will delay that.
    debug("XXXXXXXXXX style",style);
    if (style.role != 'EVALUATION') {
      return;
    } else {



      // The relationship will be tied to the Representation

      // I think all of the above is correct, but now we wish to see
      // if any relationships against that force us to
      // First, we want to find all TRANSFORM relations that have
      // a To clause mathing this style. They must be marked unverified.

      // Transformation relationships appear to be between top level styles...
      // We have to find based on the top level formula
      // WARNING UGLY HACK CODE (DUPLICATION OF ABOVE)
      const origin_top = this.notebook.topLevelStyleOf(style.id);

      // It is unclear how we will handle the changes of the tools
      // in this case, which still must be accomplished.
      // I believe this will require separate action...
      this.removeAllOffspringOfType(origin_top,rval,'TOOL-DATA');

      await this.algebraicToolsStyleInsertRule(style, rval);

    }
  }
}
