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

import { EventEmitter } from 'events';

import * as debug1 from 'debug';
const MODULE = __filename.split('/').slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

import { NotebookChange, NotebookPath, StyleObject, StyleMeaning, StyleType, ThoughtObject, ThoughtId, StyleId, StyleProperties, ThoughtProperties, RelationshipObject, StylableId, RelationshipProperties, RelationshipId, StyleSource, ToolInfo } from '../client/math-tablet-api';
import { readNotebookFile, writeNotebookFile, AbsDirectoryPath, absDirPathFromNotebookPath } from './files-and-folders';

// Types

interface RelationshipMap {
  [id: /* RelationshipId */number]: RelationshipObject;
}

interface StyleMap {
  [id: /* StyleId */number]: StyleObject;
}

interface TDocObject {
  nextId: StylableId;
  relationshipMap: RelationshipMap;
  styleMap: StyleMap;
  thoughtMap: ThoughtMap;
  version: string;
}

interface ThoughtMap {
  [id: /* ThoughtId */number]: ThoughtObject;
}

export interface TDocOptions {
  anonymous?: boolean;
}

// Constants

const DEFAULT_OPTIONS: TDocOptions = { anonymous: false };
const SAVE_TIMEOUT_MS = 5000;

const VERSION = "0.0.5";

// REVIEW: Are there other event emitters in our project that need similar declarations?
// See https://stackoverflow.com/questions/39142858/declaring-events-in-a-typescript-class-which-extends-eventemitter
export declare interface TDoc {
  on(event: 'change', listener: (change: NotebookChange)=> void): this;
  on(event: 'close', listener: ()=> void): this;
  on(event: 'useTool', listener: (thoughtId: ThoughtId, source: StyleSource, info: ToolInfo)=>void): this;
  on(event: string, listener: Function): this;
}

export class TDoc extends EventEmitter {

  // Public Class Properties

  public static allTDocs(): IterableIterator<TDoc> {
    return this.tDocs.values();
  }

  // Public Class Methods

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
    tDoc.initialize();
    await tDoc.save();
    return tDoc;
  }

  public static createAnonymous(): TDoc {
    const tDoc = new this('anonymous', { anonymous: true });
    tDoc.initialize();
    return tDoc;
  }

  public static on(event: 'open', listener: (tDoc: TDoc)=>void): typeof TDoc {
    this.eventEmitter.on(event, listener.bind(this));
    return this;
  }

  public static async open(notebookPath: NotebookPath, options: TDocOptions): Promise<TDoc> {

    if (options.anonymous) { throw new Error(`Cannot open anonymous tdoc. Use create.`); }

    // If the document is already open, then return the existing instance.
    const openTDoc = this.tDocs.get(notebookPath);
    if (openTDoc) { return openTDoc; }
    const json = await readNotebookFile(notebookPath);
    const obj = JSON.parse(json);
    const tDoc = this.fromJSON(obj, notebookPath, options);
    return tDoc;
  }

  // Public Instance Properties

  public version: string;
  public nextId: StylableId;
  // NOTE: Properties with an underscore prefix are not persisted.
  public _path: NotebookPath;

  // Public Instance Property Functions

  public absoluteDirectoryPath(): AbsDirectoryPath {
    return absDirPathFromNotebookPath(this._path);
  }

  // REVIEW: Return an iterator?
  public allStyles(): StyleObject[] {
    return Object.values(this.styleMap);
  }

  // REVIEW: Return an iterator?
  public allThoughts(): ThoughtObject[] {
    return Object.values(this.thoughtMap);
  }

  public childStylesOf(stylableId: StylableId): StyleObject[] {
    return this.allStyles().filter(s=>(s.stylableId==stylableId));
  }

  // find all children of given type and meaning
  public findChildStyleOfType(id: StylableId, type: StyleType, meaning?: StyleMeaning): StyleObject[] {

    // we will count ourselves as a child here....
    const rval: StyleObject[] = [];
    const style = this.getStyleById(id);
    if (!style) { throw new Error(`Style ${id} not found.`); }

    if (style && 'type' in style) {
      // if null, this is a Thought, so not a Style...
      if (style && style.type == type && style.meaning == meaning) {
        // we match, so we add ourselves...
        rval.push(<StyleObject>style);
      }
    }

    // DANGER! this makes this function asymptotic quadratic or worse...
    // now for each kid, recurse...
    const kids = this.childStylesOf(id);
    for(const k of kids) {
      const kmatch = this.findChildStyleOfType(k.id, type, meaning);
      for(let km of kmatch) { rval.push(km); }
    }

    return rval;
  }

  public getAncestorThought(id : StylableId) : ThoughtObject {
    const thought = this.getThoughtById(id);
    if (thought) { return thought; }
    const style = this.getStyleById(id);
    if (!style) { throw new Error("Cannot find ancestor thought."); }
    return this.getAncestorThought(style.stylableId);
  }

  // REVIEW: Return an iterator?
  public getRelationships(
    stylableId?: StylableId,
  ): RelationshipObject[] {
    let rval: RelationshipObject[] = Object.values(this.relationshipMap);
    if (stylableId) { rval = rval.filter(r=>(r.sourceId == stylableId || r.targetId == stylableId)); }
    return rval;
  }

  public getStylable(styleId : StyleId) : StyleObject|ThoughtObject|null {
    return this.getThoughtById(styleId) || this.getStyleById(styleId) || null;
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
    const rs = this.getRelationships();
    var symbolStyles: StyleObject[] = [];
    const mp = this.getAncestorThought(style.id);
    if (!mp) {
      console.error("INTERNAL ERROR: did not produce ancenstor: ",style.id);
      throw new Error("INTERNAL ERROR: did not produce ancenstor: ");
    }
    rs.forEach(r => {
      const rp = this.getAncestorThought(r.targetId);
      if (!rp) {
        console.error("INTERNAL ERROR: did not produce ancenstor: ",style.id);
        throw new Error("INTERNAL ERROR: did not produce ancenstor: ");
      }
      if (rp.id == mp.id) {
        // We are a user of this definition...
        symbolStyles.push(<StyleObject>this.getStylable(r.sourceId));
      }
    });
    return symbolStyles;
  }

  public getThoughtById(id: ThoughtId): ThoughtObject {
    const rval = this.thoughtMap[id];
    if (!rval) { throw new Error(`Thought ${id} doesn't exist.`); }
    return rval;
  }

  public jsonPrinter(): string {
    return JSON.stringify(this,null,' ');
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
  public stylableHasChildOfType(style: StyleObject, tname: StyleType, meaning?: StyleMeaning): boolean {
    const id = style.id;
    return !!this.childStylesOf(id).find(s => s.type == tname && (!meaning || s.meaning == meaning));
  }

  public summaryPrinter(): string {
    var numLatex = this.numStyles('LATEX');
    var numMath = this.numStyles('MATHJS');
    var numText = this.numStyles('TEXT');
    return `${this.allThoughts().length} thoughts\n`
      + `${this.allStyles().length} styles\n`
      + `${numLatex} latex styles\n`
      + `${numMath} math styles\n`
      + `${numText} text styles\n`
    ;
  }

  // Remove fields that are not supposed to be persisted:
  //   Event emitter adds "domain" and a couple of underscore-prefixed properties.
  //   We add an underscore prefix on any of our own fields that we do not want persisted.
  public toJSON(): TDocObject {
    const obj = { ...this };
    for (const key in obj) {
      if (key.startsWith('_') || key == 'domain') { delete obj[key]; }
    }
    return <TDocObject><unknown>obj;
  }

  // Public Instance Methods

  public async close(): Promise<void> {
    if (this._closed) { throw new Error("Closing TDoc that is already closed."); }
    debug(`closing: ${this._path}`);
    this._closed = true;
    if (!this._options.anonymous) { TDoc.tDocs.delete(this._path); }
    this.emit('close');

    // If the tdoc is waiting to be saved, then save it now.
    if (this._saveTimeout) {
      clearTimeout(this._saveTimeout);
      delete this._saveTimeout;
      await this.save();
    }
    debug(`closed: ${this._path}`);
  }

  // Deletes the specified relationship.
  // Emits a TDoc 'change' event.
  public deleteRelationship(relationshipId: RelationshipId): void {
    this.deleteRelationshipEntryAndEmit(relationshipId);
  }

  // Deletes the specified style and any styles or relationships attached to it recursively.
  // Emits TDoc 'change' events in a depth-first postorder.
  public deleteStyle(styleId: StyleId): void {

    // Delete any relationships attached to this style.
    const relationships = this.getRelationships(styleId);
    for(const relationship of relationships) { this.deleteRelationship(relationship.id); }

    // Delete any styles attached to this style
    const styles = this.childStylesOf(styleId);
    for(const style of styles) { this.deleteStyle(style.id); }

    // Delete the style itself and emit a change event.
    this.deleteStyleEntryAndEmit(styleId);
  }

  // Deletes the specified thought and any styles attached to it recursively.
  // Emits TDoc 'change' events in a depth-first postorder.
  public deleteThought(thoughtId: ThoughtId): void {

    // Delete any relationships attached to this thought.
    const relationships = this.getRelationships(thoughtId);
    for(const relationship of relationships) { this.deleteRelationship(relationship.id); }

    // Delete any styles attached to this style
    const styles = this.childStylesOf(thoughtId);
    for(const style of styles) { this.deleteStyle(style.id); }

    // Delete the style itself and emit a change event.
    this.deleteThoughtEntryAndEmit(thoughtId);
  }

  public insertRelationship(
    source: StyleObject|ThoughtObject,
    target: StyleObject|ThoughtObject,
    props: RelationshipProperties,
  ): RelationshipObject {
    this.assertNotClosed('insertRelationship');
    const relationship: RelationshipObject = { ...props, id: this.nextId++, sourceId: source.id, targetId: target.id };
    debug(`inserting relationship ${JSON.stringify(relationship)}`)
    this.relationshipMap[relationship.id] = relationship;
    const change: NotebookChange = { type: 'relationshipInserted', relationship };
    this.notifyChange(change);
    return relationship;
  }

  public insertStyle(stylable: StyleObject|ThoughtObject, props: StyleProperties): StyleObject {
    this.assertNotClosed('insertStyle');
    const style: StyleObject = { ...props, id: this.nextId++, stylableId: stylable.id };
    const styleMinusData = { ...style, data: '...' };
    debug(`inserting style ${JSON.stringify(styleMinusData)}`)
    this.styleMap[style.id] = style;
    const change: NotebookChange = { type: 'styleInserted', style: style };
    this.notifyChange(change);
    return style;
  }

  public insertThought(props: ThoughtProperties): ThoughtObject {
    this.assertNotClosed('insertThought');
    const thought: ThoughtObject = { ...props, id: this.nextId++ };
    debug(`inserting thought ${JSON.stringify(thought)}`)
    this.thoughtMap[thought.id] = thought;
    const change: NotebookChange = { type: 'thoughtInserted', thought: thought };
    this.notifyChange(change);
    return thought;
  }

  public useTool(thoughtId: ThoughtId, source: StyleSource, info: ToolInfo): void {
    debug(`Emmiting useTool`);
    this.emit('useTool', thoughtId, source, info);
    debug(`done Emmiting useTool`);
  }

  // --- PRIVATE ---

  // Private Class Properties

  private static eventEmitter = new EventEmitter();
  // TODO: inspector page where we can see a list of the open TDocs.
  private static tDocs = new Map<NotebookPath, TDoc>();

  // Private Class Methods

  private static fromJSON(obj: TDocObject, notebookPath: NotebookPath, options: TDocOptions): TDoc {
    // Validate the object
    if (!obj.nextId) { throw new Error("Invalid TDoc object JSON."); }
    if (obj.version != VERSION) { throw new Error("TDoc in unexpected version."); }

    // Create the TDoc object from its properties and reanimated thoughts and styles.
    // REVIEW: We never call the constructor. Maybe we should?
    const tDoc: TDoc = Object.assign(Object.create(TDoc.prototype), obj);
    tDoc._path = notebookPath;
    tDoc._options = { ...DEFAULT_OPTIONS, ...options };
    tDoc.initialize();
    return tDoc;
  }

  // Private Constructor

  private constructor(notebookPath: NotebookPath, options: TDocOptions) {
    super();

    this.nextId = 1;
    this.relationshipMap = [];
    this.styleMap = [];
    this.thoughtMap = [];
    this.version = VERSION;
    this._path = notebookPath;
    this._options = { ...DEFAULT_OPTIONS, ...options };
    this.on('removeListener', this.onRemoveListener);
  }

  // Private Instance Properties

  private relationshipMap: RelationshipMap;
  private styleMap: StyleMap;
  private thoughtMap: ThoughtMap;
  // NOTE: Properties with an underscore prefix are not persisted.
  private _closed?: boolean;
  private _options: TDocOptions;
  private _saveTimeout?: NodeJS.Timeout|undefined;
  private _saving?: boolean;

  private assertNotClosed(action: string): void {
    if (this._closed) { throw new Error(`Attempting ${action} on closed TDoc.`); }
  }

  // Private Event Handlers

  private onRemoveListener(eventName: string) {
    if (eventName == 'change') {
      if (this.listenerCount('change') == 0) {
        debug("LAST CHANGE LISTENER REMOVED");
      }
    }
  }

  // Private Instance Methods

  // Delete a specific relationship entry and emits a 'change' event.
  private deleteRelationshipEntryAndEmit(id: RelationshipId): void {
    this.assertNotClosed('deleteRelationshipEntryAndEmit');
    const relationship = this.relationshipMap[id];
    if (!relationship) { throw new Error(`Deleting unknown relationship ${id}`); }
    delete this.relationshipMap[id];
    const change: NotebookChange = { type: 'relationshipDeleted', relationship };
    this.notifyChange(change);
  }

  // Delete a specific style entry and emits a 'change' event.
  // IMPORTANT: All attached styles should be deleted first!
  private deleteStyleEntryAndEmit(id: StyleId): void {
    this.assertNotClosed('deleteStyleEntryAndEmit');
    const style = this.styleMap[id];
    if (!style) { throw new Error(`Deleting unknown style ${id}`); }
    delete this.styleMap[id];
    const change: NotebookChange = { type: 'styleDeleted', styleId: id, stylableId: style.stylableId };
    this.notifyChange(change);
  }

  // Delete a specific thought entry and emits a 'change' event.
  // IMPORTANT: All attached styles should be deleted first!
  private deleteThoughtEntryAndEmit(id: ThoughtId): void {
    this.assertNotClosed('deleteThoughtEntryAndEmit');
    const thought = this.thoughtMap[id];
    if (!thought) { throw new Error(`Deleting unknown thought ${id}`); }
    delete this.thoughtMap[id];
    const change: NotebookChange = { type: 'thoughtDeleted', thoughtId: id };
    this.notifyChange(change);
  }

  // This should be called on any newly created TDoc immediately after the constructor.
  private initialize(): void {
    if (!this._options.anonymous) {
      if (TDoc.tDocs.has(this._path)) { throw new Error(`Initializing a TDoc with a name that already exists.`); }
      TDoc.tDocs.set(this._path, this);
    }
    TDoc.eventEmitter.emit('open', this);
  }

  // Call this method whenever you modify the tdoc.
  private notifyChange(change: NotebookChange) {
    this.emit('change', change);
    if (!this._options.anonymous) { this.scheduleSave(); }
  }

  // Do not call this directly.
  // Methods that change the document should call notifyChange.
  // notifyChange will call this method if the TDoc is persistent.
  private scheduleSave(): void {
    if (this._saveTimeout) {
      debug(`postponing save timeout: ${this._path}`);
      clearTimeout(this._saveTimeout);
    } else {
      debug(`scheduling save timeout: ${this._path}`);
    }
    this._saveTimeout = setTimeout(async ()=>{
      delete this._saveTimeout;
      try {
        await this.save();
      } catch(err) {
        console.error(`ERROR ${MODULE}: error saving ${this._path}: ${err.message}`);
        // TODO: What else should we do besides log an error?
      }
    }, SAVE_TIMEOUT_MS);
  }

  // Do not call this directly.
  // Changes to the document should result in calls to notifyChange,
  // which will schedule a save, eventually getting here.
  private async save(): Promise<void> {
    // TODO: Handle this in a more robust way.
    if (this._saving) { throw new Error(`Taking longer that ${SAVE_TIMEOUT_MS}ms to save.`); }
    debug(`saving ${this._path}`);
    this._saving = true;
    const json = JSON.stringify(this);
    await writeNotebookFile(this._path, json);
    this._saving = false;
  }

}

// HELPER FUNCTIONS
