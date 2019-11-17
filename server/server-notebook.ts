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

// REVIEW: Have a "read-only" notebook that only lets you read but not make any changes?
//         This would enforce all changes being made through the observer interfaces
//         rather than directly on the notebook.

// Requirements

import * as debug1 from 'debug';
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

import { Notebook, NotebookObject, NotebookChange,
         StyleObject, StyleSource, StyleId, StyleIdDoesNotExistError,
         RelationshipObject, RelationshipId, RelationshipIdDoesNotExistError, RelationshipProperties,
         StyleMoved, StylePosition } from '../client/notebook';
import { NotebookChangeRequest, StyleMoveRequest, Tracker, StyleInsertRequest
       } from '../client/math-tablet-api';
import { readNotebookFile, AbsDirectoryPath, absDirPathFromNotebookPath, writeNotebookFile, NotebookPath } from './files-and-folders';
import { constructSubstitution } from './observers/wolframscript';
import { ClientId } from './client-socket';
import { ClientObserver } from './observers/client-observer';

// Types

export interface ObserverInstance {
  onChanges: (changes: NotebookChange[]) => Promise<NotebookChangeRequest[]>;
  onClose: ()=>Promise<void>;
  useTool: (styleObject: StyleObject) => Promise<NotebookChangeRequest[]>;
}

export interface ObserverClass {
  onOpen: (notebook: ServerNotebook)=>Promise<ObserverInstance>;
}

export interface RequestChangesOptions {
  clientId?: ClientId;
  tracker?: Tracker;
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

  // NFC: Move this to instance methods section.
  // I think "variables" should be a parameter...
  // That parameter will be different when used by
  // SUBTRIVARIATE, and when used by EQUATION
  public substitutionExpression(text: string,variables : string[],style: StyleObject) : [string[],string] {

      // The parent of the TOOL/ATTRIBUTE style will be a WOLFRAM/EVALUATION style
    const evaluationStyle = this.getStyleById(style.parentId);

    // We are only plottable if we make the normal substitutions...
    const rs = this.getSymbolStylesIDependOn(evaluationStyle);
    debug("RS",rs);

    var cvariables  = [...variables];

    const namevalues = rs.map(
                              s => {
                                cvariables = cvariables.filter(ele => (
                                  ele != s.data.name));
                                return { name: s.data.name,
                                         value: s.data.value};
                              });

    const sub_expr =
      constructSubstitution(text,
                            namevalues);
    return [cvariables,sub_expr];
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
    await Promise.all(Array.from(this._observers.values()).map(o=>o.onClose()));
    for (const observer of this._clientObservers.values()) {
      observer.onClose();
    };

    debug(`closed: ${this._path}`);
  }

  public deregisterClientObserver(clientId: ClientId): void {
    const deleted = this._clientObservers.delete(clientId);
    if (!deleted) {
      console.error(`Cannot deregister non-registered client observer: ${clientId}`);
    }
  }

  public registerClientObserver(clientId: ClientId, instance: ClientObserver): void {
    this._clientObservers.set(clientId, instance)
  }

  public registerObserver(source: StyleSource, instance: ObserverInstance): void {
    this._observers.set(source, instance);
  }

  public deRegisterObserver(source: StyleSource): void {
    this._observers.delete(source);
  }

  public async requestChanges(
    source: StyleSource,
    changeRequests: NotebookChangeRequest[],
    options?: RequestChangesOptions,
  ): Promise<NotebookChange[]> {
    // TODO: separate synchronous observer stage that is deterministic?
    // TODO: submit changes to asynchronous observers simultaneously.
    // TODO: send changes to clients as soon as they come back
    //       such that we can still return the 'complete' flag.
    // TODO: timeout on observer processing of changes.
    // TODO: Don't allow multiple asynchronous requestChanges to be operating at the same time.
    options = options || {};

    debug(`requestChanges ${changeRequests.length}`);
    this.assertNotClosed('requestChanges');

    // Make the requested changes to the notebook.
    let allChanges: NotebookChange[] = [];
    let changes: NotebookChange[] = await this.makeRequestedChanges(source, changeRequests);

    for (
      let round = 0;
      changes.length>0 && round<MAX_CHANGE_ROUNDS;
      round++
    ) {
      debug("ROUND",round);

      // Pass the changes to each observer to determine if it wants to make
      // additional changes as the result of the previous changes.
      // LATER: Submit to all observers in parallel.
      // IMPORTANT: We don't actually make the changes to the notebook
      // until *after* all observers have submitted their change requests for this round.
      const observerChangeRequests: Map<StyleSource, NotebookChangeRequest[]> = new Map();
      for (const [source, observer] of this._observers) {
        const changeRequests = await observer.onChanges(changes);
        observerChangeRequests.set(source, changeRequests);
      };

      // Make the changes requested by the observers.
      let newChanges: NotebookChange[] = [];
      for (const [source, changeRequests] of observerChangeRequests) {
        newChanges = newChanges.concat(await this.makeRequestedChanges(source, changeRequests));
      }

      allChanges = allChanges.concat(changes);
      changes = newChanges;
    }

    if (changes.length>0) {
      // TODO: What do we do? Just drop the changes on the floor?
      console.error(`Dropping changes due to running out of rounds: ${changes.length}`);
    }

    if (this._path) { await this.save(); }

    // Send all changes to all clients
    for (const [ clientId, observer ] of this._clientObservers) {
      let tracker = (options.tracker && clientId == options.clientId ? options.tracker : undefined);
      const complete = true;
      observer.onChanges(allChanges, complete, tracker);
    };

    return allChanges;
  }

  public async useTool(styleId: StyleId): Promise<NotebookChange[]> {
    debug(`useTool ${styleId}`);
    this.assertNotClosed('useTool');
    const style = this.getStyleById(styleId);
    const source = style.source;
    if (!style) { throw new Error(`Notebook useTool style ID not found: ${styleId}`); }
    const observer = this._observers.get(source);
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
    // REVIEW: This is confusing given TypeScript's convention of underscore prefix for unused parameters.

    this._clientObservers = new Map();
    this._observers = new Map();
    this._path = notebookPath;
  }

  // Private Instance Properties

  // NOTE: Properties with an underscore prefix are not persisted.
  private _clientObservers: Map<ClientId, ClientObserver>;
  private _closed?: boolean;
  private _observers: Map<StyleSource, ObserverInstance>;
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
        debug("deleteRelationship case ins erver-notebook.ts");
        return this.deleteRelationshipChange(changeRequest.id);
      case 'changeStyle':
        return [ this.changeStyleChange(changeRequest.styleId, changeRequest.data) ];
      case 'deleteStyle':
        return this.deleteStyleChanges(changeRequest.styleId);
      case 'insertRelationship':
        return [ this.insertRelationshipChange(source, changeRequest.fromId, changeRequest.toId, changeRequest.props) ];
      case 'insertStyle':
        debug('insertStyle in convert Change',source,changeRequest);
        return this.insertStyleChanges(source, changeRequest);
      case 'moveStyle':
        const msc = this.moveStyleChange(source, changeRequest);
        if (msc)
          return [ msc ];
        else
          return [];
      default:
        throw new Error("Unexpected.");
    }
  }

  private changeStyleChange(id: StyleId, data: any): NotebookChange {
    const style = this.getStyleById(id);
    const previousData = style.data;
    style.data = data;
    const change: NotebookChange = { type: 'styleChanged', style, previousData };
    return change;
  }

  private deleteRelationshipChange(id: RelationshipId): NotebookChange[] {
    try {
      const relationship = this.getRelationshipById(id);
      return [{ type: 'relationshipDeleted', relationship }];
    }  catch (e) {
      if (e instanceof RelationshipIdDoesNotExistError) {
        // We do not consider this an error condition, as we
        // support multiple concurrent users.
        return [];
      } else {
        debug("uncaught error on attempted delete relationship",e);
        throw new Error("Interal Errror on delete relationship"+e.name);
      }
    }
    throw new Error("Interal Errror on delete relationship");
  }


  private deleteStyleChanges(id: StyleId): NotebookChange[] {
    let changes: NotebookChange[] = [];
    // Delete substyles recursively
    const styles = this.childStylesOf(id);
    for(const style of styles) {
      changes = changes.concat(this.deleteStyleChanges(style.id));
    }
    // Note: We actually can't do this automatically.
    // Although deleting a "from" or "to" style in a relationship
    // certainly invalidates that relationship, we may need the
    // relationship to compute how to "repair" or "reroute" the dependency
    // // Delete any relationships attached to this style.
    // const relationships = this.relationshipsOf(id);
    // for(const relationship of relationships) {
    //   changes.push(this.deleteRelationshipChange(relationship.id));
    // }
    try {
      const style = this.getStyleById(id);
      if (style) {
        changes.push({ type: 'styleDeleted', style });
      }
    } catch (e) {
      if (e instanceof StyleIdDoesNotExistError) {
        // We do not consider this an error condition, as we
        // support multiple concurrent users.
      } else {
        debug("uncaught error on attempted delete",e);
        throw new Error("spud"+e.name);
      }
    }
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
      const instance = await observerClass.onOpen(this);
      this.registerObserver(name, instance)
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

  private insertStyleChanges(source: StyleSource, request: StyleInsertRequest): NotebookChange[] {
    const parentId = request.parentId||0;
    const styleProps = request.styleProps;
    const afterId = request.hasOwnProperty('afterId') ? request.afterId : -1;

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
        const request2: StyleInsertRequest = { type: 'insertStyle', parentId: style.id, styleProps: substyleProps };
        changes = changes.concat(this.insertStyleChanges(source, request2));
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

    if (styleProps.exclusiveChildTypeAndMeaning) {
        const children = this.findChildStylesOfType(parentId,
                                                    style.type);

      // console.log("KIDS FOUND OF PARENT",children);
      // now in the set to be removed, remove ourself, and anyting with a different meaning
      const toRemove = children.filter(c => ((c.id != parentId) && (c.id != style.id) && (c.meaning == style.meaning) && (c.type == style.type)));
      // now remove the remainder
      // console.log("TO REMOVE",toRemove);
      for (const childToRemove of toRemove) {
//        const request2: StyleDeleteRequest = { type: 'deleteStyle', childToRemove };
        changes = changes.concat(this.deleteStyleChanges(childToRemove.id));
      }
    }

    return changes;
  }

  private moveStyleChange(_source: StyleSource, request: StyleMoveRequest): NotebookChange | null {

    const { styleId, afterId } = request;
    if (afterId == styleId) { throw new Error(`Style ${styleId} can't be moved after itself.`); }

    const tl = this.topLevelStyleOf(styleId);
//    if (tl.id != styleId) {  // In this case we are trying to a move a non-thought;
//          // This situation occurs because we have to move children in a general way,
//      // but there is nothing to to here.
//      return null;
//    }

    //    const oldPosition: StylePosition = this.styleOrder.indexOf(styleId);
    const oldPosition: StylePosition = this.styleOrder.indexOf(tl.id);
    if (oldPosition < 0) { throw new Error(`Style ${styleId} can't be moved: not found in styleOrder array.`); }

    let newPosition: StylePosition;
    if (afterId == 0) { newPosition = 0; }
    else if (afterId == -1) { newPosition = this.styleOrder.length  - 1; }
    else {
      newPosition = this.styleOrder.indexOf(afterId);
      if (newPosition < 0) { throw new Error(`Style ${styleId} can't be moved: other style ${afterId} not found in styleOrder array.`); }
      if (oldPosition > newPosition) { newPosition++; }
    }

    const rval: StyleMoved = {
      type: 'styleMoved',
      styleId: request.styleId,
      afterId: request.afterId,
      oldPosition,
      newPosition,
    };
    return rval;
  }

  private async makeRequestedChanges(
    source: StyleSource,
    changeRequests: NotebookChangeRequest[]
  ): Promise<NotebookChange[]> {
    let rval: NotebookChange[] = [];
    debug("changeREQUESTS", changeRequests);
    for (const changeRequest of changeRequests) {
      const changes = this.convertChangeRequestToChanges(source, changeRequest);
      await this.applyChanges(changes);
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
