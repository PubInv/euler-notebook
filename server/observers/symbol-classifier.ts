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

import { NotebookChange, StyleObject, RelationshipProperties } from '../../client/notebook';
import { SymbolData, WolframData, NotebookChangeRequest, StyleInsertRequest, StylePropertiesWithSubprops, RelationshipPropertiesMap, RelationshipInsertRequest,
//         RelationshipDeleteRequest
       } from '../../client/math-tablet-api';
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


  // Note: This can be separated into an attempt to compute new solutions..
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

  private getLatestOfListOfStyleIds(styles: number[]) : number {
    debug("INPUT STYLES",styles);
    const [max,maxstyle] = styles.reduce(
      (acc,val) => {
          const idx = this.notebook.getThoughtIndex(val);
          const max = acc[0];
          if (idx > max) {
            return [idx,val]
          } else {
            return acc;
          }
      },[-1,-1]
    );

    debug("GREATEST",maxstyle);
    if (max >= 0)
      return maxstyle;
    else
      return -1; // This would actually be an internal error
  }

  private async onChange(change: NotebookChange, rval: NotebookChangeRequest[]): Promise<void> {
    debug(`onChange ${this.notebook._path} ${change.type}`);
    switch (change.type) {
      case 'styleInserted': {
        const style = change.style;

        const tlid = this.notebook.topLevelStyleOf(style.id).id;
        // I believe listening only for the WOLFRAM/INPUT forces
        // a serialization that we don't want to support. We also must
        // listen for definition and use and handle them separately...
        if (style.type == 'WOLFRAM' && style.meaning == 'INPUT' ||style.meaning == 'INPUT-ALT') {
          await this.addSymbolUseStyles(style, rval);
          await this.addSymbolDefStyles(style, rval);
        }
        // I believe we need to explicitly add the relations here;
        // which may mean that we could remove them from the code
        // which adds them as part of the insertion, in order to
        // create greater independence of responsibility
        if (style.type == 'SYMBOL' && (style.meaning == 'SYMBOL-USE' || style.meaning == 'SYMBOL-DEFINITION')) {
          const name = (style.meaning == 'SYMBOL-USE') ?
            style.data :
            style.data.name;
          //          debug('name',name);
          //          const lookFor = (style.meaning == 'SYMBOL-USE') ? 'SYMBOL-DEFINITION' :
          //            'SYMBOL-USE';
          const relationsUse: RelationshipPropertiesMap =
            this.getAllMatchingNameAndType(name,'SYMBOL-USE');
          const relationsDef: RelationshipPropertiesMap =
            this.getAllMatchingNameAndType(name,'SYMBOL-DEFINITION');
          const relations = (style.meaning == 'SYMBOL-USE') ? relationsDef :
            relationsUse;

          // TODO: These are using chronological order, not
          // users-specified order

          // In reality, we need to order by Top level object!
          // So when we have the ids, we have to sort by
          // a function based on top-level object!
          var defs:number[] = [];
          // @ts-ignore
          for (const [idStr, _props] of Object.entries(relationsDef)) {
            const v =  parseInt(idStr,10);
            const tlidv = this.notebook.topLevelStyleOf(v).id;
            if (tlidv < tlid)
              defs.push(v);
          }

          // In reality, we need to order by Top level object!
          // So when we have the ids, we have to sort by
          // a function based on top-level object!
          var uses:number[] = [];
          // @ts-ignore
          for (const [idStr, _props] of Object.entries(relationsUse)) {
            const v =  parseInt(idStr,10);
            const tlidv = this.notebook.topLevelStyleOf(v).id;
            // This is a little weird; uses must occur AFTER their
            // defintions, though this is very confusing
            if (tlidv > tlid)
              uses.push(v);
          }

          if (relations) {
            const index = (style.meaning == 'SYMBOL-USE') ?
              this.getLatestOfListOfStyleIds(defs) :
              this.getLatestOfListOfStyleIds(uses);
            if (index >= 0) {
              const props : RelationshipProperties = { meaning: 'SYMBOL-DEPENDENCY' };

              const changeReq: RelationshipInsertRequest =
                { type: 'insertRelationship',
                  fromId:
                  (style.meaning == 'SYMBOL-USE') ?
                  index :
                  style.id,
                  toId:
                  (style.meaning == 'SYMBOL-USE') ?
                  style.id :
                  index,
                  props: props };
              rval.push(
                changeReq
              );
            }
          }

          // // Additionally, we have the problem that this
          // // definition may relationships from earlier styles,
          // // if they are for the same variable.
          // const rels = this.notebook.allRelationships();
          // console.log("RELATIONS",rels);
          // for(const r of rels) {
          //   // See if we are on the same symbol...
          //   console.log("RRR",r);
          //   if (r.source == 'SYMBOL-CLASSIFIER') {
          //     var def_name = this.notebook.getStyleById(r.fromId).data;
          //     console.log("DEF_NANE",name.name,def_name.name);
          //     if (name.name == def_name.name) {
          //       const tlidf = this.notebook.topLevelStyleOf(r.fromId).id;
          //       const tlidt = this.notebook.topLevelStyleOf(r.toId).id;
          //       //
          //       console.log("tlid,tldidf,tlidt", tlid, tlidf,tlidt);
          //       if (tlidf < tlid) {
          //         console.log("deleting");
          //         // In this case, we are deletable.
          //         const changeReq: RelationshipDeleteRequest =
          //           { type: 'deleteRelationship',
          //             id: r.id,
          //           }
          //         rval.push(
          //           changeReq
          //         );
          //       }
          //     }
          //     // See if we are ealier....
          //     // then invalidate
          //   }
          // }

          // So we run over all relationships that may be earlier
          // and delete some of them....

          // Now we need to check for inconsistency;
          if (style.meaning == 'SYMBOL-DEFINITION') {

            // In reality, we need to order by Top level object!
            // So when we have the ids, we have to sort by
            // a function based on top-level object!
            var defs:number[] = [];
            // @ts-ignore
            for (const [idStr, _props] of Object.entries(relationsDef)) {
              const v =  parseInt(idStr,10);
              if (v < style.id)
                defs.push(v);
            }
            //            const tops = this.notebook.topLevelStyleOrder();
            //            debug("relationsDef",defs,defs.length);
            //            debug("relationsDef",defs,defs.length);
            if (defs.length >= 1) {
              const dup_prop : RelationshipProperties =
                { meaning: 'DUPLICATE-DEFINITION' };
              //             const last_def = defs[defs.length-1];

              //              const last_def_new = this.getLatestOfListOfStyleIds(defs);
              const last_def = this.getLatestOfListOfStyleIds(defs);
              //              console.log("LAST_OLD, LAST_NEW",last_def, last_def_new);

              if (last_def < style.id) {
                // @ts-ignore
                const changeReq: RelationshipInsertRequest =
                  { type: 'insertRelationship',
                    fromId: last_def,
                    toId: style.id,
                    props: dup_prop };
                console.log("PUSHHHHH BBB",changeReq);
                rval.push(
                  changeReq
                );
              }
            }
          }
          //        console.log("RVAL",rval);
          break;
        }
      }
    }
  }

  // refactor this to be style independent so that we can figure it out later

  private async addSymbolDefStyles(style: StyleObject, rval: NotebookChangeRequest[]): Promise<void> {
    debug('addSymbolDefStyles');
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

      const relationsTo: RelationshipPropertiesMap =
        this.getAllMatchingNameAndType(name,'SYMBOL-USE');

        var styleProps: StylePropertiesWithSubprops;

        if (name.match(/^[a-z]+$/i)) {
          debug('defining symbol',name);
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

  private getAllMatchingNameAndType(name: string,
                                    useOrDef: 'SYMBOL-DEFINITION' | 'SYMBOL-USE') :  RelationshipPropertiesMap {
      // Add the symbol-use style
      const relationsFrom: RelationshipPropertiesMap = {};
    // Add any symbol-dependency relationships as a result of the new symbol-use style
    if (this.notebook) {
    console.log("ALL STYLES",this.notebook);
      for (const otherStyle of this.notebook.allStyles()) {
        if (otherStyle.type == 'SYMBOL' &&
            otherStyle.meaning == useOrDef &&
            otherStyle.data.name == name) {
          relationsFrom[otherStyle.id] = { meaning: 'SYMBOL-DEPENDENCY' };
          debug(`Inserting relationship`);
        }
      }
    } else {
      // Surely this is an error?!?
    }
    return relationsFrom;
  }

  private getLatestMatchingNameAndType(name: string,
                                       useOrDef: 'SYMBOL-DEFINITION' | 'SYMBOL-USE') :  RelationshipPropertiesMap {
    // Add the symbol-use style

    const relationsFrom: RelationshipPropertiesMap = {};
    // Add any symbol-dependency relationships as a result of the new symbol-use style
    console.log("ALL STYLES",this.notebook);
    // This code as actually longer than doing it
    // in a loop; nontheless I prefer this "reduce" style
    // because I suspect we will have to do "sorting" by thought
    // order at some point, and this basic approach with then become
    // reusable.  In fact, I cold implment a "sort" now and use it
    // to compute the "lates" but that is a tad wastefule. - rlr
    const [max,maxstyle] = this.notebook.allStyles().reduce(
      (acc,val) => {
        if (val.type == 'SYMBOL' &&
          val.meaning == useOrDef &&
            val.data.name == name) {
          const idx = this.notebook.getThoughtIndex(val.id);
          const max = acc[0];
          if (idx > max) {
            return [idx,val.id]
          } else {
            return acc;
          }
        } else {
          return acc;
        }
      },[-1,-1]
    );;

    // for (const otherStyle of this.notebook.allStyles()) {
    //   if (otherStyle.type == 'SYMBOL' &&
    //       otherStyle.meaning == useOrDef &&
    //       otherStyle.data.name == name) {
    //     debug(`Inserting relationship`);
    //     // This really needs to use top-level tought order!
    //     const idx = this.notebook.getThoughtIndex(otherStyle.id);
    //     if (idx > max) {
    //       max = idx;
    //       maxstyle = otherStyle.id;
    //     }
    //   }
    // }
    if (max >=0) {
      relationsFrom[maxstyle] = { meaning: 'SYMBOL-DEPENDENCY' };
    }
    return relationsFrom;
  }
private async  addSymbolUseStyles(style: StyleObject, rval: NotebookChangeRequest[]): Promise<void> {
    await this.addSymbolUseStylesFromString(style.data, style, rval);
  }
  private async  addSymbolUseStylesFromString(data: string,style: StyleObject, rval: NotebookChangeRequest[]): Promise<void> {
    const symbols = await this.findSymbols(data);
    symbols.forEach(s => {
      const relationsFrom: RelationshipPropertiesMap =
        this.getLatestMatchingNameAndType(s,'SYMBOL-DEFINITION');

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
