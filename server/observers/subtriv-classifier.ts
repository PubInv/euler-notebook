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

import { NotebookChange, StyleObject, RelationshipObject } from '../../client/notebook';
import { ToolInfo, NotebookChangeRequest, StyleInsertRequest, StylePropertiesWithSubprops, StyleDeleteRequest } from '../../client/math-tablet-api';

import { absDirPathFromNotebookPath } from '../files-and-folders';
import { ServerNotebook, ObserverInstance } from '../server-notebook';
import { execute, constructSubstitution} from '../wolframscript';
import { Config } from '../config';
// import * as uuid from 'uuid-js';
// import uuid = require('uuid');
import { v4 as uuid } from 'uuid';

export class SubtrivClassifierObserver implements ObserverInstance {

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

    // The parent of the TOOL/ATTRIBUTE style will be a WOLFRAM/EVALUATION style
    const evaluationStyle = this.notebook.getStyleById(toolStyle.parentId);

    // The WOLFRAM/EVALUATION style will have a CLASSIFICATION/SUBTRIVARIATE child.
    // REVIEW: Does this search need to be recursive?
    const classificationStyle = this.notebook.findStyle({ type: 'CLASSIFICATION', role: 'SUBTRIVARIATE', recursive: true }, evaluationStyle.id);
    if (!classificationStyle) { throw new Error(`Classification style not found.`); }

    const targetPath = absDirPathFromNotebookPath(this.notebook._path!);
    var uuid4 = uuid();
    const plotName = "quadplot" + evaluationStyle.id + '-' + uuid4 + ".png";
    const urlPath = `${this.notebook._path}${plotName}`;
    const fullFilename = `${targetPath}/${plotName}`;

    // We are only plottable if we make the normal substitutions...
    const rs = this.notebook.getSymbolStylesIDependOn(evaluationStyle);
    debug("RS",rs);
    let createdPlotSuccessfully: boolean = false;

    try {
      let variables: string[] = [];
      for(var s in classificationStyle.data) {
        variables.push(classificationStyle.data[s]);
      }

      const [rvars,sub_expr] = this.notebook.substitutionExpression(
        evaluationStyle.data,
        variables,
        toolStyle);
      createdPlotSuccessfully = await plotSubtrivariate(sub_expr,rvars,fullFilename);
      debug("PLOTTER SUCCESS SAYS:",createdPlotSuccessfully);
    } catch (e) {
      debug("MATHEMATICA QUAD PLOT FAILED :",e);
      return [];
    }

    if (createdPlotSuccessfully) {
      // NOTE: I'm create a new thought here, which makes sense with
      // our current (5/29/2019) manifestationo of the GUI, which
      // does not elegantly render styles.  Making this independent
      // will look nice in the short term, but loses an important connection
      // between the systems.
      const styleProps: StylePropertiesWithSubprops = {
        type: 'IMAGE',
        data: urlPath,
        role: 'PLOT',
      };
      const changeReq: StyleInsertRequest = {
        type: 'insertStyle',
        // TODO: afterId should be ID of subtrivariate.
        styleProps,
      };
      return [ changeReq ];
    } else {
      return [];
    }
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
        await this.subtrivariateClassifierRule(change.style, rval);
        break;
      case 'relationshipInserted':
        await this.subTrivariateClassifierChangedRule(change.relationship, rval);
        break;
      case 'relationshipDeleted':
        await this.subTrivariateClassifierChangedRule(change.relationship, rval);
        break;
      default: break;
    }
  }

  private async subtrivariateClassifierRule(style: StyleObject, rval: NotebookChangeRequest[]): Promise<void> {
    if (style.type != 'WOLFRAM' || style.role != 'EVALUATION') { return; }
    // debug("INSIDE QUAD CLASSIFIER :",style);

    var isSubTrivariate;
    try {
      // here I attempt to find the dependency relationships....
      const rs = this.notebook.getSymbolStylesIDependOn(style);
      debug("RS ",rs);
      // Now each member of rs should have a name and a value
      // that we should use in our quadratic classification....
      isSubTrivariate = await isExpressionSubTrivariate(style.data,rs);
      debug("SUBTRIVARIATE CLASSIFER SAYS:", isSubTrivariate);
    } catch (e) {
      debug("MATHEMATICA EVALUATION FAILED :", e);
      return;
    }

    if (isSubTrivariate) {
      const styleProps: StylePropertiesWithSubprops = {
        type: 'CLASSIFICATION',
        data: isSubTrivariate,
        role: 'SUBTRIVARIATE',
        exclusiveChildTypeAndRole: true,
      };
      const changeReq: StyleInsertRequest = {
        type: 'insertStyle',
        parentId: style.id,
        styleProps,
      };
      rval.push(changeReq);

      debug("STYLE ADDED XXX", style.id);
      const toolInfo: ToolInfo = { name: 'plot', html: "Plot" };
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
  }

  private async subTrivariateClassifierChangedRule(relationship: RelationshipObject, rval: NotebookChangeRequest[]): Promise<void> {

    if (relationship.role != 'SYMBOL-DEPENDENCY') return;

    debug("RELATIONSHIP",relationship);

    var target_ancestor = null;
    try {
      target_ancestor = this.notebook.topLevelStyleOf(relationship.toId);
    } catch (e) {
      return;
    }
    if (target_ancestor == null) {
      throw new Error("Could not find ancestor Thought: "+relationship.toId);
      return;
    }

    // now we want to find any potentially (re)classifiable style on
    // this ancestor thought...
    // REVIEW: Does this search need to be recursive?
    const candidate_styles =
      this.notebook.findStyles({ type: 'WOLFRAM', role: 'EVALUATION', recursive: true }, target_ancestor.id);
    debug("candidate styles",candidate_styles);
    // Not really sure what to do here if there is more than one!!!
    // TODO: This can also be empty!!! The code below needs
    // to respect this.
    if (candidate_styles.length >= 1) {
      // REVIEW: Does this need to be recursive?
      const beforeChangeClassifiedAsSubTrivariate = this.notebook.hasStyle({ type: 'CLASSIFICATION', role: 'SUBTRIVARIATE', recursive: true }, candidate_styles[0].id);
      debug(beforeChangeClassifiedAsSubTrivariate);

      // Now it is possible that any classifications need to be removed;
      // it is also possible that that a new classification should be added.

      // A simple thing would be to rmove all classifications and regenerate.
      // However, we want to be as minimal as possible. I think we shold distinguish
      // the case: Either we are adding a UNIVARIATE-QUADRATIC, or disqalifying one.
      // So we should just check if this EVALAUTION is plottable. If so, we
      // should make sure one exists, by adding a CLASSIFICATION if it does not.
      // if one does exist, we whold remove it if we are not.
      const unique_style = candidate_styles[0];

      var isSubTrivariate;
      try {
        // here I attempt to find the dependency relationships....
        const rs = this.notebook.getSymbolStylesIDependOn(unique_style);
        debug("RS ",rs);
        // Now each member of rs should have a name and a value
        // that we should use in our quadratic classification....
        isSubTrivariate = await isExpressionSubTrivariate(unique_style.data,rs);
        debug("SUBTRI CLASSIFER SAYS:",isSubTrivariate);
      } catch (e) {
        debug("MATHEMATICA EVALUATION FAILED :",e);
      }
      debug("IS PLOTTABLE",isSubTrivariate);
      debug("IS BEFOREQUDRATIC",beforeChangeClassifiedAsSubTrivariate);
      if (isSubTrivariate && !beforeChangeClassifiedAsSubTrivariate) {
        const styleProps: StylePropertiesWithSubprops = {
          type: 'CLASSIFICATION',
          data: isSubTrivariate,
          role: 'SUBTRIVARIATE',
//          exclusiveChildTypeAndMeaning: true,
        }
        const changeReq: StyleInsertRequest = {
          type: 'insertStyle',
          parentId: unique_style.id,
          styleProps,
        };
        rval.push(changeReq);
      }
      if (!isSubTrivariate && beforeChangeClassifiedAsSubTrivariate) {
        debug("CHOOSING DELETION");
        // REVIEW: Does this search need to be recursive?
        const classification =
          this.notebook.findStyle({ type: 'CLASSIFICATION', role:'SUBTRIVARIATE', recursive: true }, target_ancestor.id);
        const changeReq: StyleDeleteRequest = {
          type: 'deleteStyle',
          styleId: classification!.id
        };
        rval.push(changeReq);
      }
    }
  }
}

// Private Functions

// Return "null" if it does not seem to be an expression , and the name
// of the variable (which must be unique to pass this test) if it is.
async function isExpressionSubTrivariate(expr: string, usedSymbols: StyleObject[]): Promise<string[]|null> {
  const subtrivariate_function_script = `With[{v = Variables[#]},If[(Length[v] == 1) || (Length[v] == 2), v, False]]`;
  const sub_expr =
        constructSubstitution(expr,
                              usedSymbols.map(
                                s => ({ name: s.data.name,
                                        value: s.data.value})));

  const unwrapped_script = subtrivariate_function_script+" &[" + sub_expr + "]";
  const script = "runPrivate[" + unwrapped_script + "]";
  debug("EXPRESSION FOR CLASSIFIFYING: ",script );
  let result : string = await execute(script);
  if (result == "False") {
    return null;
  } else {
    let trimmed = result.replace(/\{|\}/g,"").split(",");
    trimmed = trimmed.map(s => s.trim());
    return trimmed;
  }
}

async function plotSubtrivariate(expr : string, variables: string[], filename : string) : Promise<boolean> {
  debug("VARIABLES",variables);
  let plot_script =
   (variables.length == 1) ?
    `Export["${filename}",Plot[${expr},{${variables[0]},0,6 Pi}]]`
    :
    `Export["${filename}",Plot3D[${expr},{${variables[0]},0,6 Pi},{${variables[1]},0,6 Pi}]]`;
  debug("PLOT COMMAND SENT TO WOLFRAM",plot_script);
  await execute(plot_script);
  return true;
}
