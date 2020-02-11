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

import { StyleType,NotebookChange, StyleObject,
         RelationshipObject,
         RelationshipProperties,
         FindRelationshipOptions,
         HintData, HintRelationship, HintStatus} from '../../client/notebook';
import { ToolInfo, NotebookChangeRequest, StyleInsertRequest, StyleDeleteRequest, StylePropertiesWithSubprops, WolframData,
         ToolData,RelationshipInsertRequest,
         RelationshipDeleteRequest,
         StyleChangeRequest,
       } from '../../client/math-tablet-api';
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
    debug(`onChanges ${changes.length}`);
    const rval: NotebookChangeRequest[] = [];
    for (const change of changes) {
      await this.onChange(change, rval);
    }
    debug(`onChanges returning ${rval.length} changes.`);
    return rval;
  }

  public onChangesSync(_changes: NotebookChange[]): NotebookChangeRequest[] {
    return [];
  }

  public async onClose(): Promise<void> {
    debug(`onClose ${this.notebook._path}`);
    delete this.notebook;
  }

  // TODO: This is a direct duplicate code in symbol-classifier.ts
  // that duplication must be removed.
  public async useTool(toolStyle: StyleObject): Promise<NotebookChangeRequest[]> {
    debug(`useTool ${this.notebook._path} ${toolStyle.id}`);

    const toolInfo: ToolInfo = toolStyle.data;
    const toolData: ToolData = toolInfo.data;
    console.dir(toolInfo.data);

    const fromId = this.notebook.topLevelStyleOf(toolInfo.origin_id!).id;
    const toId = this.notebook.reserveId();
    const relId = this.notebook.reserveId();

    const data: HintData = {
      relationship: HintRelationship.Equivalent,
      status: HintStatus.Correct,
      idOfRelationshipDecorated: relId
    };

    const hintProps: StylePropertiesWithSubprops = {
      role: 'HINT', type: 'HINT-DATA', data,
      subprops: [
        { role: 'REPRESENTATION', subrole: 'INPUT', type: 'TEXT', data: `From ${toolInfo.name}` },
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
    //   data: undefined,
    //   subprops: [{
    //     id: toId,
    //     role: 'REPRESENTATION',
    //     type: 'WOLFRAM',
    //     data: toolData.output,
    //     subrole: 'INPUT',
    //     // REVIEW: Possibly this should be 'FACTORIZATION'
    //     // or some other meaning. 'INPUT' is a stop-gap
    //     // to work with the current GUI.
    //   }],
    //   relationsFrom: {
    //     [fromId]: { role: 'TRANSFORMATION',
    //                 data: toolData,
    //                 id: relId },
    //   }
    // };

    const styleProps: StylePropertiesWithSubprops = {
      role: 'FORMULA',
      type: 'FORMULA-DATA',
      data: undefined,
      subprops: [{
        id: toId,
        role: 'REPRESENTATION',
        type: 'WOLFRAM',
        data: toolData.output,
        subrole: 'INPUT',
        // REVIEW: Possibly this should be 'FACTORIZATION'
        // or some other meaning. 'INPUT' is a stop-gap
        // to work with the current GUI.
      }],
    };

    const changeReq: StyleInsertRequest = {
      type: 'insertStyle',
      // TODO: afterId should be ID of subtrivariate.
      styleProps,
    };

    const relProps : RelationshipProperties =
      { role: 'TRANSFORMATION',
        data: toolData,
        id: relId,
        logic: HintRelationship.Equivalent,
        status: HintStatus.Correct,
      };

    const relReq: RelationshipInsertRequest =
      { type: 'insertRelationship',
        fromId: fromId,
        toId: toId,
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
    debug(`onChange ${this.notebook._path} ${change.type}`);
    switch (change.type) {
      case 'styleInserted': {
        await this.algebraicToolsStyleInsertRule(change.style, rval);
        break;
      }
      case 'styleChanged': {
        await this.algebraicToolsStyleChangeRule(change.style, rval);
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
                              transformation: WolframData,
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
    debug("look for match");
    debug("style  :",style.data);
    debug("wolfram:",output);

    // WARNING: I'm producing LaTeX here, but I am not handling variable
    // substitutions or changes. This will likely not work very well
    // in the presence of those things.  However, this will let DEJ do
    // some rendering work on the tool side immediately. I will have to
    // come back in and handle this more complete later. - rlr

    const tex_f : string = await convertWolframToTeX(output);

    // (Actually we want to put the LaTeX in here, but that is a separate step!
    const data = { output, transformation, transformationName: name };
    const toolInfo: ToolInfo = { name: name,
                                 html: html_fun(output),
                                 tex: tex_fun(tex_f),
                                 data,
                                 origin_id: style.id};
    const styleProps2: StylePropertiesWithSubprops = {
      type: 'TOOL',
      role: 'ATTRIBUTE',
      data: toolInfo,
    }
    const changeReq2: StyleInsertRequest = {
      type: 'insertStyle',
      parentId: style.id,
      styleProps: styleProps2
    };
    rval.push(changeReq2);
  }

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

    if (style.type != 'WOLFRAM' || style.role != 'EVALUATION') { return; }

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

  private async algebraicToolsStyleChangeRule(style: StyleObject, rval: NotebookChangeRequest[]): Promise<void> {
    debug("cccc",style);
    this.removeAllOffspringOfType(style,rval,'TOOL');
    await this.algebraicToolsStyleInsertRule(style, rval);

    // The relationship will be tied to the Representation

    // I think all of the above is correct, but now we wish to see
    // if any relationships against that force us to
    // First, we want to find all TRANSFORM relations that have
    // a To clause mathing this style. They must be marked unverified.
    const relOp : FindRelationshipOptions = {
      toId: style.id,
      role: 'TRANSFORMATION' };


    const relsInPlace : RelationshipObject[] = this.notebook.findRelationships(relOp);
    debug("AAA",relsInPlace);

    // TODO: Here we want to change the status, which we have not
    // yet even moved to the relationship.
    // Then we need to listen for a relationship change so that the
    // hint can change appropriately.

    relsInPlace.forEach(
      r => {
        // I guess since we don't have a relationshipChanged property,
        // we need to delete this relationship and
        // add another. We probably to publish a hint changed
        // request as well.
        const toId = this.notebook.reserveId();
        const relId = this.notebook.reserveId();
        const relProps : RelationshipProperties =
          {
            role: r.role,
            data: r.data,
            id: relId,
            logic: HintRelationship.Equivalent,
            status: HintStatus.Unknown,
          };

        const relReq: RelationshipInsertRequest =
          { type: 'insertRelationship',
            fromId: r.fromId,
            toId: toId,
            props: relProps };
        rval.push(relReq);

        const deleteReq : RelationshipDeleteRequest = {
          type: 'deleteRelationship',
          id: r.id
        };
        rval.push(deleteReq);

// Now we find the HINT
        const hintStyle =
          this.notebook.findStyles({ type: 'HINT-DATA',
                                    role: 'HINT',
                                    recursive: true,
                                   }).find(s =>
                                           s.data.idOfRelationshipDecorated == r.id );
        if (hintStyle) {

        const data: HintData = {
          relationship: HintRelationship.Equivalent,
          status: HintStatus.Unknown,
          idOfRelationshipDecorated: relId
        };

        const hintReq: StyleChangeRequest = {
          styleId: hintStyle.id,
          type: 'changeStyle',
          data,
        };
          rval.push(hintReq);
        } else {
          console.error("internal error");
        }
    }

    );
    debug("PUSHES",rval);


// Now the hint won't redraw unless we listen for this change or submit..

  }

  // Helper Functions

}
