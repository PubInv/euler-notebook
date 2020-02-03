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

import { NotebookChange, StyleObject } from '../../client/notebook';
import { ToolInfo, NotebookChangeRequest, StyleInsertRequest, StylePropertiesWithSubprops } from '../../client/math-tablet-api';
import { ServerNotebook, ObserverInstance } from '../server-notebook';
import { execute} from '../wolframscript';
import { Config } from '../config';

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

  public async useTool(toolStyle: StyleObject): Promise<NotebookChangeRequest[]> {
    debug(`useTool ${this.notebook._path} ${toolStyle.id}`);

      const hintProps: StylePropertiesWithSubprops = {
        role: 'HINT',
        type: 'HINT-DATA',
        data: undefined,
        subprops: [{
          role: 'REPRESENTATION',
          subrole: 'INPUT',
          type: 'TEXT',
          data: "This came from an algebraic operation: "+toolStyle.data.name
          + " of (" + toolStyle.data.origin_id + ")",
        }],
      };
      const hintReq: StyleInsertRequest = {
        type: 'insertStyle',
        // TODO: afterId should be ID of subtrivariate.
        styleProps: hintProps,
      };

      const styleProps: StylePropertiesWithSubprops = {
        role: 'FORMULA',
        type: 'FORMULA-DATA',
        data: undefined,
        subprops: [{
          role: 'REPRESENTATION',
          subrole: 'INPUT',
          type: 'WOLFRAM',
          data: toolStyle.data.data,
          // WARNING! : Possibly this should be 'FACTORIZATION'
          // or some other meaning. 'INPUT' is a stop-gap
          // to work with the current GUI.
        }],
      };
      const changeReq: StyleInsertRequest = {
        type: 'insertStyle',
        // TODO: afterId should be ID of subtrivariate.
        styleProps,
      };

    return [ hintReq,changeReq ];
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
                              wolfram_fun : (s: string) =>  Promise<string> ,
                              name: string,
                              html_fun: (s: string) => string) :
  Promise<void> {
    //    const f = await this.factor(style.data);
    const f = await wolfram_fun(style.data);
    debug("FFFFFFFFFF", f);
    if (this.effectiveEqual(f,style.data)) { // nothing interesting to do!
      return;
    }
    debug("look for match");
    debug("style  :",style.data);
    debug("wolfram:",f);

    // (Actually we want to put the LaTeX in here, but that is a separate step!
    const toolInfo: ToolInfo = { name: name,
                                 html: html_fun(f),
                                 data: f,
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

  private async algebraicToolsRule(style: StyleObject, rval: NotebookChangeRequest[]): Promise<void> {

    if (style.type != 'WOLFRAM' || style.role != 'EVALUATION') { return; }

    await this.addTool(style,rval,
                             ((expr : string) => execute(`InputForm[Factor[${expr}]]`)),
                             "factor",
                             (s : string) => `Factor: ${s}`);
    await this.addTool(style,rval,
                             ((expr : string) => execute(`InputForm[Expand[${expr}]]`)),
                             "expand",
                             (s : string) => `Expand: ${s}`);
    await this.addTool(style,rval,
                             ((expr : string) => execute(`InputForm[ExpandAll[${expr}]]`)),
                             "expand all",
                             (s : string) => `ExpandAll: ${s}`);
    await this.addTool(style,rval,
                             ((expr : string) => execute(`InputForm[Simplify[${expr}]]`)),
                             "simplify",
                       (s : string) => `Simplify: ${s}`);
     await this.addTool(style,rval,
                             ((expr : string) => execute(`InputForm[Cancel[${expr}]]`)),
                             "cancel",
                             (s : string) => `Cancel: ${s}`);
     await this.addTool(style,rval,
                             ((expr : string) => execute(`InputForm[Together[${expr}]]`)),
                             "together",
                        (s : string) => `Together: ${s}`);
      await this.addTool(style,rval,
                             ((expr : string) => execute(`InputForm[Apart[${expr}]]`)),
                             "apart",
                             (s : string) => `Apart: ${s}`);
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

// Private Functions
