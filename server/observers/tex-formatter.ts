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
       } from '../../client/notebook';
import {  NotebookChangeRequest, StyleInsertRequest, StylePropertiesWithSubprops,
       } from '../../client/math-tablet-api';
import { ServerNotebook, ObserverInstance } from '../server-notebook';
import { execute,
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

  private async onChange(change: NotebookChange, rval: NotebookChangeRequest[]): Promise<void> {
    debug(`onChange ${this.notebook._path} ${change.type}`);
    switch (change.type) {
      case 'styleInserted':
        await this.latexFormatterRule(change.style, rval);
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

  private async findTeXForm(text: string): Promise<string> {
    const getTex = `TeXForm[${text}]`;
    try {
      const tex = await execute(getTex);
      return tex;
    }  catch (e) {
      return "";
    }
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

    if (style.type == 'WOLFRAM') {

      var text: string = style.data;
      debug("INSIDE SOLVER RULE :",text);

      const tex : string = await this.findTeXForm(style.data);
      debug("Tex formatter", text, tex);
      if (tex) {

        // Create the latex
        const styleProps: StylePropertiesWithSubprops = {
          type: 'LATEX',
          // This is the best meaning without creating one specifically for this purpose..
          meaning: 'DECORATION',
          data: tex,
        }

        const changeReq: StyleInsertRequest = {
          type: 'insertStyle',
          parentId: style.id,
          styleProps: styleProps
        };
        rval.push(changeReq);
      }
      return;
    } else if (style.type == 'EQUATION') {
      // Here we have a bit of a problem...we should probably just conjoin the tex
      // from the lhs and rhs...
      const texlhs : string = await this.findTeXForm(style.data.lhs);
      const texrhs : string = await this.findTeXForm(style.data.rhs);

      debug("Tex formatter", texlhs, texrhs);
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
