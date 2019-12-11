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
// import { MthMtcaText } from '../client/math-tablet-api';
import { StyleObject, NotebookChange, StyleId, RelationshipProperties } from '../../client/notebook';
import { NotebookChangeRequest, StyleInsertRequest, StyleDeleteRequest, StylePropertiesWithSubprops, RelationshipInsertRequest, isEmptyOrSpaces } from '../../client/math-tablet-api';
import { ServerNotebook, ObserverInstance } from '../server-notebook';
import { execute, constructSubstitution, checkEquiv, NVPair } from './wolframscript';
// import * as fs from 'fs';
import { Config } from '../config';

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// Types

interface StyleIdToBooleanMap {
  [key: number]: boolean;
}

// Exported Class

export class MathematicaObserver implements ObserverInstance {

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
    let rval: NotebookChangeRequest[] = [];
    for (const change of changes) {
      const changeRequests = await this.onChange(change);
      rval = rval.concat(changeRequests);
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

  public async useTool(style: StyleObject): Promise<NotebookChangeRequest[]> {
    throw new Error(`Unexpected useTool for style ${style.id}`);
    // const toolInfo: ToolInfo = style.data;
    // if (toolInfo.name != 'checkeqv') { throw new Error(`Unexpected tool ${toolInfo}`)};
    // debug("INSIDE onUSE BEGIN :");
    // debug("INSIDE onUSE CHECKEQV :", toolInfo.data.styleId);
    // await this.checkEquivalence(style);
  }

  // --- PRIVATE ---

  // Private Constructor

  private constructor(notebook: ServerNotebook) {
    this.notebook = notebook;
  }

  // Private Instance Properties

  private notebook: ServerNotebook;

  private getSubstitutionsForStyle(style : StyleObject) :  NVPair[]  {
    const rs = this.notebook.getSymbolStylesIDependOn(style);
    debug("RS",rs);
    try {
      let variables: string[] = [];
      for(var s in style.data) {
        variables.push(style.data[s]);
      }

      debug("variables, pre-process",variables);

      const substitutions : NVPair[] =
        rs.map(
          s => {
            variables = variables.filter(ele => (
              ele != s.data.name));
            return { name: s.data.name,
                    value: s.data.value};
          }
        );
      debug("variables, post-process",variables);
      return substitutions;
    } catch (e) {
      debug("error evaluting equivalentce",e);
      return [];
    }
  }

  private async checkEquivalenceRule(style: StyleObject): Promise<NotebookChangeRequest[]> {
    if (style.type != 'WOLFRAM') { return []; }

    if (isEmptyOrSpaces(style.data)) { return []; }

    const rval: NotebookChangeRequest[] = [];

    try {
      const substitutions : NVPair[] = this.getSubstitutionsForStyle(style);
      const sub_expr =
        constructSubstitution(style.data,
                              substitutions);

      debug("sustitutions",substitutions);
      debug("sub_expr",sub_expr);

      const parentThought =  this.notebook.topLevelStyleOf(style.id);

      const expressions = this.notebook.allStyles().filter(
        (s: StyleObject, _index: number, _array: StyleObject[]) => {
          const anc = this.notebook.topLevelStyleOf(s.id);
          if (anc == parentThought) return false;
          else {
            debug(s);
            debug(((s.type == 'WOLFRAM') && (s.meaning == 'INPUT' || s.meaning == 'INPUT-ALT')));
            return ((s.type == 'WOLFRAM') && (s.meaning == 'INPUT' || s.meaning == 'INPUT-ALT'));
          }
        });
      debug("expressions",expressions);
      // Now I will try to build a table...

      const expressionEquivalence : StyleIdToBooleanMap = {};
      const sub_expr1 =
        constructSubstitution(style.data,substitutions);
      for (var exp of expressions) {
        const expressID : number = exp.id;
        try {
          const esubs : NVPair[] = this.getSubstitutionsForStyle(exp);
          const sub_expr2 =
            constructSubstitution(exp.data,esubs);
          debug("substituted expressions",sub_expr1,sub_expr2);
          const equiv = await checkEquiv(sub_expr1,sub_expr2);
          expressionEquivalence[expressID] = equiv;
        } catch (e) {
          debug("error evaluting equivalentce",e);
          expressionEquivalence[expressID] = false;
        }
      }
      debug("expressions",expressionEquivalence);
      let styleIds = [];
      for(var key in expressionEquivalence) {
        const keynum : number = <number>(<unknown>key);
        debug("key,value",key,expressionEquivalence[keynum]);
        if (expressionEquivalence[keynum]) {
          styleIds.push(keynum);
          const eqstyle = this.notebook.getStyleById(<StyleId><unknown>keynum);
          let src : StyleObject;
          let tar : StyleObject;
          if (style.id < keynum) {
            src = style;
            tar = eqstyle;
          } else {
            src = eqstyle;
            tar = style;
          }
          // At present, we have a bug where we  are getting the equivalence
          // attached to both the thought and the style. I'm not sure how to
          // deal with this. I'm guessing that we ONLY want to attach
          // to a wolfram input style. This is arguable; but this the advantage of
          // producing a "thought" to "thought" approach.
          if (!((src.meaning == 'EVALUATION') || (tar.meaning == 'EVALUATION'))) {
            const props: RelationshipProperties = { meaning: 'EQUIVALENCE' };
            const cr: RelationshipInsertRequest = {
              type: 'insertRelationship',
              fromId: src.id,
              toId: tar.id,
              props,
            }
            rval.push(cr);
            debug("adding relationship");
          }
        }
      }
      debug("notebook Relationships",this.notebook.allRelationships());
    } catch (e) {
      debug("MATHEMATICA Check Equivalence :",e);
    }
    return rval;
  }

  private async onChange(change: NotebookChange): Promise<NotebookChangeRequest[]> {
    debug("OnChange change:",change);
    let rval: NotebookChangeRequest[] = [];
    if (change != null) {
      switch (change.type) {
          // I am unsure what to do here. I think it is best that we make sure
          // each rule is idempotent. Possibly this will be shown wrong later.
          // The basic prinicple is that if we do insert something, we should
          // make sure that any other inserted rules are deleted.
        case 'styleInserted':
        case 'styleChanged':
          debug("styleInserted : style",change.style);
          rval = rval.concat(
            await this.convertMathMlToWolframRule(change.style),
            await this.checkEquivalenceRule(change.style),
          );
          break;
        default: break;
      }
    }
    return rval;
  }

  private async convertMathMlToWolframRule(style: StyleObject): Promise<NotebookChangeRequest[]> {

    const rval: NotebookChangeRequest[] = [];

    if (style.type != 'MATHML') { return []; }
    if (style.meaning!='INPUT' && style.meaning!='INPUT-ALT') { return []; }

    const mathMl = style.data.split('\n').join('').replace(/"/g, '\\"');
    debug("mathML",mathMl);
    const cmd = `InputForm[MakeExpression[ImportString["${mathMl}", "MathML"]]]`;
    debug(cmd);
    try {
      const data = await execute(cmd);
      // In our current style, the result comes back as
      // HoldComplete[result].
      const regex = /HoldComplete\[(.*)\]/;
      const results = regex.exec(data);
      debug("regex results",results);
      if (results == null) throw new Error("could not match pattern:"+data);
      if (results[1] == null) throw new Error("could not match pattern:"+data);
      const wolframexpr = results[1];

      // TODO: Try to replace this witht he "ExcludeChild" rule
      // I believe that we should delete a type of of the same if it exists.
      // In fact this is a meta-rule --- for some styles, there is only one style
      // of a type allowed. It will be best to add that into the metaframework.
      let kids = this.notebook.findChildStylesOfType(style.id, 'WOLFRAM');
      for(const k of kids) {
        const changeReq: StyleDeleteRequest = {
          type: 'deleteStyle',
          styleId: k.id
        };
        rval.push(changeReq);
      }

      const styleProps: StylePropertiesWithSubprops = {
        type: 'WOLFRAM',
        meaning: 'INPUT-ALT',
        data: wolframexpr,
      };
      const cr: StyleInsertRequest = {
        type: 'insertStyle',
        parentId: style.id,
        styleProps,
      };
      rval.push(cr);

    } catch(err) {
      const styleProps: StylePropertiesWithSubprops = {
        type: 'TEXT',
        meaning: 'EVALUATION-ERROR',
        data: `Cannot convert to Wolfram expression: ${err.message}`,
        exclusiveChildTypeAndMeaning: true,
      };
      const cr: StyleInsertRequest = {
        type: 'insertStyle',
        parentId: style.id,
        styleProps,
      };
      rval.push(cr);
    }

    return rval;
  }
}
