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
         HintData, HintRelationship, HintStatus} from '../../client/notebook';
import { ToolInfo, NotebookChangeRequest, StyleInsertRequest, StyleDeleteRequest, StylePropertiesWithSubprops, WolframData,
         ToolData
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

    const styleProps: StylePropertiesWithSubprops = {
      id: toId,
      role: 'FORMULA',
      type: 'FORMULA-DATA',
      data: undefined,
      subprops: [{
        role: 'REPRESENTATION',
        type: 'WOLFRAM',
        data: toolData.output,
        subrole: 'INPUT',
        // REVIEW: Possibly this should be 'FACTORIZATION'
        // or some other meaning. 'INPUT' is a stop-gap
        // to work with the current GUI.
      }],
      relationsFrom: {
        [fromId]: { role: 'TRANSFORMATION',
                    data: toolData,
                    id: relId },
      }
    };
    const changeReq: StyleInsertRequest = {
      type: 'insertStyle',
      // TODO: afterId should be ID of subtrivariate.
      styleProps,
    };


    return [ hintReq, changeReq ];
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
      case 'styleInserted':
      case 'styleChanged':
        await this.algebraicToolsRule(change.style, rval);
        break;
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
    debug("FFFFFFFFFF", output);
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

  private async algebraicToolsRule(style: StyleObject, rval: NotebookChangeRequest[]): Promise<void> {

    if (style.type != 'WOLFRAM' || style.role != 'EVALUATION') { return; }

    this.removeAllOffspringOfType(style,rval,'TOOL');
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

  // private async algebraicToolsChangedRule(relationship: RelationshipObject, rval: NotebookChangeRequest[]): Promise<void> {

  //   if (relationship.role != 'SYMBOL-DEPENDENCY') return;

  //   debug("RELATIONSHIP",relationship);

  //   var target_ancestor = null;
  //   try {
  //     target_ancestor = this.notebook.topLevelStyleOf(relationship.toId);
  //   } catch (e) {
  //     return;
  //   }
  //   if (target_ancestor == null) {
  //     throw new Error("Could not find ancestor Thought: "+relationship.toId);
  //     return;
  //   }

  //   // now we want to find any potentially (re)classifiable style on
  //   // this ancestor thought...

  //   const candidate_styles =
  //     this.notebook.findStyles({ type: 'WOLFRAM', role: 'EVALUATION', recursive: true }, target_ancestor.id);
  //   debug("candidate styles",candidate_styles);
  //   // Not really sure what to do here if there is more than one!!!
  //   // TODO: This can also be empty!!! The code below needs
  //   // to respect this.
  //   if (candidate_styles.length >= 1) {
  //     // REVIEW: Does this need to be recursive?
  //     const beforeChangeClassifiedAsSubTrivariate = this.notebook.hasStyle({ type: 'CLASSIFICATION', role: 'SUBTRIVARIATE', recursive: true }, candidate_styles[0].id);
  //     debug(beforeChangeClassifiedAsSubTrivariate);

  //     // Now it is possible that any classifications need to be removed;
  //     // it is also possible that that a new classification should be added.

  //     // A simple thing would be to rmove all classifications and regenerate.
  //     // However, we want to be as minimal as possible. I think we shold distinguish
  //     // the case: Either we are adding a UNIVARIATE-QUADRATIC, or disqalifying one.
  //     // So we should just check if this EVALAUTION is plottable. If so, we
  //     // should make sure one exists, by adding a CLASSIFICATION if it does not.
  //     // if one does exist, we whold remove it if we are not.
  //     const unique_style = candidate_styles[0];

  //     var isSubTrivariate;
  //     try {
  //       // here I attempt to find the dependency relationships....
  //       const rs = this.notebook.getSymbolStylesIDependOn(unique_style);
  //       debug("RS ",rs);
  //       // Now each member of rs should have a name and a value
  //       // that we should use in our quadratic classification....
  //       isSubTrivariate = await isExpressionSubTrivariate(unique_style.data,rs);
  //       debug("SUBTRI CLASSIFER SAYS:",isSubTrivariate);
  //     } catch (e) {
  //       debug("MATHEMATICA EVALUATION FAILED :",e);
  //     }
  //     debug("IS PLOTTABLE",isSubTrivariate);
  //     debug("IS BEFOREQUDRATIC",beforeChangeClassifiedAsSubTrivariate);
  //     if (isSubTrivariate && !beforeChangeClassifiedAsSubTrivariate) {
  //       const styleProps: StylePropertiesWithSubprops = {
  //         type: 'CLASSIFICATION',
  //         data: isSubTrivariate,
  //         role: 'SUBTRIVARIATE',
  //         //          exclusiveChildTypeAndMeaning: true,
  //       }
  //       const changeReq: StyleInsertRequest = {
  //         type: 'insertStyle',
  //         parentId: unique_style.id,
  //         styleProps,
  //       };
  //       rval.push(changeReq);
  //     }
  //     if (!isSubTrivariate && beforeChangeClassifiedAsSubTrivariate) {
  //       debug("CHOOSING DELETION");
  //       const classifications =
  //         this.notebook.findStyles({ type: 'CLASSIFICATION', role: 'SUBTRIVARIATE', recursive: true }, target_ancestor.id);
  //       const changeReq: StyleDeleteRequest = {
  //         type: 'deleteStyle',
  //         styleId: classifications[0].id
  //       };
  //       rval.push(changeReq);
  //     }
  //   }
  // }
}

// Helper Functions
