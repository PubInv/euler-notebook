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
         RelationshipObject,
         StyleId
       } from '../../client/notebook';
import {  NotebookChangeRequest, StyleInsertRequest,
          StyleDeleteRequest, StylePropertiesWithSubprops,
       } from '../../client/math-tablet-api';
import { ServerNotebook, ObserverInstance } from '../server-notebook';
import { findTeXForm, constructSubstitution
       } from './wolframscript';
import { Config } from '../config';




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

  // This should be used to get the unrendered Latex as an alert with a copy!
  public async useTool(toolStyle: StyleObject): Promise<NotebookChangeRequest[]> {
    debug(`useTool ${this.notebook._path} ${toolStyle.id}`);
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


  // This I am only implementing this because I can't
  // figure out where the duplication is coming from.
  // It think because we recompute on both a deletion and an insertion,
  // we endup creating duplicate deletions. But precisely how this happens
  // I don't really know.
  private deDupChanges(rval : NotebookChangeRequest[]) {
    rval = rval.filter((thing,index) => {
      return index === rval.findIndex(obj => {
        return JSON.stringify(obj) === JSON.stringify(thing);
      });
    });
    return rval;
  }

  private async onChange(change: NotebookChange, rval: NotebookChangeRequest[]): Promise<void> {
    if (change == null) return;
    debug(`onChange ${this.notebook._path} ${change.type}`);
    switch (change.type) {
      case 'styleInserted':
        await this.latexFormatterRule(change.style, rval);
        break;
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
        const texs : StyleObject[] =
      this.notebook.findChildStylesOfType(top.id,'LATEX','DECORATION');
    const rids = new Set<number>();
    for(const itex of texs) {
      const sid : StyleId = itex.id;
      rids.add(sid);
      const styleRemoved = this.notebook.getStyleById(sid);
      const styleToReconsider = this.notebook.getStyleById(styleRemoved.parentId);
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
  private async latexFormatterRule(style: StyleObject, rval: NotebookChangeRequest[]): Promise<void> {
    // At present, it only makes sense to operate on styles of type "WOLFRAM",
    // the some styles, such as "EQUATION", may have components where are WOLFRAM
    // expression, exposing some underlying inconsistency in data treatment.

    // We happen to know that even if they use "wolfram", we are interpreting
    // an "equation" specially.  That is, we consider "4 = x^2 + y^2" a legal
    // input expression, which we interpret at "4 == x^2 + y^2".  So in a
    // sense we need to detext this case, wich we treat as an equation.
    // I think the best thing here is to catch the error, allow it to fail,
    // and then treat the "EQUATION" style separately!  Hairy---but this
    // project is all about the hair.
    // if (style.type == 'WOLFRAM' && style.meaning == 'INPUT') {
    //   var text: string = style.data;
    //   debug("INSIDE SOLVER RULE :",text);
    //   const tex : string = await findTeXForm(style.data);
    //   if (tex) {
    //     // Create the latex
    //     const styleProps: StylePropertiesWithSubprops = {
    //       type: 'LATEX',
    //       // This is the best meaning without creating one specifically for this purpose..
    //       meaning: 'DECORATION',
    //       data: tex,
    //     }
    //     const changeReq: StyleInsertRequest = {
    //       type: 'insertStyle',
    //       parentId: style.id,
    //       styleProps: styleProps
    //     };
    //     rval.push(changeReq);
    //   }
    // } else
    if (style.type == 'SYMBOL' && style.meaning == 'SYMBOL-DEFINITION') {

      var text: string = style.data;
      debug("INSIDE SOLVER RULE :",text);

      // We need to compute the top ancestor here, since the symbol uses hang off that.
      const parent = this.notebook.topLevelStyleOf(style.id);

      debug("getting dependencies",style,parent);
      var usedSymbols = this.notebook.getSymbolStylesIDependOn(parent);
      debug("usedSymbols",usedSymbols);
      usedSymbols = usedSymbols.filter(function( element ) {
   return element !== undefined;
});
      const sub_expr_lhs : string =
        constructSubstitution(style.data.name,
                              usedSymbols.map(
                                s => ({ name: s.data.name,
                                        value: s.data.value})));
      const sub_expr_rhs : string =
        constructSubstitution(style.data.value,
                              usedSymbols.map(
                                s => ({ name: s.data.name,
                                        value: s.data.value})));

      const lhs : string = sub_expr_lhs;
      debug("LHS",lhs);
      const rhs : string = await findTeXForm(sub_expr_rhs);
      debug("RHS",rhs);
      debug("Tex formatter", text, lhs,rhs);
      const tex_def = style.data.name + " = " + rhs;
      debug("Tex_def", tex_def);

      // Create the latex
      const styleProps: StylePropertiesWithSubprops = {
        type: 'LATEX',
        // This is the best meaning without creating one specifically for this purpose..
        meaning: 'DECORATION',
        data: tex_def,
      }

      const changeReq: StyleInsertRequest = {
        type: 'insertStyle',
        parentId: style.id,
        styleProps: styleProps
      };

      rval.push(changeReq);
      debug("pushed rval",rval);
      return;
    } else if (style.type == 'EQUATION' && style.meaning == 'EQUATION-DEFINITION') {

      const parent = this.notebook.topLevelStyleOf(style.id);

      const usedSymbols = this.notebook.getSymbolStylesIDependOn(parent);
      debug("usedSymbols",usedSymbols);
      const sub_expr_lhs : string =
        constructSubstitution(style.data.lhs,
                              usedSymbols.map(
                                s => ({ name: s.data.name,
                                        value: s.data.value})));
      const sub_expr_rhs : string =
        constructSubstitution(style.data.rhs,
                              usedSymbols.map(
                                s => ({ name: s.data.name,
                                        value: s.data.value})));

      // Here we have a bit of a problem...we should probably just conjoin the tex
      // from the lhs and rhs...
      const texlhs : string = await findTeXForm(sub_expr_lhs);
      const texrhs : string = await findTeXForm(sub_expr_rhs);

      debug("Tex formatter", texlhs,"/", texrhs);
      if (texrhs && texlhs) {

        // Create the latex
        const styleProps: StylePropertiesWithSubprops = {
          type: 'LATEX',
          // This is the best meaning without creating one specifically for this purpose..
          meaning: 'DECORATION',
          /// This is a bit of a guess..
          data: texlhs + " = " + texrhs,
        }

        const changeReq: StyleInsertRequest = {
          type: 'insertStyle',
          parentId: style.id,
          styleProps: styleProps
        };
        rval.push(changeReq);
      }
      return;
    }

  }


// Private Functions
}
