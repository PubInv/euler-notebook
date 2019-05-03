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

import { NotebookChange, NotebookPath, StyleObject, StyleMeaning, StyleType, TDocObject, ThoughtObject, ThoughtId, StyleId } from '../client/math-tablet-api';

import { readNotebookFile, writeNotebookFile, AbsDirectoryPath, absDirPathFromNotebookPath } from './users-and-files';

// Types

type StylableId = number;
// type StyleRule = (tdoc: TDoc, style: Style)=>Style[];

export interface TDocOptions {
  anonymous?: boolean;
}

// TDocChange. Keep in sync with NotebookChange

export type TDocChange = StyleDeleted|StyleInserted|ThoughtDeleted|ThoughtInserted;

interface StyleDeleted {
  type: 'styleDeleted';
  // REVIEW: This is probably not sufficient info,
  //         as the style has already been deleted from
  //         the TDoc when this event is fired.
  stylableId: StylableId;
  styleId: StyleId;
}

interface StyleInserted {
  type: 'styleInserted';
  style: StyleObject;
}

interface ThoughtDeleted {
  type: 'thoughtDeleted';
  // REVIEW: This is probably not sufficient info,
  //         as the thought has already been deleted from
  //         the TDoc when this event is fired.
  thoughtId: ThoughtId;
}

interface ThoughtInserted {
  type: 'thoughtInserted';
  thought: ThoughtObject;
}

// Constants

const DEFAULT_OPTIONS: TDocOptions = { anonymous: false };
const SAVE_TIMEOUT_MS = 5000;

// VERSION CHANGES:
// 0.0.1 - Initial version.
// 0.0.2 - Made meaning required on styles.
const VERSION = "0.0.2";

// REVIEW: Are there other event emitters in our project that need similar declarations?
// See https://stackoverflow.com/questions/39142858/declaring-events-in-a-typescript-class-which-extends-eventemitter
export declare interface TDoc {
  on(event: 'change', listener: (change: NotebookChange)=> void): this;
  on(event: 'close', listener: ()=> void): this;
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
    console.log(`TDoc: closing all: ${this.tDocs.size}`);
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
    console.log("OPENING");
    console.dir(notebookPath);
    console.dir(Array.from(this.tDocs.keys()));
    const openTDoc = this.tDocs.get(notebookPath);
    if (openTDoc) { return openTDoc; }
    console.log("NOT FOUND, READING");
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

  public getThoughts(): ThoughtObject[] {
    return this.thoughts;
  }

  public getStyles(stylableId?: StylableId): StyleObject[] {
    if (stylableId) { return this.styles.filter(s=>(s.stylableId==stylableId)); }
    else { return this.styles; }
  }

  public jsonPrinter(): string {
    return JSON.stringify(this,null,' ');
  }

  public absoluteDirectoryPath(): AbsDirectoryPath {
    return absDirPathFromNotebookPath(this._path);
  }

  public numStyles(tname: StyleType, meaning?: StyleMeaning) : number {
    return this.styles.reduce(
      function(total,x){
        return (x.type == tname && (!meaning || x.meaning == meaning))
          ?
          total+1 : total},
      0);
  }

  // This can be asymptotically improved later.
  public stylableHasChildOfType(style: StyleObject, tname: StyleType, meaning?: StyleMeaning): boolean {
    const id = style.id;
    return !!this.styles.find(s => s.stylableId == id &&
                            s.type == tname &&
                            (!meaning || s.meaning == meaning));
  }

  public summaryPrinter(): string {
    var numLatex = this.numStyles('LATEX');
    var numMath = this.numStyles('MATHJS');
    var numText = this.numStyles('TEXT');
    return `${this.thoughts.length} thoughts\n`
      + `${this.styles.length} styles\n`
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
    console.log(`TDoc: closing: ${this._path}`);
    this._closed = true;
    if (!this._options.anonymous) { TDoc.tDocs.delete(this._path); }
    this.emit('close');

    // If the tdoc is waiting to be saved, then save it now.
    if (this._saveTimeout) {
      clearTimeout(this._saveTimeout);
      delete this._saveTimeout;
      await this.save();
    }
    console.log(`TDoc: closed: ${this._path}`);
  }

  // Deletes the specified style and any styles attached to it recursively.
  // Emits 'change' events in a depth-first postorder.
  public deleteStyle(styleId: StyleId): void {
    const styles = this.getStyles(styleId);
    for(const style of styles) { this.deleteStyle(style.id); }
    this.deleteStyleEntryAndEmit(styleId);
  }

  // Deletes the specified thought and any styles attached to it recursively.
  // Emits 'change' events in a depth-first postorder.
  public deleteThought(thoughtId: ThoughtId): void {
    const styles = this.getStyles(thoughtId);
    for(const style of styles) { this.deleteStyle(style.id); }
    this.deleteThoughtEntryAndEmit(thoughtId);
  }

  public insertStyle(obj: StyleObject): StyleObject {
    this.assertNotClosed('insertStyle');
    const style: StyleObject = { ...obj, id: this.nextId++ };
    this.styles.push(style);
    const change: NotebookChange = { type: 'styleInserted', style: style };
    this.notifyChange(change);
    return style;
  }

  public insertThought(): ThoughtObject {
    this.assertNotClosed('insertThought');
    const thought: ThoughtObject = { id: this.nextId++ };
    this.thoughts.push(thought);
    const change: NotebookChange = { type: 'thoughtInserted', thought: thought };
    this.notifyChange(change);
    return thought;
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
    this.styles = [];
    this.thoughts = [];
    this.version = VERSION;
    this._path = notebookPath;
    this._options = { ...DEFAULT_OPTIONS, ...options };
    this.on('removeListener', this.onRemoveListener);
  }

  // Private Instance Properties

  private styles: StyleObject[];
  private thoughts: ThoughtObject[];
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
        console.log("LAST CHANGE LISTENER REMOVED");
      }
    }
  }

  // Private Instance Methods

  // Delete a specific style entry and emits a 'change' event.
  // IMPORTANT: All attached styles should be deleted first!
  private deleteStyleEntryAndEmit(styleId: StyleId): void {
    this.assertNotClosed('deleteStyle');
    const index = this.styles.findIndex(s=>(s.id==styleId));
    const style = this.styles[index];
    if (index<0) { throw new Error(`Deleting unknown style ${styleId}`); }
    this.styles.splice(index, 1);
    const change: NotebookChange = { type: 'styleDeleted', styleId, stylableId: style.stylableId };
    this.notifyChange(change);
  }

  // Delete a specific thought entry and emits a 'change' event.
  // IMPORTANT: All attached styles should be deleted first!
  private deleteThoughtEntryAndEmit(thoughtId: ThoughtId): void {
    this.assertNotClosed('deleteThought');
    const index = this.thoughts.findIndex(t=>(t.id==thoughtId));
    if (index<0) { throw new Error(`Deleting unknown thought ${thoughtId}`); }
    this.thoughts.splice(index, 1);
    const change: NotebookChange = { type: 'thoughtDeleted', thoughtId };
    this.notifyChange(change);
  }

  // This should be called on any newly created TDoc immediately after the constructor.
  private initialize(): void {
    if (!this._options.anonymous) {
      console.log("INITIALIZING");
      console.dir(this._path);
      console.dir(Array.from(TDoc.tDocs.keys()));
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
      console.log(`TDoc: postponing save timeout: ${this._path}`);
      clearTimeout(this._saveTimeout);
    } else {
      console.log(`TDoc: scheduling save timeout: ${this._path}`);
    }
    this._saveTimeout = setTimeout(async ()=>{
      delete this._saveTimeout;
      try {
        await this.save();
      } catch(err) {
        console.error(`TDoc: error saving ${this._path}: ${err.message}`);
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
    console.log(`TDoc: saving ${this._path}`);
    this._saving = true;
    const json = JSON.stringify(this);
    await writeNotebookFile(this._path, json);
    this._saving = false;
  }

}

// HELPER FUNCTIONS
