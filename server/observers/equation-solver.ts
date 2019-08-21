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

import { NotebookChange, StyleObject,
//         RelationshipObject
       } from '../../client/notebook';
import { ToolInfo, NotebookChangeRequest, StyleInsertRequest, StylePropertiesWithSubprops,
         //         StyleDeleteRequest
         RelationshipPropertiesMap,
         NameValuePair
       } from '../../client/math-tablet-api';
import { ServerNotebook, ObserverInstance } from '../server-notebook';
import { execute,
//         constructSubstitution
       } from './wolframscript';
import { Config } from '../config';
// import * as uuid from 'uuid-js';
// import uuid = require('uuid');
// import { v4 as uuid } from 'uuid';



export class EquationSolverObserver implements ObserverInstance {

  // Class Methods

  public static async initialize(_config: Config): Promise<void> {
    debug(`initialize`);
  }

  public static async onOpen(notebook: ServerNotebook): Promise<ObserverInstance> {
    debug(`onOpen`);
    return new this(notebook);
  }

  // Instance Methods

  public async onChanges(changes: NotebookChange[]): Promise<NotebookChangeRequest[]> {
    debug(`onChanges ${changes.length}`);
    const rval: NotebookChangeRequest[] = [];
    for (const change of changes) {
      await this.onChange(change, rval);
    }
    debug(`onChanges returning ${rval.length} changes.`);
    return rval;
  }

  public async onClose(): Promise<void> {
    debug(`onClose ${this.notebook._path}`);
    delete this.notebook;
  }

  public async useTool(toolStyle: StyleObject): Promise<NotebookChangeRequest[]> {
    debug(`useTool ${this.notebook._path} ${toolStyle.id}`);

    const nvp = JSON.parse(toolStyle.data.data);

    // This needs to be filled up!!
    // As an experiment--I am attempting to simulate a "WOLFRAM INPUT",
    // in hopes that we get all the good definitional and change function out of that.
    const relationsTo: RelationshipPropertiesMap = {};
    // const styleProps: StylePropertiesWithSubprops = {
    //   type: 'SYMBOL',
    //   data: nvp,
    //   meaning: 'SYMBOL-DEFINITION',
    //   relationsTo,
    // };
    debug("npv.value",nvp.value);
    const styleProps: StylePropertiesWithSubprops = {
      type: 'WOLFRAM',
      data: nvp.name + ' = ' + nvp.value,
      meaning: 'INPUT',
      relationsTo,
    };
      const changeReq: StyleInsertRequest = {
        type: 'insertStyle',
        styleProps,
      };
      return [ changeReq ];
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
        await this.equationSolverRule(change.style, rval);
        break;
      // case 'relationshipInserted':
      //   await this.equationSolverChangedRule(change.relationship, rval);
      //   break;
      // case 'relationshipDeleted':
      //   await this.equationSolverChangedRule(change.relationship, rval);
      //   break;
      default: break;
    }
  }


  public async computeSolutionsOfThought(style: StyleObject): Promise<NameValuePair[]> {
    const parent = this.notebook.topLevelStyleOf(style.id);
    debug(`parent ${parent}`);

    // We're looking for the EQUATION style...
    const equationStyle = this.notebook.findChildStylesOfType(parent.id, 'EQUATION', 'EQUATION-DEFINITION')[0];
    const newsolutions : NameValuePair[] = [];
    if (!equationStyle) { throw new Error(`EQUATION style not found.`); }
    else {

      debug(`equation ${equationStyle.data.lhs} ${equationStyle.data.rhs}`);

      const usedSymbols = this.notebook.getSymbolStylesIDependOn(parent);

      // We need to compute the variables from the two halves of the
      // equation, then filter on uses if we have them.
      let variables: string[] = [];
      const lhsScript = `InputForm[Variables[${equationStyle.data.lhs}]]`;
      const rhsScript = `InputForm[Variables[${equationStyle.data.rhs}]]`;
      let lhsvarstr = await execute(lhsScript);
      let rhsvarstr = await execute(rhsScript);

      let lhsvs = (lhsvarstr) ? lhsvarstr.replace(/\{|\}/g,"").split(",") : [];
      lhsvs = lhsvs.map(s => s.trim());

      let rhsvs = (rhsvarstr) ? rhsvarstr.replace(/\{|\}/g,"").split(",") : [];
      rhsvs = rhsvs.map(s => s.trim());
      variables = [...lhsvs,...rhsvs];
      variables = variables.filter( ele => (ele.length > 0));


      const [rvars,sub_expr] = this.notebook.substitutionExpression(
        `${equationStyle.data.lhs} == ${equationStyle.data.rhs}`,
        variables,
        style);
      // We actually need to know which variables still remain!
      // So I need to put that back!

      debug(`usedSymbls ${usedSymbols}`);
      debug(`sub_expr ${sub_expr}, ${variables}`);

      const symbolUses = this.notebook.findChildStylesOfType(parent.id,'SYMBOL','SYMBOL-USE');

      debug(`symbolUses ${symbolUses}`);


      for (const varname of rvars) {
        const script = `InputForm[Solve[${sub_expr},${varname}]]`;
        let result = await execute(script);
        debug("result",result);
        // Solutions look like this: {{ a -> 4 }}; this syntax
        // is Wolfram-specific, so we split it here...
        // I think this code fail for multiple solutions of the same variable
        const res = result.slice(1,-1);
        debug("res",res);
        const solutions = res.split(",");
        debug("solutions",solutions);
        const allsols = solutions.map(x => x.trim().slice(1,-1));
        debug("allsols",allsols);
        allsols.map(s => {
          const ss = s.split("->");
          console.log("ss[0],ss[1]",ss[0],"=",ss[1]);
          const nvp : NameValuePair =
            { name: ss[0],
              value: ss[1] };
          newsolutions.push(nvp);
        });
      }

      // The act of computing this could trigger the addition of new tool tips
      debug("NEWSOLUTIONS",newsolutions);
    return newsolutions;
    }
  }

  private async equationSolverRule(style: StyleObject, rval: NotebookChangeRequest[]): Promise<void> {
    if (style.type != 'EQUATION' || style.meaning != 'EQUATION-DEFINITION') { return; }
    debug("INSIDE SOLVER RULE :",style);

    const solutions : NameValuePair[] = await this.computeSolutionsOfThought(style);

    debug("Solutions.length",solutions.length);

    // TODO: if we have a high-order polynomial, we may well have too many solutions
    // for a good solution.  In this case, we really need to creat HTML that
    // is some sort of "pop-up". That is outside our normal format, so I will
    // limit this to 4 solutions...
    for(const sol of solutions)
    {

      debug("Adding promotsion of solution", sol);
      // I'm adding data here to make it more obvious that is where
      // the official solution is....though it remains unparsed
      const toolInfo: ToolInfo = { name: 'promote',
                                   html: sol.name + "<-" + sol.value + " ",
                                   data: JSON.stringify(sol) };
      const styleProps2: StylePropertiesWithSubprops = {
        type: 'TOOL',
        meaning: 'ATTRIBUTE',
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
}

// Private Functions
