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

import { CssLength, CssSize, Html, assert, deepCopy, escapeHtml, ExpectedError } from "./common";
import { WatchedResource, Watcher } from "./watched-resource";
import { NOTEBOOK_NAME_RE, NotebookName, NotebookPath } from "./folder";

// Types

export interface FindStyleOptions {
  // REVIEW: Rename this interface to FindStylePattern
  role?: StyleRole|RegExp;
  source?: StyleSource;
  notSource?: StyleSource;
}

export type NotebookChange = CellDeleted | CellInserted | CellMoved;
export interface CellDeleted {
  type: 'cellDeleted';
  cellId: CellId;
}
export interface CellInserted {
  type: 'cellInserted';
  style: StyleObject;
  afterId?: CellRelativePosition;
}
export interface CellMoved {
  type: 'cellMoved';
  cellId: CellId;
  afterId: CellRelativePosition;
  oldPosition: CellOrdinalPosition;
  newPosition: CellOrdinalPosition;
}

export interface NotebookObject {
  nextId: CellId;
  pageConfig: PageConfig;
  pages: Page[];
  styleMap: StyleMap;
  version: string;
}

export interface NotebookWatcher extends Watcher {
  onChange(change: NotebookChange, ownRequest: boolean): void;
}

interface Page {
  cellIds: CellId[];
}

interface PageConfig {
  size: CssSize;
  margins: PageMargins;
}

interface PageMargins {
  bottom: CssLength;
  left: CssLength;
  right: CssLength;
  top: CssLength;
}

export type CellId = number;

export interface StyleMap {
  [id: /* CellId */number]: StyleObject;
}

export const STYLE_ROLES = [
  // Top level (cell) roles
  'FIGURE',               // FigureCellData
  'FORMULA',              // FormulaCellData
  'PLOT',                 // PlotCellData
  'TEXT',                 // TextCellData

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
  'SYMBOL',               // Symbols extracted from an expression.
  'SYMBOL-DEFINITION',    // Definition of a symbol.
  'SYMBOL-TABLE',         //
  'SYMBOL-USE',           // Use of a symbol.
  'DECORATION',           // Clearly indicates this is NOT the input but a decoration
  'EQUIVALENT-CHECKS',    // Checking expression equivalence of with other styles
  'UNIVARIATE-QUADRATIC', // A quadratic expression, presumably worth plotting.
  'SUBTRIVARIATE',        // An expression in one or two variables presumable plottable.
] as const;
export type StyleRole = typeof STYLE_ROLES[number];

export interface StyleObject extends StyleProperties {
  id: CellId;
  source: StyleSource;
}

// Position of style in the notebook.
// Applies only to top-level styles.
// Position 0 is the first cell of the notebook.
export type CellOrdinalPosition = number;

export interface StyleProperties {
  id?: CellId;
  data: any;
  role: StyleRole;
}

export type CellRelativePosition = CellId | CellPosition;

export enum CellPosition {
  Top = 0,
  Bottom = -1,
}

export const STYLE_SOURCES = [
  'SYSTEM',
  'USER',
] as const;
export type StyleSource = typeof STYLE_SOURCES[number];

export type WolframExpression = '{WolframExpression}';

// Constants

const DEFAULT_PAGE_CONFIG: PageConfig = {
  // REVIEW: Standardize on "pt" as the unit of measurement rather than mixing inches and points?
  size: { width: <CssLength>'8.5in', height: <CssLength>'11in' },
  margins: {
    top: <CssLength>'72pt', /* 72pt = 1 in */
    right: <CssLength>'72pt',
    bottom: <CssLength>'72pt',
    left: <CssLength>'72pt',
  }
}

export const VERSION = "0.0.16";

// Exported Class

export abstract class Notebook<W extends NotebookWatcher> extends WatchedResource<NotebookPath, W> {

  // Public Class Property Functions

  public static isValidNotebookName(name: NotebookName): boolean {
    return NOTEBOOK_NAME_RE.test(name);
  }

  // Public Class Methods

  public static validateObject(obj: NotebookObject): void {
    // Throws an exception with a descriptive message if the object is not a valid notebook object.
    // LATER: More thorough validation of the object.
    if (!obj.nextId) { throw new Error("Invalid notebook object JSON."); }
    if (obj.version != VERSION) {
      throw new ExpectedError(`Invalid notebook version ${obj.version}. Expect version ${VERSION}`);
    }
  }

  // Public Instance Properties

  public nextId: CellId;
  public pageConfig: PageConfig;
  public pages: Page[];

  // Public Instance Property Functions

  public allStyles(): StyleObject[] {
    // REVIEW: Return an iterator?
    const sortedIds: CellId[] = Object.keys(this.styleMap).map(k=>parseInt(k,10)).sort();
    return sortedIds.map(id=>this.getStyle(id));
  }

  public compareStylePositions(id1: CellId, id2: CellId): number {
    // Returns a negative number if style1 is before style2,
    // zero if they are the same styles,
    // or a positive number if style1 is after style2.
    const p1 = this.pages[0].cellIds.indexOf(id1);
    const p2 = this.pages[0].cellIds.indexOf(id2);
    assert(p1>=0 && p2>=0);
    return p1 - p2;
  }

  public followingStyleId(id: CellId): CellId {
    // Returns the id of the style immediately after the top-level style specified.
    const i = this.pages[0].cellIds.indexOf(id);
    assert(i>=0);
    if (i+1>=this.pages[0].cellIds.length) { return 0; }
    return this.pages[0].cellIds[i+1];
  }

  public getStyle(id: CellId): StyleObject {
    const rval = this.styleMap[id];
    assert(rval, `Style ${id} doesn't exist.`);
    return rval;
  }

  public getStyleThatMayNotExist(id: CellId): StyleObject|undefined {
    // TODO: Eliminate. Change usages to .findStyle.
    return this.styleMap[id];
  }

  public isEmpty(): boolean {
    // Returns true iff the notebook does not have any contents.
    return this.pages[0].cellIds.length == 0;
  }

  public precedingStyleId(id: CellId): CellId {
    // Returns the id of the style immediately before the top-level style specified.
    const i = this.pages[0].cellIds.indexOf(id);
    assert(i>=0);
    if (i<1) { return 0; }
    return this.pages[0].cellIds[i-1];
  }

  public toHtml(): Html {
    if (this.isEmpty()) { return <Html>"<i>Notebook is empty.</i>"; }
    else {
      return <Html>this.topLevelStyleOrder()
      .map(cellId=>{
        const style = this.getStyle(cellId);
        return this.styleToHtml(style);
      })
      .join('');
    }
  }

  public topLevelStyleOrder(): CellId[] {
    // REVIEW: Return IterableIterator<CellId>?
    return this.pages.reduce((acc: CellId[], page: Page)=>acc.concat(page.cellIds), []);
  }

  public topLevelStyles(): StyleObject[] {
    // REVIEW: Return IterableIterator<StyleObjectd>?
    return this.pages[0].cellIds.map(cellId=>this.getStyle(cellId));
  }

  public stylePosition(id: CellId): CellOrdinalPosition {
    return this.pages[0].cellIds.indexOf(id);
  }

  // Public Instance Methods

  public applyChange(change: NotebookChange, ownRequest: boolean): void {
    assert(change);

    // REVEIW: Maybe all change notification should go out prior?
    //         Then the styleChanged would not have to include "previousData"
    // Some change notifications are sent before the change is applied to the notebook so the watcher can
    // examine the style before it is modified.
    const notifyBefore = change.type == 'cellDeleted';
    if (notifyBefore) {
      for (const watcher of this.watchers) { watcher.onChange(change, ownRequest); }
    }

    switch(change.type) {
      case 'cellDeleted':          this.deleteCell(change.cellId); break;
      case 'cellInserted':         this.insertCell(change.style, change.afterId); break;
      case 'cellMoved':            this.moveCell(change); break;
      default:
        throw new Error(`Applying unexpected change type: ${(<any>change).type}`);
    }

    // Send change notifications that are supposed to go out *after* the change has been applied.
    if (!notifyBefore) {
      for (const watcher of this.watchers) { watcher.onChange(change, ownRequest); }
    }
  }

  public applyChanges(changes: NotebookChange[], ownRequest: boolean): void {
    for (const change of changes) { this.applyChange(change, ownRequest); }
  }

  public findStyle(options: FindStyleOptions): StyleObject|undefined {
    // REVIEW: If we don't need to throw on multiple matches, then we can terminate the search
    //         after we find the first match.
    // Like findStyles but expects to find zero or one matching style.
    // If it finds more than one matching style then it returns the first and outputs a warning.
    const styles = this.findStyles(options);
    if (styles.length > 0) {
      if (styles.length > 1) {
        // TODO: On the server, this should use the logging system rather than console output.
        console.warn(`More than one style found for ${JSON.stringify(options)}`);
      }
      return styles[0];
    } else {
      return undefined;
    }
  }

  public findStyles(
    options: FindStyleOptions,
    rval: StyleObject[] = []
  ): StyleObject[] {
    // Option to throw if style not found.
    const styles = this.topLevelStyles();
    // REVIEW: Use filter with predicate instead of explicit loop.
    for (const style of styles) {
      if (styleMatchesPattern(style, options)) { rval.push(style); }
    }
    return rval;
  }

  public hasStyleId(cellId: CellId): boolean {
    return this.styleMap.hasOwnProperty(cellId);
  }

  public hasStyle(
    options: FindStyleOptions,
  ): boolean {
    // Returns true iff findStyles with the same parameters would return a non-empty list.
    // OPTIMIZATION: Return true when we find the first matching style.
    // NOTE: We don't use 'findStyle' because that throws on multiple matches.
    const styles = this.findStyles(options);
    return styles.length>0;
  }

  // --- PRIVATE ---

  // Private Class Properties

  // Private Class Methods

  // Private Constructor

  protected constructor(path: NotebookPath) {
    super(path);
    this.nextId = 1;
    this.pages = [{ cellIds: []}];
    this.pageConfig = deepCopy(DEFAULT_PAGE_CONFIG),
    this.styleMap = {};
  }

  // Private Instance Properties

  protected styleMap: StyleMap;     // Mapping from style ids to style objects.

  // Private Instance Property Functions

  private styleToHtml(style: StyleObject): Html {
    // TODO: This is very inefficient as notebook.childStylesOf goes through *all* styles.
    const dataJson = (typeof style.data != 'undefined' ? escapeHtml(JSON.stringify(style.data)) : 'undefined' );
    const styleInfo = `S${style.id} ${style.role} ${style.source}`
    if (dataJson.length<30) {
      return <Html>`<div><span class="leaf">${styleInfo} <tt>${dataJson}</tt></span></div>`;
    } else {
      return <Html>`<div>
  <span class="collapsed">${styleInfo}</span>
  <div class="nested" style="display:none">
    <tt>${dataJson}</tt>
  </div>
</div>`;
    }
  }

  // Private Instance Methods

  private deleteCell(cellId: CellId): void {
    assert(this.styleMap[cellId]);
    // If this is a top-level style then remove it from the top-level style order first.
    const i = this.pages[0].cellIds.indexOf(cellId);
    assert(i>=0);
    this.pages[0].cellIds.splice(i,1);
    delete this.styleMap[cellId];
  }

  protected initializeFromObject(obj: NotebookObject): void {
    this.nextId = obj.nextId;
    this.pageConfig = obj.pageConfig;
    this.pages = obj.pages;
    this.styleMap = obj.styleMap;
  }

  private insertCell(style: StyleObject, afterId?: CellRelativePosition): void {

    this.styleMap[style.id] = style;
    // Insert top-level styles in the style order.
    if (!afterId || afterId===CellPosition.Top) {
      this.pages[0].cellIds.unshift(style.id);
    } else if (afterId===CellPosition.Bottom) {
      this.pages[0].cellIds.push(style.id);
    } else {
      const i = this.pages[0].cellIds.indexOf(afterId);
      if (i<0) { throw new Error(`Cannot insert thought after unknown thought ${afterId}`); }
      this.pages[0].cellIds.splice(i+1, 0, style.id);
    }
  }

  private moveCell(change: CellMoved): void {
    this.pages[0].cellIds.splice(change.oldPosition, 1);
    this.pages[0].cellIds.splice(change.newPosition, 0, change.cellId);
  }
}

// Helper Classes

// Helper Functions

export function StyleInsertedFromNotebookChange(change: NotebookChange): CellInserted {
  // TODO: Rename this function so it doesn't start with a capital letter.
  if (change.type != 'cellInserted') { throw new Error("Not StyleInserted change."); }
  return change;
}

export function styleMatchesPattern(style: StyleObject, options: FindStyleOptions): boolean {
  return    (!options.role || (typeof options.role == 'object' && </* TYPESCRIPT: */any>options.role instanceof RegExp ? (<RegExp>options.role).test(style.role) : style.role == options.role))
         && (!options.source || style.source == options.source)
         && (!options.notSource || style.source != options.notSource);
}
