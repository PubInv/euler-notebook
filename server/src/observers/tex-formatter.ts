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

// TODO: Move a lot of this functionality to the high-level formula-observer.

// Requirements

import * as debug1 from "debug"
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

import { NotebookChange, StyleObject, RelationshipObject, StyleId } from "../shared/notebook"
import {  NotebookChangeRequest, StyleInsertRequest,
          StyleDeleteRequest, StylePropertiesWithSubprops,
       } from "../shared/math-tablet-api"
import { ServerNotebook, ObserverInstance } from "../server-notebook"
import { convertWolframToTeX, convertEvaluatedWolframToTeX, constructSubstitution
       } from "../wolframscript"
import { Config } from "../config"

// Exported Class

export class TeXFormatterObserver implements ObserverInstance {

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
    debug(`onClose ${this.notebook.path}`);
    delete this.notebook;
  }

  // This should be used to get the unrendered Latex as an alert with a copy!
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


  // // Overwrite a with b
  private overWrite(a : NotebookChangeRequest[], b : NotebookChangeRequest[]) {
    let j = b.length;
    for(var i = 0; i < j; i++) {
      a[i] = b[i];
    }

    a.length = j;
    return a;

  }


  // A fundamental problem here is that a common pattern is to
  // delete a relationship and then immediately insert a similar
  // relationship. If these are processed asynchronously (before
  // a deletion cauesd by the first change takes affect), this
  // leads to double duplication of the TEX-Style.  This cannot
  // be solved in any simple way.  I have therefore implemented
  // the de-dup code above. However in discussion with DJE we have
  // decided that in any case we must handle some inconsistency because
  // we support concurrent editing by multiple users. -rlr

  // Note: This is a good candidate for integrating into the metra-framework,
  // as it is probably useful outside this observer. However, I have
  // no reason to do so yet, and wish to be conservative. -rlr
  private deDupChanges(rval: NotebookChangeRequest[]): NotebookChangeRequest[] {
    rval = rval.filter((thing,index) => {
      return index === rval.findIndex(obj => {
        return JSON.stringify(obj) === JSON.stringify(thing);
      });
    });
    return rval;
  }

  private async onChange(change: NotebookChange, rval: NotebookChangeRequest[]): Promise<void> {
    if (change == null) return;
    debug(`onChange ${this.notebook.path} ${change.type}`);
    switch (change.type) {
      // TODO: 'styleChanged'
      case 'styleInserted':
        await this.latexFormatterRule(change.style, rval);
        break;

        // I believe it must be wrong to call the same thing here; if only because it produced duplication.
      case 'relationshipInserted':
        await this.texFormatterChangedRule(change.relationship, rval);
        this.overWrite(rval,this.deDupChanges(rval));
        break;
      case 'relationshipDeleted':
        await this.texFormatterChangedRule(change.relationship, rval);
        this.overWrite(rval,this.deDupChanges(rval));
        break;
      default: break;
    }
  }

  private async texFormatterChangedRule(relationship: RelationshipObject, rval: NotebookChangeRequest[]): Promise<void> {
    // we need to ge the parent here..
    var top;
    try {
      top = this.notebook.topLevelStyleOf(relationship.toId);
    } catch (e) {
      // if the relationship is not found, it has probably been deleted.
      // Until we add more discipline about deleting relationships,
      // returning may be the best thing to do here.
      return;
    }

    // Now, we will simply delete everyting and recalculate as an
    // initial strategy.
    // REVIEW: Does this search need to be recursive?
    const texs : StyleObject[] =
      this.notebook.findStyles({ type: 'TEX-EXPRESSION', role: 'DECORATION', recursive: true }, top.id);
    const rids = new Set<number>();
    for(const itex of texs) {
      const sid : StyleId = itex.id;
      rids.add(sid);
      const styleRemoved = this.notebook.getStyle(sid);
      const styleToReconsider = this.notebook.getStyle(styleRemoved.parentId);
      await this.latexFormatterRule(styleToReconsider,rval);
    }
    rids.forEach(id => {
      const changeReq: StyleDeleteRequest = {
         type: 'deleteStyle',
         styleId: id
      };
      rval.push(changeReq);
    });
  }

  // This routine is responsible for inserting any tex formats we can deduce from a given style.
  // At present these are:
  // * Symbol-defintion
  // * Equation-definition
  // These should be straitforward, but do depend on the "environment",
  // that is, any defined symbols which are used therein. Thus changes
  // in thoughts related to, but not the same as, this thought, may require
  // recomputation.
  private async latexFormatterRule(style: StyleObject, rval: NotebookChangeRequest[]): Promise<void> {

    if (!((style.type == 'SYMBOL-DATA' && style.role == 'SYMBOL-DEFINITION')
          || (style.type == 'EQUATION-DATA' && style.role == 'EQUATION-DEFINITION')
         )) {
      return;
    }


    debug("TEX-FORMATTER ",style);
    // This is throwing an error. I assume because of concurrency.
    // We may have to handle with a try-catch, but we must understand
    // the problem first.
    const parent = this.notebook.topLevelStyleOf(style.id);

    debug("getting dependencies",style,parent);
    //    var usedSymbols = this.notebook.getSymbolStylesIDependOn(parent);
    var usedSymbols = this.notebook.getSymbolStylesIDependOn(style);
    debug("usedSymbols",usedSymbols);
    usedSymbols = usedSymbols.filter(function( element ) {
      return element !== undefined;
    });
    debug("usedSymbols",usedSymbols);

    var lhs = null;
    var rhs = null;

    // These types have slightly different data morphologies, but are
    // similar enough we can process almost the same way
    debug("style",style);
    if (style.type == 'SYMBOL-DATA' && style.role == 'SYMBOL-DEFINITION') {
      lhs = style.data.name;
      rhs = style.data.value;
    } else if (style.type == 'EQUATION-DATA' && style.role == 'EQUATION-DEFINITION') {
      lhs = style.data.lhs;
      rhs = style.data.rhs;
    } else {
      throw new Error("internal error");
    }
    const sub_expr_lhs : string =
      constructSubstitution(lhs,
                            usedSymbols.map(
                              s => ({ name: s.data.name,
                                      value: s.data.value})));
    const sub_expr_rhs : string =
      constructSubstitution(rhs,
                            usedSymbols.map(
                              s => ({ name: s.data.name,
                                      value: s.data.value})));
    // I need to create a definite criteria for when this
    // should be called, as opposed to straight conversion!
    const texrhs : string = await convertEvaluatedWolframToTeX(sub_expr_rhs);

    var tex_def = null;
    debug("type, role", style.type, style.role);
    debug("texlhs, texrhs",texrhs);
    if (style.type == 'SYMBOL-DATA' && style.role == 'SYMBOL-DEFINITION') {
      tex_def = style.data.name + " = " + texrhs;
    } else if (style.type == 'EQUATION-DATA' && style.role == 'EQUATION-DEFINITION') {
      const texlhs : string = await convertWolframToTeX(sub_expr_lhs);
      if (texrhs && texlhs) {
        tex_def = texlhs + " = " + texrhs
      } // otherwise tex_def remains null and will not be pushed...
    }

    if (tex_def != null) {
      // Create the latex
      const styleProps: StylePropertiesWithSubprops = {
        type: 'TEX-EXPRESSION',
        role: 'DECORATION',
        data: tex_def,
      }
      const changeReq: StyleInsertRequest = {
        type: 'insertStyle',
        parentId: style.id,
        styleProps: styleProps
      };
      rval.push(changeReq);
    }

    debug("pushed rval AAAA",rval);
    return;

  }

// Private Functions

}
