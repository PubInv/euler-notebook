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

import { NotebookChange, StyleObject, RelationshipObject, WolframExpression } from "../shared/notebook";
import { NotebookChangeRequest, StyleInsertRequest, StylePropertiesWithSubprops,
//         StyleDeleteRequest,
         SymbolTable,
//         SymbolContraint, SymbolConstraints
       } from "../shared/math-tablet-api";

// import { absDirPathFromNotebookPath } from "../files-and-folders";
import { ServerNotebook, ObserverInstance } from "../server-notebook";
import { execute,
//         constructSubstitution
       } from "../adapters/wolframscript";
import { Config } from "../config";
// import * as uuid from "uuid-js";
// import uuid = require('uuid');
// import { v4 as uuid } from "uuid";
// import fs from "fs";
// import * as fs from "fs";



export class SymbolTableObserver implements ObserverInstance {

  // Class Methods

  public static async initialize(_config: Config): Promise<void> {
    debug(`initialize`);
  }

  public static async onOpen(notebook: ServerNotebook): Promise<ObserverInstance> {
    debug(`onOpen`);
    return new this(notebook);
  }

  // Observer Instance Methods

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
    return [];
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
//    debug(`onChange ${this.notebook._path} ${change.type}`);
    switch (change.type) {
      case 'styleInserted':
        await this.symbolTableClassifierRule(change.style, rval);
        break;
      case 'styleChanged':
        await this.symbolTableClassifierRule(change.style, rval);
        break;
      case 'relationshipInserted':
        await this.symbolTableChangeRule(change.relationship, rval);
        break;
      case 'relationshipDeleted':
        await this.symbolTableChangeRule(change.relationship, rval);
        break;
      default: break;
    }
  }


  // TODO: Make this accept a set of style instead, so it is generic
  // to any set of formulae; we can invoke it by collecting top-level styles
  // up to the current point
  private async obtainFormulaeInContext(style: StyleObject) : Promise<SymbolTable> {
    var tls = this.notebook.topLevelStyleOrder();
    var ctxpos = this.notebook.topLevelStylePosition(style.id);
    var context_forms = tls.filter(s =>
                              this.notebook.topLevelStylePosition(s) <= ctxpos
                                   &&
                                   this.notebook.getStyle(s).type == 'FORMULA-DATA');

    var exprs_styles = context_forms.map(s =>
                                         this.notebook.getStyle(s));

    // These styles should be moved out...
    // Some of these may be empty, though that is probably wrong on our part...
    // TODO: This was looking for REPRESENTATION/WOLFRAM-EXPRESSION styles.
    throw new Error("TODO:");
    var exprs = []; //exprs_styles.map(s => this.notebook.findStyle({role: 'REPRESENTATION', type: 'WOLFRAM-EXPRESSION'},s.id)!.data).filter(x => x);

    var symbols : string[] = [];
    var use_styles: StyleObject[] = [];
    var def_styles: StyleObject[] = [];

    exprs_styles.forEach( s => {
      debug("xxx",this.notebook.findStyles(
        { role : 'SYMBOL-USE' , type: 'SYMBOL-DATA',recursive: true },s.id,use_styles));
    });

    exprs_styles.forEach( s => {
      debug("yyy",this.notebook.findStyles(
        { role : 'SYMBOL-DEFINITION' , type: 'SYMBOL-DATA', recursive: true },s.id,def_styles))
    })
    debug("use_styles",use_styles);
    debug("def_styles",def_styles);


    // exprs_styles.forEach( s => this.notebook.findStyles(
    //   { role : 'SYMBOL-USE' , type: 'SYMBOL-DATA' },s.id).forEach(s => symbols.push(s.data.name)));

    // exprs_styles.forEach( s => this.notebook.findStyles(
    //   { role : 'SYMBOL-DEFINITION' , type: 'SYMBOL-DATA' },s.id).forEach(s => symbols.push(s.data.name)));
    use_styles.forEach(s => symbols.push(s.data.name));
    def_styles.forEach(s => symbols.push(s.data.name));

    var sym_table : SymbolTable = {};
    // Experimental attempt to use wolfram "solver" function...
    if (symbols.length > 0) {
      var symbols_in_curlies = symbols.join(',');

      // Assignments in these expressions are not allowed; nonetheless we ahve bene rather ambigous as to
      // whether a single or double = is required. We are at

      exprs = exprs.map(str => str.replace(/=/g, "=="));
      exprs = exprs.filter(x => x.includes("=="));

      var formulae_anded = exprs.join(' && ');
      var code = <WolframExpression>`ExportString[InputForm[Solve[${formulae_anded}, {${symbols_in_curlies}}]],"ExpressionJSON"]`;
      debug("code = ",code);
      var results = await execute(code);
      debug("results = ",results,typeof(results));

      function convert_wolfram_solver_results_to_object(solutions: string) : SymbolTable {
        var table = JSON.parse(solutions);

        var sym_table : SymbolTable = {};
        var inner0 = table[1];
        if (inner0.length < 2) return sym_table;
        for(var i = 1; i < inner0[1].length; i++) {
          var solution = inner0[1][i];
          sym_table[solution[1]] = solution[2];
        }
        return sym_table;
      }
      var table = convert_wolfram_solver_results_to_object(results);
      debug("table =", table);
      return table;
    }
    return sym_table;
  }
  // Because every top-level style deserves a symbol-table,
  // or guard is really "are we a top-level style".
  // This may need to be changed in the future.
  private async symbolTableClassifierRule(style: StyleObject, rval: NotebookChangeRequest[]): Promise<void> {

    if (this.notebook.isTopLevelStyle(style.id) && style.type == 'FORMULA-DATA') {

      var data : SymbolTable = {};
      data = await this.obtainFormulaeInContext(style);

      const styleProps: StylePropertiesWithSubprops = {
        type: 'SYMBOL-TABLE',
        data: data,
        role: 'SYMBOL-TABLE',
        exclusiveChildTypeAndRole: false,
      };
      const changeReq: StyleInsertRequest = {
        type: 'insertStyle',
        parentId: style.id,
        styleProps,
      };
      rval.push(changeReq);
      debug('adding'+rval + changeReq);
    }
    debug('final Symbol-Table'+rval);
  }

  private async symbolTableChangeRule(_relationship: RelationshipObject, _rval: NotebookChangeRequest[]): Promise<void> {
  }

  // Private Functions

}
