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

// Types

type CssLength = string; // TODO: Duplicated in stroke.ts

export interface CssSize {
  height: CssLength;
  width: CssLength;
}

export interface DrawingData {
  size: CssSize;
  strokes: StrokeData[];
}

export interface StrokeData {
  x: number[];
  y: number[];
  t: number[]; // TYPESCRIPT: Timestamp
  p: number[];  // Pressure
  tx: number[]; // Tilt
  ty: number[];
}


// NOTE: toId and fromId are mutually "or". The ids and all other fields are "and".
export interface FindRelationshipOptions {
  toId?: StyleId;
  fromId?: StyleId;
  meaning?: RelationshipMeaning;
  source?: StyleSource;
}

// REVIEW: Rename to FindStylePattern
export interface FindStyleOptions {
  meaning?: StyleMeaning|RegExp;
  source?: StyleSource;
  type?: StyleType;
  recursive?: boolean;
}

export type NotebookChange = RelationshipDeleted|RelationshipInserted|StyleChanged|StyleDeleted|StyleInserted|StyleMoved;
export interface RelationshipDeleted {
  type: 'relationshipDeleted';
  // REVIEW: Only pass relationshipId?
  relationship: RelationshipObject;
}
export interface RelationshipInserted {
  type: 'relationshipInserted';
  relationship: RelationshipObject;
}

export interface StyleChanged {
  type: 'styleChanged';
  // REVIEW: Only pass styleId and new data?
  style: StyleObject;
  previousData: any;
}
export interface StyleDeleted {
  type: 'styleDeleted';
  // REVIEW: Only pass styleId?
  style: StyleObject;
}
export interface StyleInserted {
  type: 'styleInserted';
  style: StyleObject;
  afterId?: StyleRelativePosition;
  // REVIEW: position?: StylePosition for top-level styles?
}
export interface StyleMoved {
  type: 'styleMoved';
  styleId: StyleId;
  afterId: StyleRelativePosition;
  oldPosition: StyleOrdinalPosition;
  newPosition: StyleOrdinalPosition;
}

export interface NotebookObject {
  nextId: StyleId;
  relationshipMap: RelationshipMap;
  styleMap: StyleMap;
  styleOrder: StyleId[];
  version: string;
}

export type RelationshipId = number;

// Some invariants are needed here:
// The first definition of a symbol does not create a relationship.
// The second mentions of a symbol creates a relationship attached
// (via source) to either the use or definition.
// Props may give this the meaning of DUPLICATE DEFINITION if that is true.
// It is critically that all of these respect the "top level thought order",
// not the style order, so that reordering thoughts has a meaning.
// Each symbol name creates a separate independent "channel" of that name.
export interface RelationshipObject extends RelationshipProperties {
  id: RelationshipId;
  source: StyleSource;
  fromId: StyleId;
  toId: StyleId;
}

export type RelationshipMeaning =
  'SYMBOL-DEPENDENCY' |
  'DUPLICATE-DEFINITION' |
  'EQUIVALENCE';

export interface RelationshipMap {
  [id: /* RelationshipId */number]: RelationshipObject;
}

export interface RelationshipProperties {
  meaning: RelationshipMeaning;
}

export type StyleId = number;

export interface StyleMap {
  [id: /* StyleId */number]: StyleObject;
}

export const STYLE_MEANINGS = [
  'ATTRIBUTE',            // Generic attribute. Meaning implied by type.
  'ERROR',                // An error message. Type should be text.
  'EVALUATION',           // CAS evaluation of an expression.
  'EVALUATION-ERROR',     // Error in CAS evaluation of an expression.
  'EXPOSITION',           // A longer discussion or description.
  'FORMULA-ALT',          // Alternative representation of a formula.
  'HANDWRITING',          // REVIEW: Used? Deprecate? Stroke information for the user's handwriting.
  'INPUT',                // Primary representation of something that the user has input.
  'INPUT-ALT',            // An alternative representation, e.g. LaTeX version of handwritten math.
  'QUADRATIC',            // DEPRECATED: A quadratic expression, presumably worth plotting.
  'SIMPLIFICATION',       // CAS simplification of expression or equation.
  'PLOT',                 // Plot of a formula
  'EQUATION',             // An equation
  'EQUATION-SOLUTION',    // An equation
  'EQUATION-DEFINITION',  // A simple equality relation defined
  'SYMBOL',               // Symbols extracted from an expression.
  'SYMBOL-DEFINITION',    // Definition of a symbol.
  'SYMBOL-USE',           // Use of a symbol.
  'DECORATION',           // Clearly indicates this is NOT the input but a decoration
  'EQUIVALENT-CHECKS',    // Checking expression equivalence of with other styles
  'UNIVARIATE-QUADRATIC', // A quadratic expression, presumably worth plotting.
  'SUBTRIVARIATE',        // An expression in one or two variables presumable plottable.
] as const;
export type StyleMeaning = typeof STYLE_MEANINGS[number];

export interface StyleObject extends StyleProperties {
  id: StyleId;
  parentId: StyleId; // 0 if top-level style.
  source: StyleSource;
}

// Position of style in the notebook.
// Applies only to top-level styles.
// Position 0 is the first cell of the notebook.
export type StyleOrdinalPosition = number;

export interface StyleProperties {
  data: any;
  meaning: StyleMeaning;
  type: StyleType;
}

export type StyleRelativePosition = StyleId | StylePosition;

export enum StylePosition {
  Top = 0,
  Bottom = -1,
}
export const STYLE_TYPES = [
  'DRAWING',         // Strokes of user sketch in our own format.
  'HTML',            // Html: HTML-formatted text
  'IMAGE',           // ImageData: URL of image relative to notebook folder.
  'JIIX',            // Jiix: MyScript JIIX export from 'MATH' editor.
  'LATEX',           // LatexData: LaTeX string // TODO: rename 'TEX'
  'CLASSIFICATION',  // DEPRECATED: A classifcication of the style.
  'MATHJS',          // MathJsData: MathJS plain text expression
  'MATHML',          // MathMlData: MathML Presentation XML
  'STROKE',          // StrokeGroups: MyScript strokeGroups export from 'TEXT' editor.
  'SYMBOL',          // SymbolData: symbol in a definition or expression.
  'SOLUTION',        // The result of a "solve" operation
  'EQUATION',        // An equation (ambiguously assertion or relation)
  'TEXT',            // TextData: Plain text
  'TOOL',            // ToolInfo: Tool that can be applied to the parent style.
  'WOLFRAM',         // WolframData: Wolfram language expression
] as const;
export type StyleType = typeof STYLE_TYPES[number];

export const STYLE_SOURCES = [
  'MATHEMATICA',      // Mathematica C.A.S.
  'MATHJS',           // The Mathjs C.A.S.
  'MATHSTEPS',        // The Mathsteps C.A.S.
  'MYSCRIPT',         // MyScript handwriting recognition`
  'SANDBOX',          // Sandbox for temporary experiments
  'SUBTRIV-CLASSIFIER',
  'ALGEBRAIC-TOOLS',  // Algebraic tools provided by Wolfram
  'EQUATION-SOLVER',  // Attempt to expose Wolfram solutions
  'SYMBOL-CLASSIFIER',
  'TEX-FORMATTER',
  'ANY-INPUT',        // This represents ANY input, no matter the type enterred.
  'SYSTEM',           // The Math-Tablet app itself, not the user or an observer.
  'TEST',             // An example source used only by our test system
  'USER',             // Directly entered by user
  'WOLFRAM',          // Wolfram C.A.S.
] as const;
export type StyleSource = typeof STYLE_SOURCES[number];

// Constants

export const VERSION = "0.0.8";

// Exported Class

export class StyleIdDoesNotExistError extends Error {
    constructor(m: string) {
      super(m);
      // Set the prototype explicitly to make work
      Object.setPrototypeOf(this, StyleIdDoesNotExistError.prototype);
      this.name = "StyleIdDoesNotExistError";
    }
}

export class RelationshipIdDoesNotExistError extends Error {
    constructor(m: string) {
      super(m);
      // Set the prototype explicitly to make work
      Object.setPrototypeOf(this, RelationshipIdDoesNotExistError.prototype);
      this.name = "RelationshipIdDoesNotExistError";
    }
}

interface StyleOrderMapping {
  sid: StyleId;
  tls: number;
}

export class Notebook {

  // Constructor

  public constructor(obj?: NotebookObject) {
    if (!obj) {
      this.nextId = 1;
      this.relationshipMap = {};
      this.styleMap = {};
      this.styleOrder = [];
    } else {
      // LATER: More thorough validation of the object.
      if (!obj.nextId) { throw new Error("Invalid notebook object JSON."); }
      if (obj.version != VERSION) {
        throw new Error(`Invalid notebook version ${obj.version}. Expect version ${VERSION}`);
      }
      this.nextId = obj.nextId;
      this.relationshipMap = obj.relationshipMap;
      this.styleMap = obj.styleMap;
      this.styleOrder = obj.styleOrder;
    }
  }

  // Instance Properties

  public nextId: StyleId;

  // Instance Property Functions

  // REVIEW: Return an iterator?
  public allRelationships(): RelationshipObject[] {
    // TODO: Does it matter whether we return relationships in sorted order or not?
    //       This could be as simple as: return Object.values(this.relationshipMap);
    const sortedIds: RelationshipId[] = Object.keys(this.relationshipMap).map(k=>parseInt(k,10)).sort();
    return sortedIds.map(id=>this.relationshipMap[id]);

  }

  public relationshipsOf(id: StyleId): RelationshipObject[] {
    return this.allRelationships().filter(r=>(r.fromId == id || r.toId == id));
  }

  // REVIEW: Return an iterator?
  public allStyles(): StyleObject[] {
    const sortedIds: StyleId[] = Object.keys(this.styleMap).map(k=>parseInt(k,10)).sort();
    return sortedIds.map(id=>this.styleMap[id]);
  }

  // Returns all thoughts in notebook order
  // REVIEW: Return an iterator?
  public topLevelStyleOrder(): StyleId[] { return this.styleOrder; }

  public childStylesOf(id: StyleId): StyleObject[] {
    return this.allStyles().filter(s=>(s.parentId==id));
  }

  // find all children of given type and meaning
  public findChildStylesOfType(id: StyleId, type: StyleType, meaning?: StyleMeaning): StyleObject[] {

    // we will count ourselves as a child here....
    const rval: StyleObject[] = [];

    const style = this.styleMap[id];
    if (style && style.type == type && (!meaning || style.meaning == meaning)) {
      // we match, so we add ourselves...
      rval.push(<StyleObject>style);
    } // else { assert(this.thoughtMap[id] }

    // now for each kid, recurse...
    // DANGER! this makes this function asymptotic quadratic or worse...
    const kids = this.childStylesOf(id);
    for(const k of kids) {
      const kmatch = this.findChildStylesOfType(k.id, type, meaning);
      for(let km of kmatch) { rval.push(km); }
    }

    return rval;
  }

  public getRelationshipById(id: RelationshipId): RelationshipObject {
    const rval = this.relationshipMap[id];
    if (!rval) { throw new RelationshipIdDoesNotExistError(`Relationship ${id} doesn't exist.`); }
    return rval;
  }

  public getStyleById(id: StyleId): StyleObject {
    const rval = this.styleMap[id];
    if (!rval) { throw new StyleIdDoesNotExistError(`Style ${id} doesn't exist.`); }
    return rval;
  }

  public getSymbolStylesThatDependOnMe(style:StyleObject): StyleObject[] {
    const rs = this.allRelationships();
    var symbolStyles: StyleObject[] = [];
    rs.forEach(r => {
      if (r.fromId == style.id) {
        try {
          symbolStyles.push(this.getStyleById(r.toId));
        } catch (e) {
          if (e instanceof StyleIdDoesNotExistError) {
          } else {
            throw new Error("Internal Error"+e.name);
          }
        }
      }
    });
    return symbolStyles;
  }
    // TODO:
  // Find the def whose top level symbol appears just before this one.
    public findLatestDefinitionEarlierThanThis(thoughtIndex : number,defs : StyleOrderMapping[]) : StyleId | null {
      var curi = -1;
      var curtlspos = -1;
      for(var i = 0; i < defs.length; i++) {
        var pos = this.getThoughtIndex(defs[i].tls);
        if ((pos < thoughtIndex) &&
            (pos > curtlspos))
        {
          curtlspos = pos;
          curi = i;
        }
      }
      // Now we hope cur is the currect object...
      return curi < 0 ? null : defs[curi].sid;
    }
  // This is intended to be used by tests; it is slightly
  // inefficient. I think DJE wants us to incrementally recompute everything,
  // but especially in the presence of concurrency we need a standard to
  // test against.
  // The algorithm is straightforward:
  // If we are "use", we create a relationship based on the last (in thought order)
  // definition that matches our symbol.

  // TODO: This is not handling equivalence relationships.
  // For the purpose of testing we possibly have to deal with that.
  public recomputeAllSymbolRelationships() : RelationshipObject[] {
    // I am attempting here to code the most straight-forward and simplest
    // algorithm I can think of without regard to performance.
    // 1) Compute the set of all symbols in the notebook.
    // 2) For each symbol s:
    //    A) produce an array of all uses and defintions of that
    // symbol (these will be style ids). Sort by top level thought order.
    //    B) produce an array of all definitions of that symbol.
    //  Sort by top level thought order.
    //    C) Run a loop over uses, establishing a relation on the use
    // to the most recent (thought order) definition
    //    D) Run a a loop over definitions, starting from the second.
    // Establish DUPLICATE-DEFINITION relationships
    const tlso = this.topLevelStyleOrder();
    const symbols : Set<string> = new Set<string>();

    tlso.forEach( tls => {
      // console.error("operating on tls:",tls);
      const syms = this.findChildStylesOfType(tls,'SYMBOL');
      syms.forEach(sym => {
        const s = sym.data.name;
        symbols.add(s);
      }
                  );
    });

    return this.recomputeAllSymbolRelationshipsForSymbols(symbols);
  }

    public recomputeAllSymbolRelationshipsForSymbols(symbols: Set<string> ) : RelationshipObject[] {
    interface SymbolToMap {
      [key: string]: StyleOrderMapping[];
    }
    const uses : SymbolToMap = {};
    const defs : SymbolToMap = {};

    const tlso = this.topLevelStyleOrder();
    tlso.forEach( tls => {
      // console.error("operating on tls:",tls);
      const syms = this.findChildStylesOfType(tls,'SYMBOL');
      syms.forEach(sym => {
        const s = sym.data.name;
        if (symbols.has(s)) {
          if (sym.meaning == 'SYMBOL-USE') {
            if (!(s in uses))
              uses[s] = [];
            uses[s].push({ sid: sym.id, tls: tls});
          }
          if (sym.meaning == 'SYMBOL-DEFINITION') {
            if (!(s in defs))
              defs[s] = [];
            defs[s].push({ sid: sym.id, tls: tls});
          }
        }
      });
    });

    const rs : RelationshipObject[] = [];


    // Now hopefully defs and uses are maps of all symbols properly ordered...
    // Build the symbol use relationships...
    symbols.forEach( sym => {
      const us = uses[sym];
      const ds = defs[sym];
      if (us) {
        for(var i = 0; i < us.length; i++) {
          const fromId : number | null =
            this.findLatestDefinitionEarlierThanThis(
              this.getThoughtIndex(us[i].tls),
              ds);


          if (fromId) {
            // console.error("fromId for i",fromId,us[i]);
            // Since we are not at present injecting into the notebook,
            // the id will remain -1.
            var r : RelationshipObject = {
              source: 'TEST',
              id: -1,
              fromId: fromId,
              toId: us[i].sid,
              meaning: 'SYMBOL-DEPENDENCY',
            };
            rs.push(r);
          } else {
            // REVIEW: Throw exception??
            console.error("fromId not found:",us[i],ds);
          }
        }
      }
    });

    // Now handle the duplicate definitions....
    symbols.forEach( sym => {
      const ds = defs[sym];

      // TODO: this needs to be a key iteration, not a number iteration!
      for(var i = 0; i < ds.length; i++) {
        const fromId  : number | null =
          this.findLatestDefinitionEarlierThanThis(
            this.getThoughtIndex(ds[i].tls),
            ds);

        // Since we are not at present injecting into the notebook,
        // the id will remain -1.
        if (fromId) {
          var r : RelationshipObject = {
            source: 'TEST',
            id: -1,
            fromId: fromId,
            toId: ds[i].sid,
            meaning: 'DUPLICATE-DEFINITION',
          };
          rs.push(r);
        }
      }
    });

    // console.error("RS = ",rs);
    // Now I am not producing "EQIVALENCE" meanings...
    // However, those are a function of evaluation, and so are quite different.
    return rs;

  }

  // Return all StyleObjects which are Symbols for which
  // there is a Symbol Dependency relationship with this
  // object as the the target
  // Note: The defintion is the "source" of the relationship
  // and the "use" is "target" of the relationship.
  public getSymbolStylesIDependOn(style:StyleObject): StyleObject[] {
    // simplest way to do this is to iterate over all relationships,
    // computing the source and target thoughts. If the target thought
    // is the same as our ancestor thought, then we return the
    // source style, which should be of type Symbol and meaning Definition.
    const rs = this.allRelationships();
    var symbolStyles: StyleObject[] = [];
    const mp = this.topLevelStyleOf(style.id);
    if (!mp) {
      throw new Error(`INTERNAL ERROR: did not produce ancenstor: ${style.id}`);
    }
    rs.forEach(r => {
      try {  // TODO: I don't know why this can be an error....
        // doing a catch here seems to make it work but this is a concurrency
        // problem, one way or another...we should not have relationship
        // that is not pointing to something, though of course concurrent
        // operation makes this difficult.
        const rp = this.topLevelStyleOf(r.toId);
        if (!rp) {
          throw new Error(`INTERNAL ERROR: did not produce ancenstor: ${style.id}`);
        }
        if (rp.id == mp.id) {
          // We are a user of this definition...
          try {
            symbolStyles.push(this.getStyleById(r.fromId));
          } catch (Error) {
            // REVIEW: Proper error handling??
            console.error("from id missing",r.fromId);
            console.error(this);
          }

        }
      } catch (Error) {
        // REVIEW: Proper error handling??
        console.error("from id missing",r.fromId);
        console.error(this);
      }
    });
    return symbolStyles;
  }

  public numStyles(tname: StyleType, meaning?: StyleMeaning) : number {
    return this.allStyles().reduce(
      function(total,x){
        return (x.type == tname && (!meaning || x.meaning == meaning))
          ?
          total+1 : total},
      0);
  }

  // This can be asymptotically improved later.
  public styleHasChildOfType(style: StyleObject, tname: StyleType, meaning?: StyleMeaning): boolean {
    const id = style.id;
    return !!this.childStylesOf(id).find(s => s.type == tname && (!meaning || s.meaning == meaning));
  }

  public topLevelStyles(): StyleObject[] {
    return this.styleOrder.map(styleId=>this.styleMap[styleId]);
  }

  public topLevelStyleOf(id: StyleId): StyleObject {
    const style = this.styleMap[id];
    if (!style) { throw new Error("Cannot find top-level style: "+id); }
    if (!style.parentId) { return style; }
    return this.topLevelStyleOf(style.parentId);
  }

  public isTopLevelThought(id: StyleId): boolean {
    return (this.getStyleById(id).parentId == 0);
  }

  // Return the order-dependent position of the top level thought
  // this is attached to; this is used in "causal ordering".
  // getThoughtIndex(A) < getThoughtIndex(B) implies A may not
  // in anyway depend on B.
  public getThoughtIndex(id: StyleId): number {
    const top = this.topLevelStyleOf(id);
    return this.styleOrder.indexOf(top.id);
  }

  // Instance Methods

  public applyChange(change: NotebookChange): void {
    // REVIEW: Can change be null?
    // TODO: Don't let changes be null.
    if (change != null) {
      switch(change.type) {
        case 'relationshipDeleted':
          // console.log("calling deleteRelationship in notebook.ts");
          this.deleteRelationship(change.relationship);
          break;
        case 'relationshipInserted':
          this.insertRelationship(change.relationship);
          break;
        case 'styleChanged':
          this.changeStyle(change);
          break;
        case 'styleDeleted':
          this.deleteStyle(change.style);
          break;
        case 'styleInserted':
          this.insertStyle(change.style, change.afterId);
          break;
        case 'styleMoved':
          this.moveStyle(change);
          break;
        default:
          throw new Error(`Applying unexpected change type: ${(<any>change).type}`);
      }
    }
  }

  public applyChanges(changes: NotebookChange[]): void {
    for (const change of changes) { this.applyChange(change); }
  }

  public findRelationships(options: FindRelationshipOptions): RelationshipObject[] {
    const rval: RelationshipObject[] = [];
    // REVIEW: Ideally, relationships would be stored in a Map, not an object,
    //         so we could obtain an iterator over the values, and not have to
    //         construct an intermediate array.
    for (const relationship of Object.values(this.relationshipMap)) {
      if ((options.fromId || options.toId) && relationship.fromId != options.fromId && relationship.toId != options.toId) { continue; }
      if (options.source && relationship.source != options.source) { continue; }
      if (options.meaning && relationship.meaning != options.meaning) { continue; }
      rval.push(relationship);
    }
    return rval;
  }

  public findStyle(
    options: FindStyleOptions,
    rootId?: StyleId,           // Search child styles of this style, otherwise top-level styles.
  ): StyleObject|undefined {
    // Like findStyles but expects to find zero or one matching style.
    // If it finds more than one matching style then it throws an exception.
    const styles = this.findStyles(options, rootId);
    if (styles.length == 0) { return undefined; }
    else if (styles.length == 1) { return styles[0]; }
    else { throw new Error(`findStyle found more than one matching style.`); }
  }

  public findStyles(
    options: FindStyleOptions,
    rootId?: StyleId,           // Search child styles of this style, otherwise top-level styles.
    rval: StyleObject[] = []
  ): StyleObject[] {
    const styles = rootId ? this.childStylesOf(rootId) : this.topLevelStyles();
    for (const style of styles) {
      if (styleMatchesPattern(style, options)) { rval.push(style); }
      if (options.recursive) {
        this.findStyles(options, style.id, rval);
      }
    }
    return rval;
  }

  public hasRelationshipId(relationshipId: RelationshipId): boolean {
    return this.relationshipMap.hasOwnProperty(relationshipId);
  }

  // public hasRelationships(options: FindRelationshipOptions): boolean {
  //   // Returns true iff findStyles with the same parameters would return a non-empty list.
  //   // LATER: Make this more efficient. We can return true when we find the first matching relationship.
  //   const relationships = this.findRelationships(options);
  //   return relationships.length>0;
  // }

  public hasStyleId(styleId: StyleId): boolean {
    return this.styleMap.hasOwnProperty(styleId);
  }

  // public hasStyles(
  //   options: FindStyleOptions,
  //   rootId?: StyleId,           // Search child styles of this style, otherwise top-level styles.
  // ): boolean {
  //   // Returns true iff findStyles with the same parameters would return a non-empty list.
  //   // LATER: Make this more efficient. We can return true when we find the first matching style.
  //   const styles = this.findStyles(options, rootId);
  //   return styles.length>0;
  // }

  // --- PRIVATE ---

  // Private Class Properties

  // Private Class Methods

  // Private Instance Properties

  protected relationshipMap: RelationshipMap;
  protected styleMap: StyleMap;     // Mapping from style ids to style objects.
  protected styleOrder: StyleId[];  // List of style ids in the top-down order they appear in the notebook.

  // Private Event Handlers

  // Private Instance Methods

  private changeStyle(change: StyleChanged): void {
    const styleId = change.style.id;
    const style = this.styleMap[styleId];
    if (!style) { throw new Error(`Changing unknown style ${styleId}`); }
    style.data = change.style.data;
  }

  private deleteRelationship(relationship: RelationshipObject): void {
    // TODO: relationship may have already been deleted by another observer.
    const id = relationship.id;
    if (!this.relationshipMap[id]) { throw new Error(`Deleting unknown relationship ${id}`); }
    delete this.relationshipMap[id];
  }

  private deleteStyle(style: StyleObject): void {
    const id = style.id;
    if (!this.styleMap[id]) { throw new Error(`Deleting unknown style ${id}`); }
    // If this is a top-level style then remove it from the top-level style order.
    if (!style.parentId) {
      const i = this.styleOrder.indexOf(id);
      this.styleOrder.splice(i,1);
    }
    delete this.styleMap[id];
  }

  private insertRelationship(relationship: RelationshipObject): void {
    this.relationshipMap[relationship.id] = relationship;
  }

  private insertStyle(style: StyleObject, afterId?: StyleRelativePosition): void {

    this.styleMap[style.id] = style;
    // Insert top-level styles in the style order.
    if (!style.parentId) {
      if (!afterId || afterId===StylePosition.Top) {
        this.styleOrder.unshift(style.id);
      } else if (afterId===StylePosition.Bottom) {
        this.styleOrder.push(style.id);
      } else {
        const i = this.styleOrder.indexOf(afterId);
        if (i<0) { throw new Error(`Cannot insert thought after unknown thought ${afterId}`); }
        this.styleOrder.splice(i+1, 0, style.id);
      }
    }
  }

  // Although questionable, executed a "moveStyle" on children
  // of a top level style. However, only a move a top-level thought
  // actually should be affected here.
  private moveStyle(change: StyleMoved): void {
    if (this.isTopLevelThought(change.styleId)) {
      this.styleOrder.splice(change.oldPosition, 1);
      this.styleOrder.splice(change.newPosition, 0, change.styleId);
    }
  }
}

// REVIEW: Function should not start with a capital letter.
export function StyleInsertedFromNotebookChange(change: NotebookChange): StyleInserted {
  if (change.type != 'styleInserted') { throw new Error("Not StyleInserted change."); }
  return change;
}

export function styleMatchesPattern(style: StyleObject, options: FindStyleOptions): boolean {
  return    (!options.meaning || (typeof options.meaning == 'object' && </* TYPESCRIPT: */any>options.meaning instanceof RegExp ? (<RegExp>options.meaning).test(style.meaning) : style.meaning == options.meaning))
         && (!options.type || style.type == options.type)
         && (!options.source || style.source == options.source);
}

// TEMPORARY

export type CellId = string;
export type PageId = string;

export interface CellData {
  id: CellId;
  size: CssSize;
}

export interface CssSize {
  height: CssLength;
  width: CssLength;
}

interface Document {
  pageConfig: PageConfig,
  pages: PageData[];
}

interface PageConfig {
  size: CssSize;
  margins: PageMargins;
}

interface PageData {
  id: PageId;
  cells: CellData[];
}

interface PageMargins {
  bottom: CssLength;
  left: CssLength;
  right: CssLength;
  top: CssLength;
}

export const DOCUMENT: Document = {
  pageConfig: {
    size: { width: '8.5in', height: '11in' },
    margins: { top: '1in', bottom: '1in', left: '1in', right: '1in' },
  },
  pages: [
    {
      id: 'p1',
      cells: [
        { id: 'p1c1', size: { width: '6.5in', height: '1in' } },
        { id: 'p1c2', size: { width: '6.5in', height: '1in' } },
        { id: 'p1c3', size: { width: '6.5in', height: '1in' } },
        { id: 'p1c4', size: { width: '6.5in', height: '1in' } },
        { id: 'p1c5', size: { width: '6.5in', height: '1in' } },
        { id: 'p1c6', size: { width: '6.5in', height: '1in' } },
        { id: 'p1c7', size: { width: '6.5in', height: '1in' } },
        { id: 'p1c8', size: { width: '6.5in', height: '1in' } },
        { id: 'p1c9', size: { width: '6.5in', height: '1in' } },
      ],
    },
    {
      id: 'p2',
      cells: [
        { id: 'p2c1', size: { width: '6.5in', height: '1in' } },
        { id: 'p2c2', size: { width: '6.5in', height: '1in' } },
        { id: 'p2c3', size: { width: '6.5in', height: '1in' } },
        { id: 'p2c4', size: { width: '6.5in', height: '1in' } },
        { id: 'p2c5', size: { width: '6.5in', height: '1in' } },
        { id: 'p2c6', size: { width: '6.5in', height: '1in' } },
        { id: 'p2c7', size: { width: '6.5in', height: '1in' } },
        { id: 'p2c8', size: { width: '6.5in', height: '1in' } },
        { id: 'p2c9', size: { width: '6.5in', height: '1in' } },
      ],
    },
    {
      id: 'p3',
      cells: [
        { id: 'p3c1', size: { width: '6.5in', height: '9in' } },
      ],
    },
    { id: 'p4', cells: [
      { id: 'p4c1', size: { width: '6.5in', height: '9in' } },
    ]},
    { id: 'p5', cells: [
      { id: 'p5c1', size: { width: '6.5in', height: '9in' } },
    ]},
    { id: 'p6', cells: [
      { id: 'p6c1', size: { width: '6.5in', height: '9in' } },
    ]},
    { id: 'p7', cells: [
      { id: 'p7c1', size: { width: '6.5in', height: '9in' } },
    ]},
    { id: 'p8', cells: [
      { id: 'p8c1', size: { width: '6.5in', height: '9in' } },
    ]},
    { id: 'p9', cells: [
      { id: 'p9c1', size: { width: '6.5in', height: '9in' } },
    ]},
  ],
};
