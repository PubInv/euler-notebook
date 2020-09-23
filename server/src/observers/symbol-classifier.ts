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

import * as debug1 from "debug";
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

import { Html } from "../shared/common";
import {
  NotebookChange, StyleObject, StyleId, RelationshipObject, RelationshipId, RelationshipProperties,
  StyleDeleted, StyleMoved, FindRelationshipOptions, StyleInserted, StyleChanged, HintData,
  HintRelationship, HintStatus, FormulaData, WolframExpression
} from "../shared/notebook";
import {
  SymbolData, NotebookChangeRequest, StyleInsertRequest, ToolData, StyleDeleteRequest,
  StylePropertiesWithSubprops, RelationshipPropertiesMap, RelationshipInsertRequest,
  isEmptyOrSpaces, TransformationToolData, TexExpression
} from "../shared/math-tablet-api";
import { ServerNotebook, ObserverInstance } from "../server-notebook";
import { execute as executeWolframscript, constructSubstitution, draftChangeContextName,
         convertWolframToMTL } from "../adapters/wolframscript";
import { Config } from "../config";

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

  public async onChangesAsync(changes: NotebookChange[]): Promise<NotebookChangeRequest[]> {
    const rval: NotebookChangeRequest[] = [];
    for (const change of changes) {
      await this.onChange(change, rval);
    }
    return rval;
  }

  public onChangesSync(_changes: NotebookChange[]): NotebookChangeRequest[] {
    return [];
  }

  public  onClose(): void {
    debug(`onClose ${this.notebook.path}`);
    // TODO: Mark closed somehow?
  }


  // Note: This can be separated into an attempt to compute new solutions..
  // public async useTool(toolStyle: StyleObject): Promise<NotebookChangeRequest[]> {
  //   debug(`useTool ${this.notebook.path} ${toolStyle.id}`);
  //   return [];
  // }


  // TODO: This is a direct duplicate code in algebraic-tools.ts
  // that duplication must be removed.
  public async useTool(toolStyle: StyleObject): Promise<NotebookChangeRequest[]> {
    debug(`useTool ${this.notebook.path} ${toolStyle.id}`);

    // the origin_id is a relationship Id; we want a "From ID" in the
    // style for the HINT, at least I think so if doing as a refactoring
    const relationship = this.notebook.getRelationship(toolStyle.data.origin_id);
    //    const fromId = this.notebook.topLevelStyleOf(relationship.fromId).id;
    const fromId = relationship.fromId;
    const toId = this.notebook.reserveId();
    const relId = this.notebook.reserveId();

    const data: HintData = {
      relationship: HintRelationship.Implies,
      status: HintStatus.Correct,
      idOfRelationshipDecorated: relId
    };

    const hintProps: StylePropertiesWithSubprops = {
      role: 'HINT', type: 'HINT-DATA', data,
      subprops: [
        { role: 'INPUT', type: 'PLAIN-TEXT', data: `From ${toolStyle.data.name}` },
      ]
    };
    const hintReq: StyleInsertRequest = {
      type: 'insertStyle',
      // TODO: afterId should be ID of subtrivariate.
      styleProps: hintProps,
    };

    const wolframData = toolStyle.data.data.output;
    const formulaData: FormulaData = { wolframData };
    const styleProps: StylePropertiesWithSubprops = {
      id: toId,
      role: 'FORMULA',
      type: 'FORMULA-DATA',
      data: formulaData,
    };
    const changeReq: StyleInsertRequest = {
      type: 'insertStyle',
      // TODO: afterId should be ID of subtrivariate.
      styleProps,
    };
    // At present, the tool name is the only data we will record
    // about the transformation---in the future that might be enriched.
    const tdata: TransformationToolData =
      { output : toolStyle.data.data.output,
        transformation: toolStyle.data.data.transformation,
        transformationName: toolStyle.data.name };
    const props : RelationshipProperties = { role: 'TRANSFORMATION',
                                             id: relId,
                                             data: tdata };

    const relReq : RelationshipInsertRequest =
      { type: 'insertRelationship',
        fromId,
        toId,
        inStyles: [ { role: 'LEGACY', id: fromId } ],
        outStyles: [ { role: 'LEGACY', id: toId } ],
        props: props
      };

    return [ hintReq, changeReq, relReq ];
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
    const [max,maxstyle] = styles.reduce(
      (acc,val) => {
          const idx = this.notebook.topLevelStylePosition(val);
          const max = acc[0];
          if (idx > max) {
            return [idx,val]
          } else {
            return acc;
          }
      },[-1,-1]
    );

    if (max >= 0)
      return maxstyle;
    else
      return -1; // This would actually be an internal error
  }

  private async deleteRule(change: StyleDeleted, rval: NotebookChangeRequest[]) : Promise<void>  {

    const style = change.style;
    if (style.type == 'SYMBOL-DATA' && (style.role == 'SYMBOL-USE' || style.role == 'SYMBOL-DEFINITION')) {
      this.deleteRelationships(style, rval);
    }
    this.deleteDependentHints(style,rval);
  }

  // TODO: I personally think this should be added to the high-level api
  // by allow any style to declare styles which invalidate it when removed
  // or force its re-computation when changed. - rlr
  // Doing it this way seems to create the possibility of multiple deletes
  // do to concurrency problems.
  private async deleteDependentHints(style: StyleObject, rval: NotebookChangeRequest[]) : Promise<void>  {
  //    if (style.source == 'SYMBOL-CLASSIFIER') {
        const did = style.id;

    // RLR ALERT: This is returning null values from fromId and toId!!! It appears that
    // the HINT change to mention a relationship, and this code never changed to match it.
    // The impact is that nothing gets deleted based on relationship dependencies, which is weird.
        const hints = this.notebook.findStyles({ type: 'HINT-DATA', role: 'HINT', recursive: true });
    hints.forEach(h => {
      debug("hint",h);
          const fromId = h.data.fromId;
          const toId = h.data.toId;
          debug("=================== ",fromId,toId,did);
          if ((did == fromId) || (did == toId)) {
            const deleteReq : StyleDeleteRequest = { type: 'deleteStyle',
                                                   styleId: h.id };
            rval.push(deleteReq);
          }
        });
//      }
  }
  private async deleteRelationships(style: StyleObject, rval: NotebookChangeRequest[]) : Promise<void>  {
      if (style.role == 'SYMBOL-DEFINITION') {
        const did = style.id;

        // not this is nullable, and is a Relationship.
        var duplicateof : RelationshipObject | undefined;
        const rs = this.notebook.allRelationships();
        rs.forEach(r => {
          if ((r.toId == did) && r.role == 'DUPLICATE-DEFINITION') {
            if (duplicateof != null) {
              debug("INTERNAL ERROR: Linearity of defintions broken1!");
              throw new Error("INTERNAL ERROR: Linearity of defintions broken1!"+r);
            }
            duplicateof = r;
          }
        });

        const U = this.notebook.getSymbolStylesThatDependOnMe(style);
        const users : number[] = [];
        for(const u of U) {
          users.push(u.id);
        }
        const rids = new Set<number>();
        for(const r of rs) {
          if ((r.fromId == did) || (r.toId == did)) {
            rids.add(r.id);
          }
        }
        // console.log("users of me",users);
        // console.log("duplicateof",duplicateof);
        if (!(duplicateof === undefined)) {
          rids.add(duplicateof.id);
          for(const u of users) {
            const props : RelationshipProperties = { role: 'SYMBOL-DEPENDENCY' };
            const fromId = duplicateof.fromId;
            const toId = u;
            rval.push({
              type: 'insertRelationship',
              fromId,
              toId,
              inStyles: [ { role: 'LEGACY', id: fromId } ],
              outStyles: [ { role: 'LEGACY', id: toId } ],
              props: props,
            });
          }
        }
        rids.forEach(id => rval.push({ type: 'deleteRelationship',
                                       id: id }));
      } else if  (style.role == 'SYMBOL-USE') {
        // Note: Deleting a use shold be simpler; a use is not a definition.
        // We have already insisted that the code keep a linear chain
        // of relationships; no matter what the definition chain, the
        // use just gets rid of the relationships that use it.
        const did = style.id;
        // note this is nullable, and is a Relationship.
        var singleuseof : RelationshipObject | undefined;
        const rs = this.notebook.allRelationships();
        rs.forEach(r => {
          if ((r.toId == did)) {
            if (singleuseof != null) {
              debug("INTERNAL ERROR: Linearity of defintions broken1!");
              throw new Error("INTERNAL ERROR: Linearity of defintions broken1!"+r);
            }
            singleuseof = r;
          }
        });
        if (singleuseof)
          rval.push({ type: 'deleteRelationship',
                      id: singleuseof.id });
      }
    // If this style has uses reaching it, those relationships
    // should be removed.
    debug("RVAL deletion ====XXXX",rval);
  }
  private async recomputeTools(relId: RelationshipId,
                               fromId: StyleId,
                               toId: StyleId,
                               rval: NotebookChangeRequest[])
  : Promise<NotebookChangeRequest[]> {
    debug("BEGINNING TOOL ADD");

    debug("relId",relId);
    const fromS = this.notebook.getStyle(fromId);
    const toTopS = this.notebook.topLevelStyleOf(toId);
    debug("To Top",toTopS.id);
    const toEval = this.notebook.findStyle({role: 'EVALUATION', type: 'WOLFRAM-EXPRESSION',recursive: true },
                                           toTopS.id);
    debug("fromId",fromId);
    // If the fromID is greater than the TopId, then the relationship goes away from us, and we need not recompute tools
    // on the basis of it..
    // I'm afraid I'm just guessing here....
    if (fromId > toTopS.id) return rval;
    /// otherwise the relationship may precede us and have to be considered...

    if (!toEval) {
      console.error("Could not find an EVALUATION WOLFRAM style");
    } else {
      debug("toEval",toEval.id);
      // Note: To use Simplify from Wolfram below, we use a Wolfram == operator.
      // However, we do NOT allow that in MTL 0.1, which uses a single =.
      // Variables ending in _w are in the Wolfram langauge, variables ending in _mtl are in the MTL 0.1
      const expr_w = toEval.data;
      debug("fromS.data",fromS.data);
      const sub_expr_w =
        constructSubstitution(expr_w,
                              [{ name: fromS.data.name,
                                 value: fromS.data.value}]);
      const isolated = <WolframExpression>`InputForm[runPrivate[FullSimplify[${sub_expr_w}]]]`;
      const substituted = <WolframExpression>await execute(isolated);

      // TODO -- we can do back substitutions that just produce "TRUE"
      // Maybe this acceptable? But True is not a part of the MTL right now!
      debug("SUBSTITUTED",substituted);
      if (substituted === <WolframExpression>"True") { // Should we not also do False?
        return rval;
      }
      const substituted_mtl = convertWolframToMTL(substituted);
      const sub_expr_mtl = convertWolframToMTL(sub_expr_w);
      debug("substituted",substituted);

      // Note: Create TeX is actually more complicated, and will require a
      // conversion procedure. However, this cast below works on simple
      // expressions from MTL into TeX
      const toolData: ToolData = { name: "substitute",
                                   html: <Html>/* REVIEW: safe cast? */sub_expr_mtl,
                                   // WARNING: Invalid cast (MTL is not TeX)
                                   tex: <TexExpression>substituted_mtl,
                                   //                                        html: html_fun(f),
                                   //                                        tex: tex_fun(tex_f),
                                   // WARNING: Invalid cast (MTL is not TeX)
                                   data: { output: <TexExpression>substituted_mtl,
                                           // This is a pure Wolfram transform that does not include the conversion back to MTL
                                           transformation: isolated,
                                           transformationName: "substitute"
                                         },
                                   origin_id: relId};
      const styleProps2: StylePropertiesWithSubprops = {
        type: 'TOOL-DATA',
        role: 'ATTRIBUTE',
        data: toolData,
      }
      const changeReq2: StyleInsertRequest = {
        type: 'insertStyle',
        parentId: toEval.id,
        styleProps: styleProps2
      };
      rval.push(changeReq2);
    }
    return rval;
  }


  // Since a relationship may already exist and this code is trying to handle
  // both inserts and changes, we have to decide how we make sure there are not duplicates.
  // This is a little tricky, as we may be part of a chain. Possibly I should make a unit test
  // for this, to test that a change does not result int
  private async insertRule(change: StyleInserted | StyleChanged, rval: NotebookChangeRequest[]) : Promise<NotebookChangeRequest[]>  {
    const style = change.style;
    return await this.insertFromStyleRule(style,rval);
  }

  private async insertFromStyleRule(style: StyleObject, rval: NotebookChangeRequest[]) : Promise<NotebookChangeRequest[]>  {

    var tlStyle;
    try {
      tlStyle = this.notebook.topLevelStyleOf(style.id);
    } catch (e) { // If we can't find a topLevelStyle, we have in
      // inconsistency most likely caused by concurrency in some way
      debug(this.notebook.toText());
      console.log("error",e);
    }
    if (!tlStyle) return rval;
    const tlid = tlStyle.id;
    // I believe listening only for the WOLFRAM/INPUT forces
    // a serialization that we don't want to support. We also must
    // listen for definition and use and handle them separately...
    if (style.role == 'REPRESENTATION' && style.type == 'WOLFRAM-EXPRESSION') {
      debug("WOLFRAM_REPRESENTATION");
      // at this point, we are doing a complete "recomputation" based the use.
      // TODO: We should remove all Substitution tools here
      await this.removeAllCurrentSymbols(style,rval);
      await this.addSymbolDefStyles(style, rval);
    } else if (style.type == 'SYMBOL-DATA') {
      debug("recomputeInsertRelationship");
      await this.recomputeInsertRelationships(tlid,style,rval);
    }
    return rval;
  }

  // Insert relations related to type SYMBOL
  private async recomputeInsertRelationships(tlid: StyleId,
                                             style: StyleObject,
                                             rval: NotebookChangeRequest[])
  : Promise<NotebookChangeRequest[]>
  {
    if (style.type == 'SYMBOL-DATA' && (style.role == 'SYMBOL-USE' || style.role == 'SYMBOL-DEFINITION')) {
      const name = (style.role == 'SYMBOL-USE') ?
        style.data.name :
        style.data.name;
      const relationsUse: RelationshipPropertiesMap =
        this.getAllMatchingNameAndType(name,'SYMBOL-USE');
      const relationsDef: RelationshipPropertiesMap =
        this.getAllMatchingNameAndType(name,'SYMBOL-DEFINITION');
      debug("relationsUse",relationsUse);
      debug("relationsDef",relationsDef);
      const relations = (style.role == 'SYMBOL-USE') ? relationsDef : relationsUse;

      // defs and uses below are ment to be toplevel styles that participate in
      // a definition or a use

      // I believe these two pieces of code rely on the principle that only
      // thoughts that are previous to us can affect us. This may not work for the case
      // of a reordering.
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
        const index = (style.role == 'SYMBOL-USE') ?
          this.getLatestOfListOfStyleIds(defs) :
          this.getLatestOfListOfStyleIds(uses);
        if (index >= 0) {
          const myFromId =
            (style.role == 'SYMBOL-USE') ?
            index :
            style.id;
          const myToId =
            (style.role == 'SYMBOL-USE') ?
            style.id :
            index;


          debug('ZZZZZ');
          debug(style.role);
          const relOp : FindRelationshipOptions = { toId: myToId,
                                                    fromId: myFromId,
                                                    role: 'SYMBOL-DEPENDENCY',
                                                    source: 'SYMBOL-CLASSIFIER' };


          const relsInPlace : RelationshipObject[] = this.notebook.findRelationships(relOp);

          if (relsInPlace.length == 0) {
          // Check that the notebook already had this relationship,
          const props : RelationshipProperties = { role: 'SYMBOL-DEPENDENCY'
                                                 };
          const changeReq: RelationshipInsertRequest = {
            type: 'insertRelationship',
            fromId: myFromId,
            toId: myToId,
            inStyles: [ { role: 'LEGACY', id: myFromId } ],
            outStyles: [ { role: 'LEGACY', id: myToId } ],
            props: props
          };
          debug(changeReq);
          rval.push(
            changeReq
          );
          }
        }
      }
        debug("ZZZZZZZ role",style.role);
      // Now we need to check for inconsistency;
      if (style.role == 'SYMBOL-DEFINITION') {

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
        debug("ZZZZZZZ defs",defs);
        if (defs.length >= 1) {
          const dup_prop : RelationshipProperties =
            { role: 'DUPLICATE-DEFINITION' };

          const last_def = this.getLatestOfListOfStyleIds(defs);

          if (last_def < style.id) {
            const fromId = last_def;
            const toId = style.id;
            const changeReq: RelationshipInsertRequest = {
              type: 'insertRelationship',
              fromId,
              toId,
              inStyles: [ { role: 'LEGACY', id: fromId } ],
              outStyles: [ { role: 'LEGACY', id: toId } ],
                props: dup_prop
            };
            debug('QQQQQQ');
            rval.push(
              changeReq
            );
          }
        }
      }
    }
    debug("END of INSERT rval",rval);
    return rval;
  }

    private async moveRule(change: StyleMoved, rval: NotebookChangeRequest[]) : Promise<NotebookChangeRequest[]>  {

      // Now trying to implement this using our recomputation capability...
      // we will remove all relationship references to this name,
      // and then use our recomputation to reinsert new values.
      const style = this.notebook.getStyle(change.styleId);
      const tlStyle = this.notebook.topLevelStyleOf(style.id);
      // Now for each style is as use or defintion, collect the names...
      const symbols : Set<string> = new Set<string>();
      // REVIEW: Does this search need to be recursive?
      const syms = this.notebook.findStyles({ type: 'SYMBOL-DATA', recursive: true }, tlStyle.id);
      syms.forEach(sym => {
        const s = sym.data.name;
        symbols.add(s);
      });
      // Now that we have the symbols, we want to remove all relationships

      // that mention them...
      const rs = this.notebook.allRelationships();
      symbols.forEach(name => {
        rs.forEach(r => {
        const fromS = this.notebook.getStyle(r.fromId);
        const toS = this.notebook.getStyle(r.toId);
        if (fromS.type == 'SYMBOL-DATA' &&
            (fromS.role == 'SYMBOL-USE' ||
             fromS.role == 'SYMBOL-DEFINITION'
            ) &&
            fromS.data.name == name) {
          rval.push({ type: 'deleteRelationship',
                      id: r.id });
        }
        if (toS.type == 'SYMBOL-DATA' &&
            (toS.role == 'SYMBOL-USE' ||
             toS.role == 'SYMBOL-DEFINITION'
            ) &&
            toS.data.name == name) {
          rval.push({ type: 'deleteRelationship',
                      id: r.id });
        }
        });
      });

      // TODO: Not posibbly this is returning a tool insertion as well!!!
      const rels : RelationshipObject[] =
        this.notebook.recomputeAllSymbolRelationshipsForSymbols(symbols);
      rels.forEach(r => {
          const prop : RelationshipProperties =
            { role: r.role };
            const changeReq: RelationshipInsertRequest = {
              type: 'insertRelationship',
              fromId: r.fromId,
              toId: r.toId,
              inStyles: [ { role: 'LEGACY', id: r.fromId } ],
              outStyles: [ { role: 'LEGACY', id: r.toId } ],
              props: prop
            };
            rval.push(
              changeReq
            );
      });

    return rval;
  }

  private async onChange(change: NotebookChange, rval: NotebookChangeRequest[]): Promise<void> {
    if (change == null) return;

    switch (change.type) {
      case 'styleDeleted': {
        this.deleteRule(change,rval);
        break;
      }
      case 'styleMoved': {
        this.moveRule(change,rval);
        break;
      }
      case 'styleChanged': {
        await this.insertRule(change,rval);
        break;
      }
      case 'styleInserted': {
        await this.insertRule(change,rval);
        break;
      }
        // This is pretty awful; this is just an experiment for now.
      case 'relationshipInserted': {
        await this.relationshipInsertedRule(change.relationship, rval);
        break;
      }
      case 'relationshipDeleted': {
        await this.relationshipDeletedRule(change.relationship, rval);
        break;
      }
    }
  }


  // ===================== //
  // We need a way to invalidate and remove tools. Probably
  // the best way to do this is based on Relationship ID.
  // Therefore I'm passing a relationship to put in
  // the origin of the tool.
  // ===================== //
  private async removeToolsDependentOnRel(relationship: RelationshipObject,
                                          rval: NotebookChangeRequest[]): Promise<void> {
    // Although PROBABLY only the from and to styles in the relatinship
    // depend on this, that might not be true...for example a hint.
    // At this writing, FindStyleOptions doesn't support looking into
    // the data. Making that an optional lambda expression
    // is probably a good idea for efficiency and concision. TODO!
    // In fact we could explicitly make a "depends on" set in the style
    // that names a set of ids (either relationships or styles) on which
    // the style depends.
    const children = this.notebook.findStyles({ type: 'TOOL-DATA',
                                                source: 'SYMBOL-CLASSIFIER',
                                                recursive: true }
                                             );
    children.forEach( kid => {
      if ((kid.data.origin_id == relationship.id)) {
        const deleteReq : StyleDeleteRequest = { type: 'deleteStyle',
                                                 styleId: kid.id };
        rval.push(deleteReq);
      };
    });
  }



  private async relationshipInsertedRule(relationship: RelationshipObject, rval: NotebookChangeRequest[]): Promise<NotebookChangeRequest[]> {
    if (relationship.role == 'SYMBOL-DEPENDENCY') {
      debug("relationshipInsertRule",relationship);
      await this.recomputeTools(relationship.id,relationship.fromId,
                              relationship.toId,
                              rval);
    }
    return rval;
  }
  private async relationshipDeletedRule(relationship: RelationshipObject, rval: NotebookChangeRequest[]): Promise<NotebookChangeRequest[]> {

    await this.removeToolsDependentOnRel(relationship,
                              rval);
    return rval;
  }
  private async addSymbolDefStyles(style: StyleObject, rval: NotebookChangeRequest[]): Promise<void> {
    const script = <WolframExpression>`FullForm[Hold[${style.data}]]`;
    const result = await execute(script);
    if (!result) { return; }
    if (result.startsWith("Hold[Set[")) {
      // WARNING! TODO!  This may work but will not match
      // expressions which do not evaluate numerically.
      const name_matcher = /Hold\[Set\[(\w+),/g;
      const name_matches = name_matcher.exec(result);
      const value_matcher = /,\s+(.+)\]\]/g;
      const value_matches = value_matcher.exec(result);
      if (name_matches && value_matches) {
        // We have a symbol definition.
        const name = name_matches[1];
        // here we wat to check that this is a symbolic name, and a solitary one.

        debug(`name ${name}`);

        const value = value_matches[1];

        const relationsTo: RelationshipPropertiesMap =
          this.getAllMatchingNameAndType(name,'SYMBOL-USE');

        var styleProps: StylePropertiesWithSubprops;


        // In math, "lval" and "rval" are conventions, without
        // the force of meaning they have in programming langues.
        const lhs = name_matches[1];
        const rhs = value_matches[1];
        debug(`lhs,rhs ${lhs} ${rhs}`);

        // Note: If we happen to be a "constant definition", that is a simple symbol on lhs and constant on the rhs,
        // Then even though technically that is an equation with a trivial solution, we will not create an equation
        // style for it. Eventually the MTL should support such a definition as a distinguished type, but for now
        // I (rlr) am merely attempting to reduce confusiong with tools.

        // from: https://www.mediacollege.com/internet/javascript/text/count-words.html
        function countWords(s:string) : number {
          s = s.replace(/(^\s*)|(\s*$)/gi,"");//exclude  start and end white-space
          s = s.replace(/[ ]{2,}/gi," ");//2 or more space to 1
          s = s.replace(/\n /,"\n"); // exclude newline with a start spacing
          return s.split(' ').filter(function(str){return str!="";}).length;
          //return s.split(' ').filter(String).length; - this can also be used
        }
        if (!((countWords(lhs) === 1) && (countWords(rhs) === 1))) {
          const data = { lhs, rhs };
          styleProps = {
            type: 'EQUATION-DATA',
            data,
            role: 'EQUATION-DEFINITION',
            relationsTo,
            exclusiveChildTypeAndRole: true,
          }
          // In this case, we need to treat lval and rvals as expressions which may produce their own uses....
          await this.addSymbolUseStylesFromString(lhs, style, rval);
          await this.addSymbolUseStylesFromString(rhs, style, rval);
          const changeReq: StyleInsertRequest = { type: 'insertStyle', parentId: style.id, styleProps };
          rval.push(changeReq);
        } else {
          // This is a constant defintion, so we don't treat as an equation!
          debug("Treating as constant definition");
          debug("lhs",lhs,countWords(lhs));
          debug("hrs",rhs,countWords(rhs));
        }

        if (name.match(/^[a-z]+$/i)) {
          debug('defining symbol',name);
          const data = { name, value };
          styleProps = {
            type: 'SYMBOL-DATA',
            data,
            role: 'SYMBOL-DEFINITION',
            exclusiveChildTypeAndRole: true,
            //           relationsTo,
          }
          const changeReq1: StyleInsertRequest = { type: 'insertStyle', parentId: style.id, styleProps };
          rval.push(changeReq1);
        }


        debug(`Inserting def style.`);

      } else {
        // Although we are not defining a symbol in this case,
        debug('YESYESYESYESYES'+result);
        // Basically we want to look for a simple equality here. In OUR input
        // langue, a simple "=" defines a equality, not an assignment. So if we have one,
        // we want to separate the lhs and rhs and create an equation. These values (rhs and lhs)
        // ARE currently added in the wolfram language, not our own!!

        var sides = style.data.split("=");
        // In this case we are have two sides
        if (sides.length == 2) {
          const lhs = sides[0];
          const rhs = sides[1];
          debug('lhs,rhs',lhs,rhs);

          // But we use the Wolfram interpretation for out other work...
          const script_lhs = <WolframExpression>`FullForm[Hold[${lhs}]]`;
          const result_lhs = await execute(script_lhs);
          const script_rhs = <WolframExpression>`FullForm[Hold[${rhs}]]`;
          const result_rhs = await execute(script_rhs);

          if (result_lhs && result_rhs) {
            const hold_matcher = /Hold\[(.*)\]/;
            const lwolfram = hold_matcher.exec(result_lhs);
            const rwolfram = hold_matcher.exec(result_rhs);

            debug("rwolfram",rwolfram, result_rhs);
            if (!(lwolfram && rwolfram)) {
              debug("internal regular expression error"+lwolfram+":"+rwolfram);
              console.error("internal regular expression error");
              return;
            }
            const lw = lwolfram[1];
            const rw = rwolfram[1];
            if (!(lw && rw)) {
              console.error("internal regular expression error");
              return;
            }
            await this.addSymbolUseStylesFromString(lw, style, rval);
            await this.addSymbolUseStylesFromString(rw, style, rval);
            // The relations here are wrong; we need to get all variables in each expression, actually!
            const relationsToLHS: RelationshipPropertiesMap =
              this.getAllMatchingNameAndType(lw,'SYMBOL-USE');
            const relationsToRHS: RelationshipPropertiesMap =
              this.getAllMatchingNameAndType(rw,'SYMBOL-USE');
            const relationsTo: RelationshipPropertiesMap  = {};
            debug("realtionsToLHS,relationsToRHS",relationsToLHS, relationsToRHS);
            for(const s in relationsToLHS) {
              relationsTo[s] = relationsToLHS[s];
            }
            for(const s in relationsToRHS) {
              relationsTo[s] = relationsToRHS[s];
            }


            const data = { lhs: lw, rhs: rw };

            var styleProps: StylePropertiesWithSubprops;
            styleProps = {
              type: 'EQUATION-DATA',
              data,
              role: 'EQUATION-DEFINITION',
              exclusiveChildTypeAndRole: true,
              relationsTo,
            }
            const changeReq: StyleInsertRequest = { type: 'insertStyle', parentId: style.id, styleProps };
            rval.push(changeReq);
          }

        } else {
          debug('probably not an equation, not sure what to do:',result);
        }
      }
    }
  }

  private async  findSymbols(math: string): Promise<string[]> {
    if (isEmptyOrSpaces(math)) {
      return [];
    } else {
      const script = <WolframExpression>(`runPrivate[Variables[` + math + `]]`);
      const oresult = await execute(script);
      if (!oresult) { return []; }
      const result = draftChangeContextName(oresult);

      // TODO: validate return value is in expected format with regex.
      const symbols = result.slice(1,-1).split(', ').filter( s => !!s)
      return symbols;
    }
  }

  private getAllMatchingNameAndType(name: string,
                                    useOrDef: 'SYMBOL-DEFINITION' | 'SYMBOL-USE') :  RelationshipPropertiesMap {
      // Add the symbol-use style
      const relationsFrom: RelationshipPropertiesMap = {};
    // Add any symbol-dependency relationships as a result of the new symbol-use style
    if (this.notebook) {
      for (const otherStyle of this.notebook.allStyles()) {
        if (otherStyle.type == 'SYMBOL-DATA' &&
            otherStyle.role == useOrDef &&
            otherStyle.data.name == name) {
          relationsFrom[otherStyle.id] = { role: 'SYMBOL-DEPENDENCY' };
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
    // This code as actually longer than doing it
    // in a loop; nontheless I prefer this "reduce" style
    // because I suspect we will have to do "sorting" by thought
    // order at some point, and this basic approach with then become
    // reusable.  In fact, I cold implment a "sort" now and use it
    // to compute the "lates" but that is a tad wastefule. - rlr
    const [max,maxstyle] = this.notebook.allStyles().reduce(
      (acc,val) => {
        if (val.type == 'SYMBOL-DATA' &&
          val.role == useOrDef &&
            val.data.name == name) {
          const idx = this.notebook.topLevelStylePosition(val.id);
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

    if (max >=0) {
      relationsFrom[maxstyle] = { role: 'SYMBOL-DEPENDENCY' };
    }
    return relationsFrom;
  }

  private async removeAllCurrentSymbols(style: StyleObject, rval: NotebookChangeRequest[]): Promise<void> {
    // REVIEW: Does this search need to be recursive?
    const children = this.notebook.findStyles({ type: 'SYMBOL-DATA',
                                                source: 'SYMBOL-CLASSIFIER',
                                                recursive: true }, style.id);

    children.forEach( kid => {
      if ((kid.parentId == style.id) &&
          (kid.type == 'SYMBOL-DATA')) {
        const deleteReq : StyleDeleteRequest = { type: 'deleteStyle',
                                                 styleId: kid.id };
        rval.push(deleteReq);
      };
    });

  }

  private async  addSymbolUseStylesFromString(data: string,style: StyleObject, rval: NotebookChangeRequest[]): Promise<void> {
    const symbols = await this.findSymbols(data);
    symbols.forEach(s => {
      const relationsFrom: RelationshipPropertiesMap =
        this.getLatestMatchingNameAndType(s,'SYMBOL-DEFINITION');

      const data: SymbolData = { name: s };
      const styleProps: StylePropertiesWithSubprops = {
        type: 'SYMBOL-DATA',
        data,
        role: 'SYMBOL-USE',
        relationsFrom,
      }
      const changeReq: StyleInsertRequest = { type: 'insertStyle', parentId: style.id, styleProps };
      rval.push(changeReq);
      debug(`Inserting use style`);

    });
  }

}

  // Helper Functios

  async function execute(script: WolframExpression): Promise<WolframExpression|undefined> {
    let result: WolframExpression;
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
