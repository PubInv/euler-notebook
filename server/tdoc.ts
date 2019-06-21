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

// Requirement

import * as debug1 from 'debug';
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

import { NotebookChange, NotebookPath, StyleObject, StyleMeaning, StyleType,
         StyleId, RelationshipObject,
         RelationshipProperties, RelationshipId, StyleSource, NotebookChangeRequest, StylePropertiesWithSubprops, TDocObject, RelationshipMap, StyleMap } from '../client/math-tablet-api';
import { readNotebookFile, writeNotebookFile, AbsDirectoryPath, absDirPathFromNotebookPath } from './files-and-folders';

// Types

export interface ObserverInstance {
  onChanges: (changes: NotebookChange[]) => Promise<NotebookChangeRequest[]>;
  onClose: ()=>Promise<void>;
  useTool: (styleObject: StyleObject) => Promise<NotebookChangeRequest[]>;
}

export interface ObserverClass {
  onOpen: (tDoc: TDoc)=>Promise<ObserverInstance>;
}

export interface TDocOptions {
  anonymous?: boolean; // TODO: invert this to 'persistent'
}

// Constants

const DEFAULT_OPTIONS: TDocOptions = { anonymous: false };
const MAX_CHANGE_ROUNDS = 10;
export const VERSION = "0.0.8";

export class TDoc {

  // Class Properties

  // Note: contrary to the name, this only returns 'named' tDocs, not anonymous tDocs.
  public static allTDocs(): IterableIterator<TDoc> {
    return this.tDocs.values();
  }

  // Class Methods

  public static async close(notebookName: NotebookPath): Promise<void> {
    const instance = this.tDocs.get(notebookName);
    if (!instance) { throw new Error(`Unknown notebook ${notebookName} requested in close.`); }
    await instance.close();
  }

  public static async closeAll(): Promise<void> {
    debug(`closing all: ${this.tDocs.size}`);
    const tDocs = Array.from(this.tDocs.values());
    const promises = tDocs.map(td=>td.close());
    await Promise.all(promises);
  }

  public static async create(notebookPath: NotebookPath, options: TDocOptions): Promise<TDoc> {

    if (options.anonymous) { throw new Error(`Cannot use anonymous option with named tdoc.`); }

    // If the document is already open, then return the existing instance.
    const openTDoc = this.tDocs.get(notebookPath);
    if (openTDoc) { throw new Error(`A TDoc with that name already exists: ${notebookPath}`); }

    const tDoc = new this(notebookPath, options);
    await tDoc.initialize(this.observerClasses);
    await tDoc.save();
    this.tDocs.set(notebookPath, tDoc);
    return tDoc;
  }

  public static async createAnonymous(): Promise<TDoc> {
    const tDoc = new this('anonymous', { anonymous: true });
    await tDoc.initialize(this.observerClasses);
    return tDoc;
  }

  public static async open(notebookPath: NotebookPath, options: TDocOptions): Promise<TDoc> {

    if (options.anonymous) { throw new Error(`Cannot open anonymous tdoc. Use create.`); }

    // If the document is already open, then return the existing instance.
    const openTDoc = this.tDocs.get(notebookPath);
    if (openTDoc) { return openTDoc; }
    const json = await readNotebookFile(notebookPath);
    const obj = JSON.parse(json);
    const tDoc = await this.fromJSON(obj, notebookPath, options);
    this.tDocs.set(notebookPath, tDoc);
    return tDoc;
  }

  public static registerObserver(source: StyleSource, observerClass: ObserverClass): void {
    debug(`Registering observer: ${source}`);
    this.observerClasses.set(source, observerClass);
  }

  // Instance Properties

  public version: string;
  public nextId: StyleId;
  // NOTE: Properties with an underscore prefix are not persisted.
  public _path: NotebookPath;

  // Instance Property Functions

  public absoluteDirectoryPath(): AbsDirectoryPath {
    return absDirPathFromNotebookPath(this._path);
  }

  // REVIEW: Return an iterator?
  public allRelationships(): RelationshipObject[] {
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
    if (!rval) { throw new Error(`Relationship ${id} doesn't exist.`); }
    return rval;
  }

  public getStyleById(id: StyleId): StyleObject {
    const rval = this.styleMap[id];
    if (!rval) { throw new Error(`Style ${id} doesn't exist.`); }
    return rval;
  }

  // Return all StyleObjects which are Symbols for which
  // the is a Symbol Dependency relationship with this
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
      console.error("INTERNAL ERROR: did not produce ancenstor: ",style.id);
      throw new Error("INTERNAL ERROR: did not produce ancenstor: ");
    }
    rs.forEach(r => {
      const rp = this.topLevelStyleOf(r.toId);
      if (!rp) {
        console.error("INTERNAL ERROR: did not produce ancenstor: ",style.id);
        throw new Error("INTERNAL ERROR: did not produce ancenstor: ");
      }
      if (rp.id == mp.id) {
        // We are a user of this definition...
        symbolStyles.push(this.getStyleById(r.fromId));
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

  public summaryPrinter(): string {
    var numLatex = this.numStyles('LATEX');
    var numMath = this.numStyles('MATHJS');
    var numText = this.numStyles('TEXT');
    return `${this.topLevelStyleOrder().length} thoughts\n`
      + `${this.allStyles().length} styles\n`
      + `${numLatex} latex styles\n`
      + `${numMath} math styles\n`
      + `${numText} text styles\n`
    ;
  }

  // Remove fields with an underscore prefix, because they are not supposed to be persisted.
  public toJSON(): TDocObject {
    const obj = { ...this };
    for (const key in obj) {
      if (key.startsWith('_')) { delete obj[key]; }
    }
    return <TDocObject><unknown>obj;
  }

  public topLevelStyleOf(id: StyleId): StyleObject {
    const style = this.styleMap[id];
    if (!style) { throw new Error("Cannot find top-level style."); }
    if (!style.parentId) { return style; }
    return this.topLevelStyleOf(style.parentId);
  }

  // Instance Methods

  public async close(): Promise<void> {
    // TODO: Ensure notebook is not in the middle of processing change requests or saving.
    if (this._closed) { throw new Error("Closing TDoc that is already closed."); }
    debug(`closing: ${this._path}`);
    this._closed = true;
    if (!this._options.anonymous) { TDoc.tDocs.delete(this._path); }
    await Promise.all(Array.from(this._observerInstances.values()).map(o=>o.onClose()));

    debug(`closed: ${this._path}`);
  }

  public registerObserver(source: StyleSource, observerInstance: ObserverInstance): void {
    this._observerInstances.set(source, observerInstance);
  }

  public async requestChanges(source: StyleSource, changeRequests: NotebookChangeRequest[]): Promise<NotebookChange[]> {

    // TODO: Don't allow multiple asynchronous requestChanges to be operating at the same time.

    debug(`requestChanges ${changeRequests.length}`);
    this.assertNotClosed('requestChanges');

    // Make the requested changes to the notebook.
    let allChanges: NotebookChange[] = [];
    let changes: NotebookChange[] = this.makeRequestedChangesToTDoc(source, changeRequests);

    for (
      let round = 0;
      changes.length>0 && round<MAX_CHANGE_ROUNDS;
      round++
    ) {

      // Pass the changes to each observer to determine if it wants to make
      // additional changes as the result of the previous changes.
      const observerChangeRequests: Map<StyleSource, NotebookChangeRequest[]> = new Map();

      // Ask the observers what change requests they would like to make.
      // LATER: Submit to all observers in parallel.
      for (const [source, observer] of this._observerInstances) {
        // TODO: timeout on observer changes.
        const changeRequests = await observer.onChanges(changes);
        observerChangeRequests.set(source, changeRequests);
      };

      // Make the changes requested by the observers.
      let newChanges: NotebookChange[] = [];
      for (const [source, changeRequests] of observerChangeRequests) {
        newChanges = newChanges.concat(this.makeRequestedChangesToTDoc(source, changeRequests));
      }

      allChanges = allChanges.concat(changes);
      changes = newChanges;
    }

    if (changes.length>0) {
      // TODO: Error, we ran out of rounds.
    }

    // If the notebook is persistent, then save.
    if (!this._options.anonymous) { await this.save(); }

    return allChanges;
  }

  public async useTool(styleId: StyleId): Promise<NotebookChange[]> {
    debug(`useTool ${styleId}`);
    this.assertNotClosed('useTool');
    const style = this.getStyleById(styleId);
    const source = style.source;
    if (!style) { throw new Error(`TDoc useTool style ID not found: ${styleId}`); }
    const observer = this._observerInstances.get(source);
    const changeRequests = await observer!.useTool(style);
    const changes = await this.requestChanges(source, changeRequests);
    return changes;
  }

  // --- PRIVATE ---

  // Private Class Properties

  // TODO: inspector page where we can see a list of the open TDocs.
  private static observerClasses: Map<StyleSource, ObserverClass> = new Map();
  private static tDocs = new Map<NotebookPath, TDoc>();

  // Private Class Methods

  private static async fromJSON(obj: TDocObject, notebookPath: NotebookPath, options: TDocOptions): Promise<TDoc> {
    // Validate the object
    if (!obj.nextId) { throw new Error("Invalid TDoc object JSON."); }
    if (obj.version != VERSION) { throw new Error("TDoc in unexpected version."); }

    // Create the TDoc object from its properties and reanimated thoughts and styles.
    // REVIEW: We never call the constructor. Maybe we should?
    const tDoc: TDoc = Object.assign(Object.create(TDoc.prototype), obj);
    tDoc._path = notebookPath;
    tDoc._observerInstances = new Map();
    tDoc._options = { ...DEFAULT_OPTIONS, ...options };
    await tDoc.initialize(this.observerClasses);
    return tDoc;
  }

  // Private Constructor

  private constructor(notebookPath: NotebookPath, options: TDocOptions) {
    this.nextId = 1;
    this.relationshipMap = {};
    this.styleMap = {};
    this.styleOrder = [];
    this.version = VERSION;
    // IMPORTANT: If you add any non-persistent fields (underscore-prefixed)
    // that need to be initialized, initialize them below, and also in fromJSON.
    this._options = { ...DEFAULT_OPTIONS, ...options };
    this._observerInstances = new Map();
    this._path = notebookPath;
  }

  // Private Instance Properties

  private relationshipMap: RelationshipMap;
  private styleMap: StyleMap;     // Mapping from style ids to style objects.
  private styleOrder: StyleId[];  // List of style ids in the top-down order they appear in the notebook.

  // NOTE: Properties with an underscore prefix are not persisted.
  private _closed?: boolean;
  private _observerInstances: Map<StyleSource,ObserverInstance>;
  private _options: TDocOptions;
  private _saving?: boolean;

  private assertNotClosed(action: string): void {
    if (this._closed) { throw new Error(`Attempting ${action} on closed TDoc.`); }
  }

  // Private Event Handlers

  // Private Instance Methods

  private deleteRelationship(id: RelationshipId): NotebookChange {
    // TODO: relationship may have already been deleted by another observer.

    const relationship = this.relationshipMap[id];
    if (!relationship) { throw new Error(`Deleting unknown relationship ${id}`); }
    delete this.relationshipMap[id];
    const change: NotebookChange = { type: 'relationshipDeleted', relationship };
    return change;
  }

  // Deletes the specified style and any styles or relationships attached to it recursively.
  private deleteStyle(id: StyleId): NotebookChange[] {

    // TODO: style may have already been deleted by another observer. Not an error?
    const style = this.styleMap[id];
    if (!style) { throw new Error(`Deleting unknown style ${id}`); }

    let changes: NotebookChange[] = [];

    // Delete any styles attached to this style
    const styles = this.childStylesOf(id);
    for(const style of styles) {
      changes = changes.concat(this.deleteStyle(style.id));
    }

    // Delete any relationships attached to this style.
    const relationships = this.relationshipsOf(id);
    for(const relationship of relationships) {
      changes.push(this.deleteRelationship(relationship.id));
    }

    // If this is a top-level style then remove it from the top-level style order.
    if (!style.parentId) {
      const i = this.styleOrder.indexOf(id);
      this.styleOrder.splice(i,1);
    }

    delete this.styleMap[id];

    const change: NotebookChange = { type: 'styleDeleted', styleId: id, parentId: style.parentId };
    changes.push(change);

    return changes;
  }

  // This should be called on any newly created TDoc immediately after the constructor.
  private async initialize(observerClasses: Map<StyleSource,ObserverClass>): Promise<void> {

    if (!this._options.anonymous) {
      if (TDoc.tDocs.has(this._path)) { throw new Error(`Initializing a TDoc with a name that already exists.`); }
      TDoc.tDocs.set(this._path, this);
    }

    // Call "onOpen" to get an observer instance for every registered observer class.
    for (const [name, observerClass] of observerClasses.entries()) {
      const observerInstance = await observerClass.onOpen(this);
      this._observerInstances.set(name, observerInstance);
    }
  }

  private insertRelationship(
    source: StyleSource,
    fromId: StyleId,
    toId: StyleId,
    props: RelationshipProperties
  ): NotebookChange {
    const relationship: RelationshipObject = {
      source,
      id: this.nextId++,
      fromId,
      toId,
      ...props,
    };
    debug(`inserting relationship ${JSON.stringify(relationship)}`)
    this.relationshipMap[relationship.id] = relationship;
    const change: NotebookChange = { type: 'relationshipInserted', relationship };
    return change;
  }

  // Inserts the style and any specified substyles or to/from relationships.
  private insertStyle(
    source: StyleSource,      // Observer inserting the style
    parentId: StyleId,        // Parent style. 0 for top-level style.
    styleProps: StylePropertiesWithSubprops, // Style data
    afterId: StyleId,         // For top-level styles, ID of thought to insert after, 0 for beginning, or -1 for end.
  ): NotebookChange[] {

    const style: StyleObject = {
      data: styleProps.data,
      id: this.nextId++,
      meaning: styleProps.meaning,
      parentId: parentId || 0,
      source,
      type: styleProps.type,
    };

    debug(`inserting style after ${afterId}: ${style.source} ${style.id} ${style.meaning}`);

    // Add the style to the TDoc
    this.styleMap[style.id] = style;

    // If this is a top-level style, then insert it in the correct place in the style order.
    if (!parentId) {
      if (afterId===0) {
        this.styleOrder.unshift(style.id);
      } else if (afterId===-1) {
        this.styleOrder.push(style.id);
      } else {
        const i = this.styleOrder.indexOf(afterId);
        if (i<0) { throw new Error(`Cannot insert thought after unknown thought ${afterId}`); }
        this.styleOrder.splice(i+1, 0, style.id);
      }
    }

    const change: NotebookChange = { type: 'styleInserted', style: style };
    if (!parentId) { change.afterId = afterId; }
    let changes: NotebookChange[] = [ change ];

    if (styleProps.subprops) {
      for (const substyleProps of styleProps.subprops) {
        changes = changes.concat(this.insertStyle(source, style.id, substyleProps, -1));
      }
    }

    if (styleProps.relationsFrom) {
      for (const [idStr, props] of Object.entries(styleProps.relationsFrom)) {
        changes.push(this.insertRelationship(source, parseInt(idStr, 10), style.id, props));
      }
    }

    if (styleProps.relationsTo) {
      for (const [idStr, props] of Object.entries(styleProps.relationsTo)) {
        changes.push(this.insertRelationship(source, style.id, parseInt(idStr, 10), props));
      }
    }

    return changes;
  }

  private makeRequestedChangesToTDoc(
    source: StyleSource,
    changeRequests: NotebookChangeRequest[],
  ): NotebookChange[] {
    let changes: NotebookChange[] = [];
    for (const changeRequest of changeRequests) {
      switch(changeRequest.type) {
        case 'deleteRelationship':
          changes.push(this.deleteRelationship(changeRequest.id));
          break;
        case 'deleteStyle':
          changes = changes.concat(this.deleteStyle(changeRequest.styleId));
          break;
        case 'insertRelationship':
          changes.push(this.insertRelationship(
            source,
            changeRequest.fromId,
            changeRequest.toId,
            changeRequest.props,
          ));
          break;
        case 'insertStyle':
          changes = changes.concat(this.insertStyle(
            source,
            changeRequest.parentId||0,
            changeRequest.styleProps,
            changeRequest.afterId||-1,
          ));
          break;
        default:
          throw new Error("Unexpected.");
      }
    }
    return changes;
  }

  // Do not call this directly.
  // Changes to the document should result in calls to notifyChange,
  // which will schedule a save, eventually getting here.
  private async save(): Promise<void> {
    // TODO: Handle this in a more robust way.
    if (this._saving) { throw new Error(`Trying to save while save already in progress.`); }
    debug(`saving ${this._path}`);
    this._saving = true;
    const json = JSON.stringify(this);
    await writeNotebookFile(this._path, json);
    this._saving = false;
  }

}

// HELPER FUNCTIONS
