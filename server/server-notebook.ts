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

import { Notebook, NotebookChange, StyleObject, StyleSource, StyleId, NotebookObject, RelationshipObject, RelationshipId, RelationshipProperties } from '../client/notebook';
import { NotebookChangeRequest, StylePropertiesWithSubprops } from '../client/math-tablet-api';
import { readNotebookFile, AbsDirectoryPath, absDirPathFromNotebookPath, writeNotebookFile, NotebookPath } from './files-and-folders';

// Types

export interface ObserverInstance {
  onChanges: (changes: NotebookChange[]) => Promise<NotebookChangeRequest[]>;
  onClose: ()=>Promise<void>;
  useTool: (styleObject: StyleObject) => Promise<NotebookChangeRequest[]>;
}

export interface ObserverClass {
  onOpen: (notebook: ServerNotebook)=>Promise<ObserverInstance>;
}

// Constants

const MAX_CHANGE_ROUNDS = 10;

// Exported Class

export class ServerNotebook extends Notebook {

  // Class Properties

  // Note: contrary to the name, this only returns persistent notebooks.
  public static allNotebooks(): IterableIterator<ServerNotebook> {
    return this.persistentNotebooks.values();
  }

  // Class Methods

  public static async close(notebookName: NotebookPath): Promise<void> {
    const instance = this.persistentNotebooks.get(notebookName);
    if (!instance) { throw new Error(`Unknown notebook ${notebookName} requested in close.`); }
    await instance.close();
  }

  public static async closeAll(): Promise<void> {
    debug(`closing all: ${this.persistentNotebooks.size}`);
    const notebooks = Array.from(this.persistentNotebooks.values());
    const promises = notebooks.map(td=>td.close());
    await Promise.all(promises);
  }

  public static async create(notebookPath: NotebookPath): Promise<ServerNotebook> {
    const openNotebook = this.persistentNotebooks.get(notebookPath);
    if (openNotebook) { throw new Error(`A notebook with that name already exists: ${notebookPath}`); }
    const notebook = new this(notebookPath);
    await notebook.initialize(this.observerClasses);
    await notebook.save();
    this.persistentNotebooks.set(notebookPath, notebook);
    return notebook;
  }

  public static async createAnonymous(): Promise<ServerNotebook> {
    const notebook = new this();
    await notebook.initialize(this.observerClasses);
    return notebook;
  }

  public static async open(notebookPath: NotebookPath): Promise<ServerNotebook> {
    // If the document is already open, then return the existing instance.
    const openNotebook = this.persistentNotebooks.get(notebookPath);
    if (openNotebook) { return openNotebook; }
    const json = await readNotebookFile(notebookPath);
    const obj = JSON.parse(json);
    const notebook = await this.fromJSON(obj, notebookPath);
    this.persistentNotebooks.set(notebookPath, notebook);
    return notebook;
  }

  public static registerObserver(source: StyleSource, observerClass: ObserverClass): void {
    debug(`Registering observer: ${source}`);
    this.observerClasses.set(source, observerClass);
  }

  // Instance Properties

  // NOTE: Properties with an underscore prefix are not persisted.
  public _path?: NotebookPath;

  // Instance Property Functions

  public absoluteDirectoryPath(): AbsDirectoryPath {
    if (!this._path) { throw new Error("No path for anonymous notebook."); }
    return absDirPathFromNotebookPath(this._path);
  }

  // Instance Methods

  public async close(): Promise<void> {
    // TODO: Ensure notebook is not in the middle of processing change requests or saving.
    if (this._closed) { throw new Error("Closing notebook that is already closed."); }
    debug(`closing: ${this._path}`);
    this._closed = true;
    if (this._path) { ServerNotebook.persistentNotebooks.delete(this._path); }
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
    let changes: NotebookChange[] = this.makeRequestedChanges(source, changeRequests);

    for (
      let round = 0;
      changes.length>0 && round<MAX_CHANGE_ROUNDS;
      round++
    ) {

      // Pass the changes to each observer to determine if it wants to make
      // additional changes as the result of the previous changes.
      // LATER: Submit to all observers in parallel.
      // IMPORTANT: We don't actually make the changes to the notebook
      // until *after* all observers have submitted their change requests for this round.
      const observerChangeRequests: Map<StyleSource, NotebookChangeRequest[]> = new Map();
      for (const [source, observer] of this._observerInstances) {
        // TODO: timeout on observer changes.
        const changeRequests = await observer.onChanges(changes);
        observerChangeRequests.set(source, changeRequests);
      };

      // Make the changes requested by the observers.
      let newChanges: NotebookChange[] = [];
      for (const [source, changeRequests] of observerChangeRequests) {
        newChanges = newChanges.concat(this.makeRequestedChanges(source, changeRequests));
      }

      allChanges = allChanges.concat(changes);
      changes = newChanges;
    }

    if (changes.length>0) {
      // TODO: Error, we ran out of rounds.
    }

    if (this._path) { await this.save(); }

    return allChanges;
  }

  public async useTool(styleId: StyleId): Promise<NotebookChange[]> {
    debug(`useTool ${styleId}`);
    this.assertNotClosed('useTool');
    const style = this.getStyleById(styleId);
    const source = style.source;
    if (!style) { throw new Error(`Notebook useTool style ID not found: ${styleId}`); }
    const observer = this._observerInstances.get(source);
    const changeRequests = await observer!.useTool(style);
    const changes = await this.requestChanges(source, changeRequests);
    return changes;
  }

  // --- PRIVATE ---

  // Private Class Properties

  private static observerClasses: Map<StyleSource, ObserverClass> = new Map();
  private static persistentNotebooks = new Map<NotebookPath, ServerNotebook>();

  // Private Class Methods

  private static async fromJSON(obj: NotebookObject, notebookPath: NotebookPath): Promise<ServerNotebook> {
    const notebook = new this(notebookPath, obj);
    await notebook.initialize(this.observerClasses);
    return notebook;
  }

  // Private Constructor

  private constructor(
    notebookPath?: NotebookPath,
    obj?: NotebookObject
  ) {
    super(obj);
    // NOTE: underscore-prefixed fields are non-persistent.
    this._observerInstances = new Map();
    this._path = notebookPath;
  }

  // Private Instance Properties

  // NOTE: Properties with an underscore prefix are not persisted.
  private _closed?: boolean;
  private _observerInstances: Map<StyleSource,ObserverInstance>;
  private _saving?: boolean;

  // Private Instance Property Functions

  private assertNotClosed(action: string): void {
    if (this._closed) { throw new Error(`Attempting ${action} on closed notebook.`); }
  }

  // Private Instance Methods

  private convertChangeRequestToChanges(
    source: StyleSource,
    changeRequest: NotebookChangeRequest,
  ): NotebookChange[] {
    switch(changeRequest.type) {
      case 'deleteRelationship':
        return [ this.deleteRelationshipChange(changeRequest.id) ];
      case 'deleteStyle':
        return this.deleteStyleChanges(changeRequest.styleId);
      case 'insertRelationship':
        return [ this.insertRelationshipChange(source, changeRequest.fromId, changeRequest.toId, changeRequest.props) ];
      case 'insertStyle':
        return this.insertStyleChanges(source, changeRequest.parentId||0, changeRequest.styleProps, changeRequest.afterId||-1);
      default:
        throw new Error("Unexpected.");
    }
  }

  private deleteRelationshipChange(id: RelationshipId): NotebookChange {
    const relationship = this.getRelationshipById(id);
    return { type: 'relationshipDeleted', relationship };
  }

  private deleteStyleChanges(id: StyleId): NotebookChange[] {
    let changes: NotebookChange[] = [];
    // Delete substyles recursively
    const styles = this.childStylesOf(id);
    for(const style of styles) {
      changes = changes.concat(this.deleteStyleChanges(style.id));
    }
    // Delete any relationships attached to this style.
    const relationships = this.relationshipsOf(id);
    for(const relationship of relationships) {
      changes.push(this.deleteRelationshipChange(relationship.id));
    }
    const style = this.getStyleById(id);
    changes.push({ type: 'styleDeleted', style });
    return changes;
  }

  // This should be called on any newly created notebook immediately after the constructor.
  private async initialize(observerClasses: Map<StyleSource,ObserverClass>): Promise<void> {

    if (this._path) {
      if (ServerNotebook.persistentNotebooks.has(this._path)) { throw new Error(`Initializing a notebook with a name that already exists.`); }
      ServerNotebook.persistentNotebooks.set(this._path, this);
    }

    // Call "onOpen" to get an observer instance for every registered observer class.
    for (const [name, observerClass] of observerClasses.entries()) {
      const observerInstance = await observerClass.onOpen(this);
      this._observerInstances.set(name, observerInstance);
    }
  }

  private insertRelationshipChange(
    source: StyleSource,
    fromId: StyleId,
    toId: StyleId,
    props: RelationshipProperties,
  ): NotebookChange {
    const relationship: RelationshipObject = {
      id: this.nextId++,
      source,
      fromId,
      toId,
      ...props,
    };
    return { type: 'relationshipInserted', relationship };
  }

  private insertStyleChanges(
    source: StyleSource,
    parentId: StyleId,
    styleProps: StylePropertiesWithSubprops,
    afterId: StyleId,
  ): NotebookChange[] {
    let changes: NotebookChange[] = [];
    const style: StyleObject = {
      data: styleProps.data,
      id: this.nextId++,
      meaning: styleProps.meaning,
      parentId: parentId || 0,
      source,
      type: styleProps.type,
    };
    changes.push({ type: 'styleInserted', style, afterId });

    if (styleProps.subprops) {
      for (const substyleProps of styleProps.subprops) {
        changes = changes.concat(this.insertStyleChanges(source, style.id, substyleProps, -1));
      }
    }

    if (styleProps.relationsFrom) {
      for (const [idStr, props] of Object.entries(styleProps.relationsFrom)) {
        changes.push(this.insertRelationshipChange(source, parseInt(idStr, 10), style.id, props));
      }
    }

    if (styleProps.relationsTo) {
      for (const [idStr, props] of Object.entries(styleProps.relationsTo)) {
        changes.push(this.insertRelationshipChange(source, style.id, parseInt(idStr, 10), props));
      }
    }

    return changes;
}

  private makeRequestedChanges(
    source: StyleSource,
    changeRequests: NotebookChangeRequest[]
  ): NotebookChange[] {
    let rval: NotebookChange[] = [];
    for (const changeRequest of changeRequests) {
      const changes = this.convertChangeRequestToChanges(source, changeRequest);
      this.applyChanges(changes);
      rval = rval.concat(changes);
    }
    return rval;
  }

  // Do not call this directly.
  // Changes to the document should result in calls to notifyChange,
  // which will schedule a save, eventually getting here.
  private async save(): Promise<void> {
    if (!this._path) { throw new Error("Cannot save non-persistent notebook."); }
    // TODO: Handle this in a more robust way.
    if (this._saving) { throw new Error(`Trying to save while save already in progress.`); }
    debug(`saving ${this._path}`);
    this._saving = true;
    const json = JSON.stringify(this);
    await writeNotebookFile(this._path, json);
    this._saving = false;
  }
}
