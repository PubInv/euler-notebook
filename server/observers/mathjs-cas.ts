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
import * as math from 'mathjs';

import { NotebookChange, StyleObject, StyleInserted } from '../../client/notebook';
import { NotebookChangeRequest,  StyleInsertRequest, StylePropertiesWithSubprops } from '../../client/math-tablet-api';
import { ObserverInstance, ServerNotebook }  from '../server-notebook';
import { Config } from '../config';

// Exported Class

export class MathJsObserver implements ObserverInstance {

  // Class Methods

  public static async initialize(_config: Config): Promise<void> {
    debug(`initialize`);
  }

  public static async onOpen(notebook: ServerNotebook): Promise<ObserverInstance> {
    debug(`onOpen`);
    return new this(notebook);
  }

  // Instance Methods

  public async onChangesAsync(_changes: NotebookChange[]): Promise<NotebookChangeRequest[]> {
    return [];
  }

  public onChangesSync(changes: NotebookChange[]): NotebookChangeRequest[] {
    debug(`onChanges ${changes.length}`);
    const rval: NotebookChangeRequest[] = [];
    for (const change of changes) {
      this.onChange(change, rval);
    }
    debug(`onChanges returning ${rval.length} changes.`);
    return rval;
  }

  public async onClose(): Promise<void> {
    debug(`onClose ${this.notebook._path}`);
    delete this.notebook;
  }

  public async useTool(style: StyleObject): Promise<NotebookChangeRequest[]> {
    debug(`useTool ${this.notebook._path} ${style.id}`);
    return [];
  }

  // --- PRIVATE ---

  // Private Constructor

  private constructor(notebook: ServerNotebook) {
    this.notebook = notebook;
    this.parser = math.parser();
  }

  // Private Instance Properties

  private notebook: ServerNotebook;
  private parser: math.Parser;

  // Private Instance Methods

  private onChange(change: NotebookChange, rval: NotebookChangeRequest[]): void {
    // REVIEW; Don't allow null/undefined changes.
    if (!change) { return; }
    debug(`onChange ${this.notebook._path} ${change.type}`);
    switch (change.type) {
      case 'styleInserted': this.chStyleInserted(change, rval); break;
      default: break;
    }
  }

  private chStyleInserted(change: StyleInserted, rval: NotebookChangeRequest[]): void {
    const style = change.style;

    // If the user input MATHJS text, then parse it, and attach a LaTeX alternate representation
    // to the thought.
    // If there is a parsing error, then attach an error message to the style.
    if (style.type == 'MATHJS' && style.meaning == 'INPUT') {
      let node: math.MathNode;
      try {
        node = math.parse(style.data);
      } catch(err) {
        const styleProps: StylePropertiesWithSubprops = {
          type: 'TEXT',
          meaning: 'ERROR',
          data: err.message,
        };
        const changeReq: StyleInsertRequest = {
          type: 'insertStyle',
          parentId: style.id,
          styleProps,
        };
        rval.push(changeReq);
        return;
      }
      const changeReq: StyleInsertRequest = {
        type: 'insertStyle',
        parentId: style.id,
        styleProps: { type: 'LATEX', data: node.toTex(), meaning: 'INPUT-ALT' },
      };
      rval.push(changeReq);
    }

    this.mathExtractVariablesRule(style, rval);
    this.mathEvaluateRule(style, rval);
    this.mathSimplifyRule(style, rval);
  }


  private mathEvaluateRule(style: StyleObject, rval: NotebookChangeRequest[]): void {

    // We only evaluate MathJS expressions that are user input.
    if (style.type != 'MATHJS') { return; }
    if (style.meaning!='INPUT' && style.meaning!='INPUT-ALT') { return; }

    // Do not evaluate more than once.
    if ((this.notebook.styleHasChildOfType(style, 'MATHJS', 'EVALUATION')) ||
        (this.notebook.styleHasChildOfType(style, 'TEXT', 'EVALUATION-ERROR'))) {
      return;
    }

    let e;
    try {
      e = this.parser.eval(style.data);
    } catch (err) {
      debug("error in eval", style.data, err.messsage);
      const firstLine = err.message;
      const changeReq: StyleInsertRequest = {
        type: 'insertStyle',
        parentId: style.id,
        styleProps: { type: 'TEXT', data: firstLine, meaning: 'EVALUATION-ERROR' },
      };
      rval.push(changeReq);
      return;
    }

    if (typeof e != 'number') { return; }

    // REVIEW: Should we introduce a number style?
    let eString = ""+ e;
    const changeReq: StyleInsertRequest = {
      type: 'insertStyle',
      parentId: style.id,
      styleProps: { type: 'MATHJS', data: eString, meaning: 'EVALUATION' },
    };
    rval.push(changeReq);
  }

  private mathExtractVariablesRule(style: StyleObject, rval: NotebookChangeRequest[]): void {
    // We only extract symbols from MathJS expressions that are user input.
    if (style.type != 'MATHJS') { return; }
    if (style.meaning!='INPUT' && style.meaning!='INPUT-ALT') { return; }

    // Do not extract symbols more than once.
    if (this.notebook.styleHasChildOfType(style, 'MATHJS', 'SYMBOL')) { return; }

    const parse = math.parse(style.data);
    if (!parse) { return; }

    const symbolNodes = collectSymbols(parse);
    symbolNodes.map(s => {
      const changeReq: StyleInsertRequest = {
        type: 'insertStyle',
        parentId: style.id,
        styleProps: { type: 'MATHJS', data: s, meaning: 'SYMBOL' },
      };
      rval.push(changeReq);
    });
  }

  // Attempt math.js-based simplification
  private mathSimplifyRule(style: StyleObject, rval: NotebookChangeRequest[]): void {
    // We only apply MathJS simplifications so MathJS styles that are user input.
    if (style.type != 'MATHJS') { return; }
    if (style.meaning!='INPUT' && style.meaning!='INPUT-ALT') { return; }

    // Do not apply simplification more than once.
    if (this.notebook.styleHasChildOfType(style, 'MATHJS', 'SIMPLIFICATION')) { return; }

    let simpler;
    try {
      simpler = math.simplify(style.data);
    } catch {
      // This is useful for debugging, but it is not error to fail to
      // be able to simplify something.
      //    debug("math.simplify failed on", style.data);
      return;
    }
    if (!simpler) { return; }

    // If the simplification hasn't changed anything then don't add it.
    const simplerText = simpler.toString();
    if (simplerText == style.data) { return; }
    const changeReq: StyleInsertRequest = {
      type: 'insertStyle',
      parentId: style.id,
      styleProps: {
        type: 'MATHJS',
        data: simplerText,
        meaning: 'SIMPLIFICATION',
        subprops: [
          { type: 'LATEX', data: simpler.toTex(), meaning: 'FORMULA-ALT' },
        ]
      },
    };
    rval.push(changeReq);
  }

}


// Helper Functions

// Traverses the MathJS expression tree, finds any symbol nodes,
// and returns an array of all of the symbols found.
function collectSymbols(node: math.MathNode) : string[] {
  var symbols: string[] = [];
  node.traverse(function (node, _path, _parent) {
    if (node.type == 'SymbolNode') {
      symbols.push(node.name || "Unknown node");
    }
  });
  return symbols;
}
