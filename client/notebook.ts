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

type Html = string; // REVIEW: Duplicated in dom.ts but that is only client-side.

export interface CssSize {
  height: CssLength;
  width: CssLength;
}

export interface DrawingData {
  size: CssSize;
  strokeGroups: StrokeGroup[];
}

export interface Stroke {
  // id?: string;
  // p?: number[];
  // pointerId?: number;
  // pointerType?: 'PEN'|'TOUCH'|'ERASER';
  // t?: number[];
  x: number[];
  y: number[];
}

export interface StrokeGroup {
  // penStyle?: string;
  // penStyleClasses?: string;
  strokes: Stroke[];
}


// NOTE: toId and fromId are mutually "or". The ids and all other fields are "and".
export interface FindRelationshipOptions {
  toId?: StyleId;
  fromId?: StyleId;
  role?: RelationshipRole;
  source?: StyleSource;
}

// REVIEW: Rename to FindStylePattern
export interface FindStyleOptions {
  role?: StyleRole|RegExp;
  subrole?: StyleSubrole;
  source?: StyleSource;
  notSource?: StyleSource;
  type?: StyleType;
  recursive?: boolean;
}

export interface HintData {
  fromId: StyleId,
  status: HintStatus,
  text: string,
  toId: StyleId,
}

export enum HintStatus {
  Unknown = 0,
  Correct = 1,
  Incorrect = 2,
}

export type NotebookChange =
  RelationshipDeleted|RelationshipInserted|
  StyleChanged|StyleConverted|StyleDeleted|StyleInserted|StyleMoved;
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
export interface StyleConverted {
  type: 'styleConverted';
  styleId: StyleId;
  role: StyleRole;
  subrole?: StyleSubrole;
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
// Props may give this the role of DUPLICATE DEFINITION if that is true.
// It is critically that all of these respect the "top level thought order",
// not the style order, so that reordering thoughts has a role.
// Each symbol name creates a separate independent "channel" of that name.
export interface RelationshipObject extends RelationshipProperties {
  id: RelationshipId;
  source: StyleSource;
  fromId: StyleId;
  toId: StyleId;
}

export type RelationshipRole =
  'SYMBOL-DEPENDENCY' |
  'DUPLICATE-DEFINITION' |
  'EQUIVALENCE';

export interface RelationshipMap {
  [id: /* RelationshipId */number]: RelationshipObject;
}

export interface RelationshipProperties {
  role: RelationshipRole;
}

export type StyleId = number;

export interface StyleMap {
  [id: /* StyleId */number]: StyleObject;
}

export const STYLE_ROLES = [
  // Top level (cell) roles
  'FIGURE',
  'FORMULA',
  'HINT',                 // Explanation of why two formula are related
  'PLOT',
  'TEXT',
  'UNKNOWN',              // Type of the cell hasn't been determined.

  'ATTRIBUTE',            // Generic attribute. Meaning implied by type.
  'ERROR',                // An error message. Type should be text.
  'EVALUATION',           // CAS evaluation of an expression.
  'EVALUATION-ERROR',     // Error in CAS evaluation of an expression.
  'EXPOSITION',           // A longer discussion or description.
  'HANDWRITING',          // REVIEW: Used? Deprecate? Stroke information for the user's handwriting.
  'QUADRATIC',            // DEPRECATED: A quadratic expression, presumably worth plotting.
  'SIMPLIFICATION',       // CAS simplification of expression or equation.
  'EQUATION',             // An equation
  'EQUATION-SOLUTION',    // An equation
  'EQUATION-DEFINITION',  // A simple equality relation defined
  'REPRESENTATION',       // A representation of the parent style.
  'SYMBOL',               // Symbols extracted from an expression.
  'SYMBOL-DEFINITION',    // Definition of a symbol.
  'SYMBOL-USE',           // Use of a symbol.
  'DECORATION',           // Clearly indicates this is NOT the input but a decoration
  'EQUIVALENT-CHECKS',    // Checking expression equivalence of with other styles
  'UNIVARIATE-QUADRATIC', // A quadratic expression, presumably worth plotting.
  'SUBTRIVARIATE',        // An expression in one or two variables presumable plottable.
] as const;
export type StyleRole = typeof STYLE_ROLES[number];

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
  id?: StyleId;
  data: any;
  role: StyleRole;
  subrole?: StyleSubrole;
  timestamp?: string;
  type: StyleType;
}

export type StyleRelativePosition = StyleId | StylePosition;

export enum StylePosition {
  Top = 0,
  Bottom = -1,
}

export const STYLE_SUBROLES = [

  // 'FIGURE' subroles
  'SKETCH',
  'DRAWING',

  // 'FORMULA' subroles
  'ASSUME',
  'DEFINITION',
  'PROVE',
  'OTHER',

  // 'HINT' subroles

  // 'PLOT' subroles

  // 'TEXT' subroles
  'HEADING1',
  'HEADING2',
  'NORMAL',

  // 'UNKNOWN' subroles
  'UNKNOWN',

  // REPRESENTATION subroles
  'INPUT',          // TODO: Rename to 'PRIMARY'
  'ALTERNATE',
];
export type StyleSubrole = typeof STYLE_SUBROLES[number];

export const STYLE_TYPES = [
  'FORMULA-DATA',    // Type of data for top-level 'FORMULA' styles
  'HINT-DATA',       // Type of data for top-level 'HINT' styles
  'HTML',            // Html: HTML-formatted text
  'IMAGE',           // ImageData: URL of image relative to notebook folder.
  'JIIX',            // Jiix: MyScript JIIX export from 'MATH' editor.
  'LATEX',           // LatexData: LaTeX string // TODO: rename 'TEX'
  'CLASSIFICATION',  // DEPRECATED: A classifcication of the style.
  'MATHML',          // MathMlData: MathML Presentation XML
  'STROKES',         // Strokes of user sketch in our own format.
  'SYMBOL',          // SymbolData: symbol in a definition or expression.
  'SOLUTION',        // The result of a "solve" operation
  'SVG',             // SvgData: SVG markup
  'PLOT-DATA',       // Generic type to handle unspecified plot data
  'EQUATION',        // An equation (ambiguously assertion or relation)
  'TEXT',            // TextData: Plain text
  'TOOL',            // ToolInfo: Tool that can be applied to the parent style.
  'UNKNOWN',         // Type is as-yet unknown. Data field should be 'null'.
  'WOLFRAM',         // WolframData: Wolfram language expression
] as const;
export type StyleType = typeof STYLE_TYPES[number];

export const STYLE_SOURCES = [
  'MATHEMATICA',      // Mathematica C.A.S.
  'MYSCRIPT',         // MyScript handwriting recognition`
  'SANDBOX',          // Sandbox for temporary experiments
  'SUBTRIV-CLASSIFIER',
  'ALGEBRAIC-TOOLS',  // Algebraic tools provided by Wolfram
  'EQUATION-SOLVER',  // Attempt to expose Wolfram solutions
  'SVG',              // SVG observer
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

export const VERSION = "0.0.11";

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

  public nextId: StyleId; // TODO: Move nextId to server-notebook because it is not needed on the client.

  // Instance Property Functions

  // REVIEW: Return an iterator?
  public allRelationships(): RelationshipObject[] {
    // REVIEW: Does it matter whether we return relationships in sorted order or not?
    //       This could be as simple as: return Object.values(this.relationshipMap);
    //       Caller can sort if necessary.
    const sortedIds: RelationshipId[] = Object.keys(this.relationshipMap).map(k=>parseInt(k,10)).sort();
    return sortedIds.map(id=>this.relationshipMap[id]);
  }

  public relationshipsOf(id: StyleId): RelationshipObject[] {
    return this.allRelationships().filter(r=>(r.fromId == id || r.toId == id));
  }

  // REVIEW: Return an iterator?
  public allStyles(): StyleObject[] {
    // REVIEW: Does it matter whether we return relationships in sorted order or not?
    //       This could be as simple as: return Object.values(this.relationshipMap);
    //       Caller can sort if necessary.
    const sortedIds: StyleId[] = Object.keys(this.styleMap).map(k=>parseInt(k,10)).sort();
    return sortedIds.map(id=>this.getStyle(id));
  }

  // Returns all thoughts in notebook order
  // REVIEW: Return an iterator?
  public topLevelStyleOrder(): StyleId[] { return this.styleOrder; }

  public childStylesOf(id: StyleId): StyleObject[] {
    return this.allStyles().filter(s=>(s.parentId==id));
  }

  public getRelationship(id: RelationshipId): RelationshipObject {
    const rval = this.relationshipMap[id];
    if (!rval) { throw new RelationshipIdDoesNotExistError(`Relationship ${id} doesn't exist.`); }
    return rval;
  }

  public followingStyleId(id: StyleId): StyleId {
    // Returns the id of the style immediately after the top-level style specified.
    const i = this.styleOrder.indexOf(id);
    if (i<0) { throw new Error(`Style ${id} not found for followingStyleId.`); }
    if (i+1>=this.styleOrder.length) { throw new Error(`Style ${id} for followingStyleId is last style.`); }
    return this.styleOrder[i+1];
  }

  public getStyle(id: StyleId): StyleObject {
    const rval = this.styleMap[id];
    if (!rval) { throw new StyleIdDoesNotExistError(`Style ${id} doesn't exist.`); }
    return rval;
  }

  public toHtml(): Html {
    return this.topLevelStyleOrder()
    .map(styleId=>{
      const style = this.getStyle(styleId);
      return this.styleToHtml(style);
    })
    .join('');
  }

  // REVIEW: Return an iterator?
  public topLevelStyles(): StyleObject[] {
    return this.styleOrder.map(styleId=>this.getStyle(styleId));
  }

  public topLevelStyleOf(id: StyleId): StyleObject {
    let style = this.getStyle(id);
    if (!style) { throw new Error(`Cannot find top-level style of style ${id}`); }
    while (style.parentId) {
      style = this.getStyle(style.parentId);
    }
    return style;
  }

  public isTopLevelStyle(id: StyleId): boolean {
    return (this.getStyle(id).parentId == 0);
  }

  // Return the order-dependent position of the top level thought
  // this is attached to; this is used in "causal ordering".
  // getThoughtIndex(A) < getThoughtIndex(B) implies A may not
  // in anyway depend on B.
  public topLevelStylePosition(id: StyleId): StyleOrdinalPosition {
    const top = this.topLevelStyleOf(id);
    return this.styleOrder.indexOf(top.id);
  }

  // Instance Methods

  public applyChange(change: NotebookChange): void {
    // TODO: Don't let changes be null.
    if (change == null) { return; }

    switch(change.type) {
      case 'relationshipDeleted':   this.deleteRelationship(change.relationship); break;
      case 'relationshipInserted':  this.insertRelationship(change.relationship); break;
      case 'styleChanged':          this.changeStyle(change); break;
      case 'styleConverted':        this.convertStyle(change); break;
      case 'styleDeleted':          this.deleteStyle(change.style); break;
      case 'styleInserted':         this.insertStyle(change.style, change.afterId); break;
      case 'styleMoved':            this.moveStyle(change); break;
      default:
        throw new Error(`Applying unexpected change type: ${(<any>change).type}`);
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
    for (const relationship of <RelationshipObject[]>Object.values(this.relationshipMap)) {
      if ((options.fromId || options.toId) && relationship.fromId != options.fromId && relationship.toId != options.toId) { continue; }
      if (options.source && relationship.source != options.source) { continue; }
      if (options.role && relationship.role != options.role) { continue; }
      rval.push(relationship);
    }
    return rval;
  }

  public findStyle(
    options: FindStyleOptions,
    rootId?: StyleId,           // Search child styles of this style, otherwise top-level styles.
  ): StyleObject|undefined {
    // Option to throw if style not found.
    // REVIEW: If we don't need to throw on multiple matches, then we can terminate the search
    //         after we find the first match.
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
    // Option to throw if style not found.
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

  public hasStyle(
    options: FindStyleOptions,
    rootId?: StyleId,           // Search child styles of this style, otherwise top-level styles.
  ): boolean {
    // Returns true iff findStyles with the same parameters would return a non-empty list.
    // OPTIMIZATION: Return true when we find the first matching style.
    // NOTE: We don't use 'findStyle' because that throws on multiple matches.
    const styles = this.findStyles(options, rootId);
    return styles.length>0;
  }

  // --- PRIVATE ---

  // Private Class Properties

  // Private Class Methods

  // Private Instance Properties

  protected relationshipMap: RelationshipMap;
  protected styleMap: StyleMap;     // Mapping from style ids to style objects.
  protected styleOrder: StyleId[];  // List of style ids in the top-down order they appear in the notebook.

  // Private Instance Property Functions

  private relationshipToHtml(relationship: RelationshipObject): Html {
    return `<div><span class="leaf">R${relationship.id} ${relationship.fromId} &#x27a1; ${relationship.toId} ${relationship.role}</span></div>`;
  }

  private styleToHtml(style: StyleObject): Html {
    // TODO: This is very inefficient as notebook.childStylesOf goes through *all* styles.
    const childStyleObjects = Array.from(this.childStylesOf(style.id));
    // TODO: This is very inefficient as notebook.relationshipOf goes through *all* relationships.
    const relationshipObjects = Array.from(this.relationshipsOf(style.id));
    const json = (typeof style.data != 'undefined' ? escapeHtml(JSON.stringify(style.data)) : 'undefined' );
    const roleSubrole = (style.subrole ? `${style.role}|${style.subrole}` : style.role);
    const styleInfo = `S${style.id} ${roleSubrole} ${style.type} ${style.source}`
    if (childStyleObjects.length == 0 && relationshipObjects.length == 0 && json.length<30) {
      return `<div><span class="leaf">${styleInfo} <tt>${json}</tt></span></div>`;
    } else {
      const stylesHtml = childStyleObjects.map(s=>this.styleToHtml(s)).join('');
      const relationshipsHtml = relationshipObjects.map(r=>this.relationshipToHtml(r)).join('');
      const [ shortJsonTt, longJsonTt ] = json.length<30 ? [` <tt>${json}</tt>`, ''] : [ '', `<tt>${json}</tt>` ];
      return `<div>
  <span class="collapsed">${styleInfo}${shortJsonTt}</span>
  <div class="nested" style="display:none">${longJsonTt}
    ${stylesHtml}
    ${relationshipsHtml}
  </div>
</div>`;
    }
  }

  // Private Event Handlers

  // Private Instance Methods

  private changeStyle(change: StyleChanged): void {
    const styleId = change.style.id;
    const style = this.getStyle(styleId);
    style.data = change.style.data;
    // This is experimental; for SVG, we need a timestamp for
    // cleaning up the .PNG files
    if (style.type == 'SVG') {
      // @ts-ignore
      style.timestamp = Date.now();
    }
  }

  private convertStyle(change: StyleConverted): void {
    const style = this.getStyle(change.styleId);
    if (!style) { throw new Error(`Converting unknown style ${change.styleId}`); }
    style.role = change.role;
    style.subrole = change.subrole;
  }

  private deleteRelationship(relationship: RelationshipObject): void {
    // TODO: relationship may have already been deleted by another observer.
    const id = relationship.id;
    if (!this.relationshipMap[id]) { throw new Error(`Deleting unknown relationship ${id}`); }
    delete this.relationshipMap[id];
  }

  private deleteStyle(style: StyleObject): void {
    // If this is a top-level style then remove it from the top-level style order first.
    if (!style.parentId) {
      const i = this.styleOrder.indexOf(style.id);
      if (i<0) { throw new Error(`Deleting unknown top-level style ${style.id}`); }
      this.styleOrder.splice(i,1);
    }
    if (!this.styleMap[style.id]) { throw new Error(`Deleting unknown style ${style.id}`); }
    delete this.styleMap[style.id];
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
    if (this.isTopLevelStyle(change.styleId)) {
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
  return    (!options.role || (typeof options.role == 'object' && </* TYPESCRIPT: */any>options.role instanceof RegExp ? (<RegExp>options.role).test(style.role) : style.role == options.role))
         && (!options.subrole || style.subrole == options.subrole)
         && (!options.type || style.type == options.type)
         && (!options.source || style.source == options.source)
         && (!options.notSource || style.source != options.notSource);
}

// Helper Functions

// REVIEW: This function also exists in dom.ts, but that only works in the browser.
export function escapeHtml(str: string): Html {
  // From http://jehiah.cz/a/guide-to-escape-sequences.
  // REVIEW: Is this sufficient?
  return str.replace('&', "&amp;")
            .replace('"', "&quot;")
            .replace("'", "&#39;")
            .replace('>', "&gt;")
            .replace('<', "&lt;");
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
