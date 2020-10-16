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

import { NotebookChange, StyleObject, RelationshipObject, StyleId,
         FormulaData, WolframExpression,
         MTLExpression} from "../shared/notebook";
import { assert } from "../shared/common";
import {
  ToolData, NotebookChangeRequest, StyleInsertRequest, StylePropertiesWithSubprops,
  StyleDeleteRequest, TexExpression, RelationshipPropertiesMap, NameValuePair
} from "../shared/math-tablet-api";
import { ServerNotebook, ObserverInstance } from "../server-notebook";
import { execute, convertWolframToTeX } from "../adapters/wolframscript";
import { Config } from "../config";



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

  public async onChangesAsync(changes: NotebookChange[], startIndex: number, endIndex: number): Promise<NotebookChangeRequest[]> {
    debug(`onChanges ${changes.length}`);
    const rval: NotebookChangeRequest[] = [];
    for (let i=startIndex; i<endIndex; i++) {
      const change = changes[i];
      await this.onChange(change, rval);
    }
    debug(`onChanges returning ${rval.length} changes.`);
    return rval;
  }

  public onChangesSync(_changes: NotebookChange[], _startIndex: number, _endIndex: number): NotebookChangeRequest[] {
    return [];
  }

  public onClose(): void {
    debug(`onClose ${this.notebook.path}`);
  }

  public async useTool(toolStyle: StyleObject): Promise<NotebookChangeRequest[]> {
    debug(`useTool ${this.notebook.path} ${toolStyle.id}`);

    const nvp = JSON.parse(toolStyle.data.data);

    // This needs to be filled up!!
    // As an experiment--I am attempting to simulate a "WOLFRAM INPUT",
    // in hopes that we get all the good definitional and change function out of that.
    const relationsTo: RelationshipPropertiesMap = {};
    // const styleProps: StylePropertiesWithSubprops = {
    //   type: 'SYMBOL',
    //   data: nvp,
    //   role: 'SYMBOL-DEFINITION',
    //   relationsTo,
    // };
    debug("npv.value",nvp.value);
    const wolframData = <MTLExpression>(nvp.name + ' = ' + nvp.value);
    const formulaData: FormulaData = { wolframData };
    const styleProps: StylePropertiesWithSubprops = {
      role: 'FORMULA',
      type: 'FORMULA-DATA',
      data: formulaData,
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
    if (change == null) return;
    debug(`onChange ${this.notebook.path} ${change.type}`);
    switch (change.type) {
      case 'styleInserted':
        await this.equationSolverRule(change.style, rval);
        break;
      case 'relationshipInserted':
        await this.equationSolverChangedRule(change.relationship, rval);
        break;
      case 'relationshipDeleted':
        await this.equationSolverChangedRule(change.relationship, rval);
        break;
      default: break;
    }
  }


  public async computeSolutionsOfThought(style: StyleObject): Promise<NameValuePair[]> {
    const parent = this.notebook.topLevelStyleOf(style.id);
    debug(`parent ${parent}`);

    // We're looking for the EQUATION style...
    // REVIEW: Does this search need to be recursive?
    const equationStyle = this.notebook.findStyle({ type: 'EQUATION-DATA', role: 'EQUATION-DEFINITION', recursive: true}, parent.id);
    const newsolutions : NameValuePair[] = [];
    if (!equationStyle) {
  // In some cases, this is not really an error, I guess.
 //     debug("equationStyle not found",style.id,parent.id);
      //      throw new Error(`EQUATION style not found. ${style}`);
      return newsolutions;
    }
    else {

      debug(`equation ${equationStyle.data.lhs} ${equationStyle.data.rhs}`);

      const usedSymbols = this.notebook.getSymbolStylesIDependOn(parent);

      // We need to compute the variables from the two halves of the
      // equation, then filter on uses if we have them.
      let variables: string[] = [];
      const lhsScript = <WolframExpression>`InputForm[Variables[${equationStyle.data.lhs}]]`;
      const rhsScript = <WolframExpression>`InputForm[Variables[${equationStyle.data.rhs}]]`;
      let lhsvarstr = await execute(lhsScript);
      let rhsvarstr = await execute(rhsScript);

      let lhsvs = (lhsvarstr) ? lhsvarstr.replace(/\{|\}/g,"").split(",") : [];
      lhsvs = lhsvs.map((s:string) => s.trim());

      let rhsvs = (rhsvarstr) ? rhsvarstr.replace(/\{|\}/g,"").split(",") : [];
      rhsvs = rhsvs.map((s:string) => s.trim());
      variables = [...lhsvs,...rhsvs];
      variables = variables.filter( ele => (ele.length > 0));


      const [rvars,sub_expr] = this.notebook.substitutionExpression(
        <WolframExpression>`${equationStyle.data.lhs} == ${equationStyle.data.rhs}`,
        variables,
        style);
      // We actually need to know which variables still remain!
      // So I need to put that back!

      debug(`rvars ${rvars}`);
      debug(`usedSymbls ${usedSymbols}`);
      debug(`sub_expr ${sub_expr}, ${variables}`);

      // REVIEW: Does this search need to be recursive?
      const symbolUses = this.notebook.findStyles({ type: 'SYMBOL-DATA', role: 'SYMBOL-USE', recursive: true }, parent.id);

      debug(`symbolUses ${symbolUses}`);

      debug(`symbolUses ${rvars}`);


      for (const varname of rvars) {
        const script = <WolframExpression>`InputForm[Solve[${sub_expr},${varname}]]`;
        let result = await execute(script);
        debug("result",result);
        // Solutions look like this: {{ a -> 4 }}; this syntax
        // is Wolfram-specific, so we split it here...
        // I think this code fail for multiple solutions of the same variable
        const res = result.slice(1,-1);
        debug("res",res);
        const solutions = res.split(",");
        debug("solutions",solutions);
        const allsols = solutions.map((x:string) => x.trim().slice(1,-1));
        debug("allsols",allsols);
        // Note: Sometimes we get [ '' ] as the solutions, so we
        // test for the truthyness of the solution below.
        allsols.map((s:string) => {
          if (s) {
            const ss = s.split("->");
            assert(ss[1]);
            const nvp : NameValuePair =
              { name: ss[0],
                value: ss[1] };
            newsolutions.push(nvp);
          }
        });
      }

      // The act of computing this could trigger the addition of new tool tips
      debug("NEWSOLUTIONS",newsolutions);
    return newsolutions;
    }
  }

  private async solutionInsert(sol: NameValuePair, styleId: StyleId): Promise<StyleInsertRequest> {
    debug("Adding promotion of solution", sol);
    // I'm adding data here to make it more obvious that is where
    // the official solution is....though it remains unparsed
    // Although it make some time, I want the "Tex" format for the tool tip here, and
    // I have no recourse but to go get it...
    const lhs = await convertWolframToTeX(<WolframExpression>sol.name);
    const rhs = await convertWolframToTeX(<WolframExpression>sol.value);
    debug("Equation Solver Tex", lhs,rhs);
    const tex_def = <TexExpression>(lhs + " = " + rhs);

    const toolData: ToolData = { name: 'promote',
                                 tex: tex_def,
                                 data: JSON.stringify(sol) };
    const styleProps2: StylePropertiesWithSubprops = {
      type: 'TOOL-DATA',
      role: 'ATTRIBUTE',
      data: toolData,
    }
    const changeReq2: StyleInsertRequest = {
      type: 'insertStyle',
      parentId: styleId,
      styleProps: styleProps2
    };
    return changeReq2;
  }

  private async equationSolverRule(style: StyleObject, rval: NotebookChangeRequest[]): Promise<void> {
    if (style.type != 'EQUATION-DATA' || style.role != 'EQUATION-DEFINITION') { return; }
    debug("INSIDE SOLVER RULE :",style);

    const solutions : NameValuePair[] = await this.computeSolutionsOfThought(style);

    debug("Solutions.length",solutions.length);

    // TODO: if we have a high-order polynomial, we may well have too many solutions
    // for a good solution.  In this case, we really need to creat HTML that
    // is some sort of "pop-up". That is outside our normal format, so I will
    // limit this to 4 solutions...
    for(const sol of solutions)
    {
      const changeReq2: StyleInsertRequest = await this.solutionInsert(sol,style.id);
      rval.push(changeReq2);
    }
  }


  private async equationSolverChangedRule(relationship: RelationshipObject, rval: NotebookChangeRequest[]): Promise<void> {

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

      if (target_ancestor.type != 'EQUATION-DATA' || target_ancestor.role != 'EQUATION-DEFINITION') { return; }

    // I'm just going to try to handle this as a straight recomputation...
    // The alternative would be to see if a definion has been inserted
    // which I use....
    // We want to delete and recstruct the tools...
    // So we find the TOOL style...might need to distinguish by source
    // but for now we will just find it.
    // REVIEW: Does this search need to be recursive?
    const tools = this.notebook.findStyles({ type: 'TOOL-DATA', role: 'ATTRIBUTE', recursive: true }, target_ancestor.id);
    debug("tools in changed",tools);
    for(const tool of tools) {
      const changeReq: StyleDeleteRequest = {
          type: 'deleteStyle',
          styleId: tool.id
        };
      rval.push(changeReq);
    }

    // This is basically a pure recomputation, and a duplcation of code above,
    // so duplication should at least be removed via a refactoring.

    // now we basically just recompute...
    const style : StyleObject = this.notebook.getStyle(relationship.toId);
    debug("style in changed",style);
    const solutions : NameValuePair[] =
      await this.computeSolutionsOfThought(style);

    debug("solutions",solutions);
    debug("Solutions.length",solutions.length);

    for(const sol of solutions)
    {
      const changeReq2: StyleInsertRequest =
        await this.solutionInsert(sol,
                                  relationship.toId);
      rval.push(changeReq2);
    }
  }
}
// Private Functions
