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

import * as debug1 from 'debug';
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

import {
  StyleType,NotebookChange, StyleObject, RelationshipProperties, HintData, HintRelationship,
  HintStatus, FormulaData, WolframExpression
} from '../shared/notebook';
import {
  ToolData, NotebookChangeRequest, StyleInsertRequest, StyleDeleteRequest, StylePropertiesWithSubprops,
  TransformationToolData,RelationshipInsertRequest,
} from '../shared/math-tablet-api';

// import {
//   DataflowStatus,
//   DataflowValue
// } from '../../server/observers/dataflow-observer';

import { ServerNotebook, ObserverInstance } from '../server-notebook';
import { execute,  convertWolframToTeX} from '../wolframscript';
import { Config } from '../config';

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

  public async onClose(): Promise<void> {
    debug(`onClose ${this.notebook.path}`);
    delete this.notebook;
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
      debug("notebook",this.notebook.toText());
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

    const formulaData: FormulaData = { wolframData: transformationData.output };
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
                        html_fun: (s: string) => string,
                        tex_fun: (s: string) => string) :
  Promise<void> {
    //    const f = await this.factor(style.data);
    const input = transformation.replace('${expr}', style.data);
    const output = await execute(input);
    if (this.effectiveEqual(output,style.data)) { // nothing interesting to do!
      return;
    }

    // WARNING: I'm producing LaTeX here, but I am not handling variable
    // substitutions or changes. This will likely not work very well
    // in the presence of those things.  However, this will let DEJ do
    // some rendering work on the tool side immediately. I will have to
    // come back in and handle this more complete later. - rlr

    const tex_f : string = await convertWolframToTeX(output);

    // (Actually we want to put the LaTeX in here, but that is a separate step!
    const data = { output, transformation, transformationName: name };
    const toolData: ToolData = { name: name,
                                 html: html_fun(output),
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

  // private checkUserInputChangeRule(style: StyleObject, rval: NotebookChangeRequest[]) : void {
  //   if (style.role == 'REPRESENTATION') {
  //     debug("found Representation change!");
  //     // This means the user changed it, I am not sure the
  //     // GUI is correctly updateing types in this case!
  //     // It seems that the SOURCE should change to USER-DATA

  //     const relOp : FindRelationshipOptions = {
  //       toId: style.id,
  //       role: 'TRANSFORMATION' };

  //     const relsInPlace : RelationshipObject[] = this.notebook.findRelationships(relOp);
  //     relsInPlace.forEach( r => {
  //       const rdr : RelationshipDeleteRequest = {
  //         type: 'deleteRelationship',
  //         id: r.id,
  //       };
  //       rval.push(rdr);
  //       // Now the Hint associated with these must be invalidated.
  //       const kids : StyleObject[] =
  //         this.notebook.findStyles({ role: 'HINT', type: 'HINT-DATA', source: 'ALGEBRAIC-TOOLS', recursive: true });
  //       kids.forEach(k => {
  //         if (k. == r.id) {
  //           const changeReq: StyleDeleteRequest = {
  //             type: 'deleteStyle',
  //             styleId: k.id
  //           };
  //           console.log("deleting: ",k);
  //           rval.push(changeReq);
  //         }
  //       });

  //     });
  //   }
  // }

  private async algebraicToolsStyleInsertRule(style: StyleObject, rval: NotebookChangeRequest[]): Promise<void> {

    if (style.type != 'WOLFRAM-EXPRESSION' || style.role != 'EVALUATION') { return; }

    // TODO: collect these strings in some way so that
    // if they are duplicates (which happens often), we add only
    // one tool for them.
    await this.addTool(style,rval,
                       "InputForm[Factor[${expr}]]",
                       "factor",
                       (s : string) => `Factor: ${s}`,
                       (s : string) => `\\text{Expand: } ${s}`);
    await this.addTool(style,rval,
                       "InputForm[Expand[${expr}]]",
                       "expand",
                       (s : string) => `Expand: ${s}`,
                       (s : string) => `\\text{Expand: } ${s}`);
    await this.addTool(style,rval,
                       "InputForm[ExpandAll[${expr}]]",
                       "expand all",
                       (s : string) => `ExpandAll: ${s}`,
                       (s : string) => `\\text{ExpandAll: } ${s}`);
    await this.addTool(style,rval,
                       "InputForm[Simplify[${expr}]]",
                       "simplify",
                       (s : string) => `Simplify: ${s}`,
                       (s : string) => `\\text{Simplify: } ${s}`);
    await this.addTool(style,rval,
                       "InputForm[Cancel[${expr}]]",
                       "cancel",
                       (s : string) => `Cancel: ${s}`,
                       (s : string) => `\\text{Cancel: } ${s}`);
    await this.addTool(style,rval,
                       "InputForm[Together[${expr}]]",
                       "together",
                       (s : string) => `Together: ${s}`,
                       (s : string) => `\\text{Together: } ${s}`);
    await this.addTool(style,rval,
                       "InputForm[Apart[${expr}]]",
                       "apart",
                       (s : string) => `Apart: ${s}`,
                       (s : string) => `\\text{Apart: } ${s}`);
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

      // var fromId : number;
      // if (origin_top.role == 'FORMULA' && origin_top.type == 'FORMULA-DATA') {
      //   fromId = origin_top.id;
      // } else {
      //   fromId = this.notebook.findStyle({role: 'FORMULA', type: 'FORMULA-DATA',recursive: true },
      //                                    origin_top!.id)!.id;
      // }
      // const relOp : FindRelationshipOptions = {
      //   fromId: fromId,
      //   role: 'TRANSFORMATION' };


      // const relsInPlace : RelationshipObject[] = this.notebook.findRelationships(relOp);

      // for(var i = 0; i < relsInPlace.length; i++) {
      //   var r = relsInPlace[i];
      //   // We have a bug unrelated to this code (I think) where by old
      //   // relationships are not being removed. I therefore check validity here;
      //   // but we must track down how this is coming about.
      //   if (!this.notebook.hasStyle({},r.toId)
      //       ||
      //       !this.notebook.hasStyle({},r.fromId)
      //      ) {
      //     debug("Discarding relation: ", r);
      //     console.error("Found invalid relation: ",r);
      //     continue;
      //   }


      //   // We will call dependentChangeRule once for each
      //   // relation r. We artificially now construct input values.
      //   // Using special knowledge of this transform, this is easy enough.
      //   var dfv : DataflowValue[] = [];
      //   // First is the formula
      //   debug("DATA DATA DATA",style);
      //   dfv.push({ status: DataflowStatus.Changed,
      //              message: 'CHANGED',
      //              value: style.data });

      //   // Second is the Tool/Transform
      //   dfv.push({ status: DataflowStatus.Changed,
      //              message: 'UNCHANGED',
      //              value: r.data });

      //   const result = await this.dependentChangeRule(r,dfv);
      //   // We now may enter a request change for the second formula and hint

      //   const cr: StyleChangeRequest = {
      //     type: 'changeStyle',
      //     styleId: r.toId,
      //     data: result[0].value,
      //   };
      //   rval.push(cr);

      //   const data: HintData = {
      //     relationship: HintRelationship.Equivalent,
      //     status: HintStatus.Correct,
      //     idOfRelationshipDecorated: r.id
      //   };

      //   // In order to load this, we must find the HINT matching this relation
      //   const hintStyles = this.notebook.findStyles(
      //     { role: 'HINT', recursive: true}
      //   );

      //   var hintStyle = hintStyles.find( f => f.data.idOfRelationshipDecorated == r.id);

      //   const hintReq: StyleChangeRequest = {
      //     styleId: hintStyle!.id,
      //     type: 'changeStyle',
      //     data,
      //   };
      //   rval.push(hintReq);
      //      }
    }
}


  // RLR attempts here to create a change function
  // to be used by the high-level API...
  // @ts-ignore
  // private async dependentChangeRule(relationship: RelationshipObject,
  //                                   inputValues: DataflowValue[]) : Promise<DataflowValue[]> {

  //   var dfvs: DataflowValue[] = [];
  //   if (relationship.role != 'TRANSFORMATION') return dfvs;
  //   // In this case (that of ALGEBRAIC-TOOLS),
  //   // The outputs are only FORMULA and HINT in that order

  //   // TODO: When LEGACY is removed, this shall be
  //   // 0, not 1.
  //   const changedData = inputValues[0].value;

  //   var substituted = relationship.data.replace('${expr}', changedData);

  //   var hdata : HintData = {
  //     relationship: HintRelationship.Equivalent,
  //     status: HintStatus.Correct,
  //     idOfRelationshipDecorated: relationship.id,
  //   };

  //   try {
  //     const transformed = await execute(substituted);

  //     dfvs.push({
  //       status: DataflowStatus.Changed,
  //       message: 'CHANGED',
  //       value: transformed
  //     });
  //     dfvs.push({
  //       status: DataflowStatus.Changed,
  //       message: 'CHANGED',
  //       value: hdata,
  //     });
  //   } catch (e) {
  //     debug("error in wolfram execution: "+substituted);
  //     console.error("error in wolfram execution: "+substituted);
  //     dfvs[0] = {
  //       status: DataflowStatus.Invalid,
  //       message: 'UNCHANGED',
  //       value: changedData
  //     }
  //     dfvs[1] = {
  //       status: DataflowStatus.Invalid,
  //       message: 'UNCHANGED',
  //       value: hdata,
  //     }
  //   }

  //   return dfvs;
  // }
}
