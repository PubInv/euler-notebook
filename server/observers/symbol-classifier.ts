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

import * as debug1 from 'debug';
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

import { NotebookChange, StyleObject } from '../../client/notebook';
import { ToolInfo, SymbolData, WolframData, NotebookChangeRequest, StyleInsertRequest, StylePropertiesWithSubprops, RelationshipPropertiesMap } from '../../client/math-tablet-api';
import { ServerNotebook, ObserverInstance } from '../server-notebook';
import { execute as executeWolframscript, draftChangeContextName } from './wolframscript';
import { Config } from '../config';

export class SymbolClassifierObserver implements ObserverInstance {

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
    const parent = this.notebook.getStyleById(toolStyle.parentId);
    debug(`parent ${parent}`);

    // We're looking for the EQUATION style...
    const equationStyle = this.notebook.findChildStylesOfType(parent.id, 'EQUATION', 'EQUATION-DEFINITION')[0];

    if (!equationStyle) { throw new Error(`EQUATION style not found.`); }

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
      toolStyle);
    // We actually need to know which variables still remain!
    // So I need to put that back!

    debug(`usedSymbls ${usedSymbols}`);
    debug(`sub_expr ${sub_expr}, ${variables}`);

    const symbolUses = this.notebook.findChildStylesOfType(parent.id,'SYMBOL','SYMBOL-USE');

    debug(`symbolUses ${symbolUses}`);

    const newsolutions : NotebookChangeRequest[] = [];
    for (const varname of rvars) {
      const script = `InputForm[Solve[${sub_expr},${varname}]]`;
      let result = await execute(script);
      var styleProps: StylePropertiesWithSubprops;
      styleProps = {
        type: 'SOLUTION',
        // This is a Wolfram-specific string, we probably don't want to do this...but it
        // will be acceptable for debugging
        data: result,
        meaning: 'EQUATION-SOLUTION'
      }
      const changeReq: StyleInsertRequest = {
        type: 'insertStyle',
        parentId: parent.id,
        styleProps,
      };
      newsolutions.push(changeReq);
    }

    return newsolutions;
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
        const style = change.style;
        if (style.type == 'WOLFRAM' && style.meaning == 'INPUT' ||style.meaning == 'INPUT-ALT') {
          await this.addSymbolUseStyles(style, rval);
          await this.addSymbolDefStyles(style, rval);
        }
        break;
      }
    }
  }

  private async addSymbolDefStyles(style: StyleObject, rval: NotebookChangeRequest[]): Promise<void> {
    const script = `FullForm[Hold[${style.data}]]`;
    const result = await execute(script);
    if (!result) { return; }
    if (result.startsWith("Hold[Set[")) {
      // WARNING! TODO!  This may work but will not match
      // expressions which do not evaluate numerically.
      const name_matcher = /Hold\[Set\[(\w+),/g;
      const name_matches = name_matcher.exec(result);
      const value_matcher = /,\s+(.+)\]\]/g;
      const value_matches = value_matcher.exec(result);
      debug(`name_matches ${name_matches}`);
      debug(`value_matches ${value_matches}`);
      if (name_matches && value_matches) {
        // We have a symbol definition.
        const name = name_matches[1];
        // here we wat to check that this is a symbolic name, and a solitary one.

        debug(`name ${name}`);

          const value = value_matches[1];
          // Add the symbol-definition style
          const relationsTo: RelationshipPropertiesMap = {};
          // Add any symbol-dependency relationships as a result of the new symbol-def style
          for (const otherStyle of this.notebook.allStyles()) {
            if (otherStyle.type == 'SYMBOL' &&
                otherStyle.meaning == 'SYMBOL-USE' &&
                otherStyle.data.name == name) {
              relationsTo[otherStyle.id] = { meaning: 'SYMBOL-DEPENDENCY' };
              debug(`Inserting relationship`);
            }
          }


        var styleProps: StylePropertiesWithSubprops;
        if (name.match(/^[a-z]+$/i)) {
          const data = { name, value };
          styleProps = {
            type: 'SYMBOL',
            data,
            meaning: 'SYMBOL-DEFINITION',
            relationsTo,
          }
        } else {
          // treat this as an equation
          debug('defining equation');
          // In math, "lval" and "rval" are conventions, without
          // the force of meaning they have in programming langues.
          const lhs = name_matches[1];
          const rhs = value_matches[1];
          debug(`lhs,rhs ${lhs} ${rhs}`);
          const data = { lhs, rhs };
          styleProps = {
            type: 'EQUATION',
            data,
            meaning: 'EQUATION-DEFINITION',
            relationsTo,
          }
          // In this case, we need to treat lval and rvals as expressions which may produce their own uses....
          await this.addSymbolUseStylesFromString(lhs, style, rval);
          await this.addSymbolUseStylesFromString(rhs, style, rval);
          // Now let's try to add a tool tip to solve:

          const toolInfo: ToolInfo = { name: 'solve', html: "Solve Equation (draft)" };
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
        const changeReq: StyleInsertRequest = { type: 'insertStyle', parentId: style.id, styleProps };
        rval.push(changeReq);

        debug(`Inserting def style.`);
      }
    }
  }

  private async  findSymbols(math: string): Promise<string[]> {
    const script = `runPrivate[Variables[` + math + `]]`;
    const oresult = await execute(script);
    if (!oresult) { return []; }
    debug("BEFORE: "+oresult);
    const result = draftChangeContextName(oresult);
    debug("CONTEXT REMOVED: "+result);

    // TODO: validate return value is in expected format with regex.
    const symbols = result.slice(1,-1).split(', ').filter( s => !!s)
    debug(`symbols ${symbols}`);
    return symbols;
  }

  private async  addSymbolUseStyles(style: StyleObject, rval: NotebookChangeRequest[]): Promise<void> {
    await this.addSymbolUseStylesFromString(style.data, style, rval);
  }
  private async  addSymbolUseStylesFromString(data: string,style: StyleObject, rval: NotebookChangeRequest[]): Promise<void> {
    const symbols = await this.findSymbols(data);
    symbols.forEach(s => {

      // Add the symbol-use style
      const relationsFrom: RelationshipPropertiesMap = {};
      // Add any symbol-dependency relationships as a result of the new symbol-use style
      for (const otherStyle of this.notebook.allStyles()) {
        if (otherStyle.type == 'SYMBOL' &&
            otherStyle.meaning == 'SYMBOL-DEFINITION' &&
            otherStyle.data.name == s) {
          relationsFrom[otherStyle.id] = { meaning: 'SYMBOL-DEPENDENCY' };
          debug(`Inserting relationship`);
        }
      }
      const data: SymbolData = { name: s };
      const styleProps: StylePropertiesWithSubprops = {
        type: 'SYMBOL',
        data,
        meaning: 'SYMBOL-USE',
        relationsFrom,
      }
      const changeReq: StyleInsertRequest = { type: 'insertStyle', parentId: style.id, styleProps };
      rval.push(changeReq);
      debug(`Inserting use style`);

    });
  }

}

// Helper Functios

async function execute(script: WolframData): Promise<WolframData|undefined> {
  let result: WolframData;
  try {
    // debug(`Executing: ${script}`)
    result = await executeWolframscript(script);
  } catch (err) {
    debug(`Wolfram '${script}' failed with '${err.message}'`);
    return;
  }
  debug(`Wolfram '${script}' returned '${result}'`);
  return result;
}
