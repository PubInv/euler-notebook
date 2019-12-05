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

import { assert } from 'chai';
import {
  Notebook, NotebookObject, NotebookChange, StyleObject, StyleMeaning, StyleType, StyleSource, StyleId,
  RelationshipObject, StyleMoved, StylePosition, VERSION, StyleChanged, RelationshipDeleted,
  RelationshipInserted, StyleInserted, StyleDeleted
} from '../client/notebook';
import {
  NotebookChangeRequest, StyleMoveRequest, StyleInsertRequest, StyleChangeRequest,
  RelationshipDeleteRequest, StyleDeleteRequest, RelationshipInsertRequest,
  StylePropertiesWithSubprops, ChangeNotebookOptions
} from '../client/math-tablet-api';

import {
  readNotebookFile, AbsDirectoryPath, absDirPathFromNotebookPath, writeNotebookFile,
  NotebookPath
} from './files-and-folders';
import { constructSubstitution } from './observers/wolframscript';
import { ClientObserver } from './observers/client-observer';
import { ClientId } from './client-socket';

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// Types

export interface ObserverInstance {
  onChangesAsync: (changes: NotebookChange[]) => Promise<NotebookChangeRequest[]>;
  onChangesSync: (changes: NotebookChange[]) => NotebookChangeRequest[];
  onClose: ()=>Promise<void>;
  useTool: (styleObject: StyleObject) => Promise<NotebookChangeRequest[]>;
}

export interface ObserverClass {
  onOpen: (notebook: ServerNotebook)=>Promise<ObserverInstance>;
}

export interface RequestChangesOptions extends ChangeNotebookOptions {
  clientId?: ClientId;
}

// Constants

const MAX_CHANGE_ROUNDS = 10;

// Helper Functions
// TODO: Rewrite this to using findStyles
export function assertHasStyle(styles: StyleObject[], type: StyleType, meaning: StyleMeaning, data: any): StyleObject {
  const style = styles.find(s=>s.type==type && s.meaning==meaning && s.data==data);
  assert.exists(style);
  return style!;
}


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
    const notebook = await this.fromJSON(json, notebookPath);
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

  // Instance Property Functions

  // Remove fields with an underscore prefix, because they are not supposed to be persisted.
  public toJSON(): NotebookObject {
    const rval: NotebookObject = {
      nextId: this.nextId,
      relationshipMap: this.relationshipMap,
      styleMap: this.styleMap,
      styleOrder: this.styleOrder,
      version: VERSION,
    }
    return rval;
  }

  // Instance Methods

  public async close(): Promise<void> {
    // TODO: Ensure notebook is not in the middle of processing change requests or saving.
    if (this.closed) { throw new Error("Closing notebook that is already closed."); }
    debug(`closing: ${this._path}`);
    this.closed = true;
    if (this._path) { ServerNotebook.persistentNotebooks.delete(this._path); }
    await Promise.all(Array.from(this.observers.values()).map(o=>o.onClose()));
    for (const observer of this.clientObservers.values()) {
      observer.onClose();
    };

    debug(`closed: ${this._path}`);
  }

  public deregisterClientObserver(clientId: ClientId): void {
    const deleted = this.clientObservers.delete(clientId);
    if (!deleted) {
      console.error(`Cannot deregister non-registered client observer: ${clientId}`);
    }
  }

  public registerClientObserver(clientId: ClientId, instance: ClientObserver): void {
    this.clientObservers.set(clientId, instance)
  }

  public registerObserver(source: StyleSource, instance: ObserverInstance): void {
    this.observers.set(source, instance);
  }

  public deRegisterObserver(source: StyleSource): void {
    this.observers.delete(source);
  }

  public async requestChanges(
    source: StyleSource,
    changeRequests: NotebookChangeRequest[],
    options?: RequestChangesOptions,
  ): Promise<NotebookChange[]> {
    // Applies the change requests to the notebook,
    // then runs the resulting changes through all of the
    // observers synchronously, until there are no more changes,
    // or we reach a limit.

    this.assertNotClosed('requestChanges');
    options = options || {};
    debug(`requestChanges ${changeRequests.length}`);

    // Make the requested changes to the notebook.
    const changes: NotebookChange[] = [];
    const undoChangeRequests = this.applyRequestedChanges(source, changeRequests, changes);
    const newSyncChanges = this.processChangesSync(changes);
    const allSyncChanges = changes.concat(newSyncChanges);
    this.notifyClientsOfChanges(allSyncChanges, undoChangeRequests, options, false);
    const asyncChanges = await this.processChangesAsync(allSyncChanges);
    this.notifyClientsOfChanges(asyncChanges, undefined, options, true);

    if (this._path) { await this.save(); }

    return allSyncChanges.concat(asyncChanges);
  }

  public async useTool(styleId: StyleId): Promise<NotebookChange[]> {
    debug(`useTool ${styleId}`);
    this.assertNotClosed('useTool');
    const style = this.getStyleById(styleId);
    const source = style.source;
    if (!style) { throw new Error(`Notebook useTool style ID not found: ${styleId}`); }
    const observer = this.observers.get(source);
    const changeRequests = await observer!.useTool(style);
    const changes = await this.requestChanges(source, changeRequests);
    return changes;
  }

  // --- PRIVATE ---

  // Private Class Properties

  private static observerClasses: Map<StyleSource, ObserverClass> = new Map();
  private static persistentNotebooks = new Map<NotebookPath, ServerNotebook>();

  // Private Class Methods

  private static async fromJSON(json: /* TYPESCRIPT: JSON string type? */ string, notebookPath: NotebookPath): Promise<ServerNotebook> {
    const obj = JSON.parse(json);
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
    this.clientObservers = new Map();
    this.observers = new Map();
    this._path = notebookPath;
  }

  // Private Instance Properties

  // TODO: purge changes in queue that have been processed asynchronously.
  private clientObservers: Map<ClientId, ClientObserver>;
  private closed?: boolean;
  private observers: Map<StyleSource, ObserverInstance>;
  private saving?: boolean;

  // Private Instance Property Functions

  private assertNotClosed(action: string): void {
    if (this.closed) { throw new Error(`Attempting ${action} on closed notebook.`); }
  }

  // Private Instance Methods

  private appendChange(
    change: NotebookChange,
    rval: NotebookChange[],
  ): void {
    this.applyChange(change);
    rval.push(change);
  }

  private applyRequestedChanges(
    source: StyleSource,
    changeRequests: NotebookChangeRequest[],
    rval: NotebookChange[],
  ): NotebookChangeRequest[] {
    const undoChangeRequests: NotebookChangeRequest[] = [];
    for (const changeRequest of changeRequests) {

      if (!changeRequest) {
        // REVIEW: Should not get null change requests.
        console.error("WARNING: falsy notebook change request.");
        continue;
      }

      debug(`Change Request from ${source}: `, changeRequest);

      let undoChangeRequest: NotebookChangeRequest|undefined;
      switch(changeRequest.type) {
        case 'changeStyle':
          undoChangeRequest = this.applyStyleChangeRequest(changeRequest, rval);
          break;
        case 'deleteRelationship':
          undoChangeRequest = this.applyRelationshipDeleteRequest(changeRequest, rval);
          break;
        case 'deleteStyle':
          undoChangeRequest = this.applyStyleDeleteRequest(changeRequest, rval);
          break;
        case 'insertRelationship':
          undoChangeRequest = this.applyRelationshipInsertRequest(source, changeRequest, rval);
          break;
        case 'insertStyle':
          undoChangeRequest = this.applyStyleInsertRequest(source, changeRequest, rval);
          break;
        case 'moveStyle':
          undoChangeRequest = this.applyStyleMoveRequest(changeRequest, rval);
          break;
        default:
          throw new Error(`Unexpected change request type ${(<any>changeRequest).type}`);
      }
      if (undoChangeRequest) {
        debug(`Undo change request is: `, undoChangeRequest);
        undoChangeRequests.unshift(undoChangeRequest);
      }

    }
    debug("All undo change requests: ", undoChangeRequests);
    return undoChangeRequests;
  }

  private applyRelationshipDeleteRequest(
    request: RelationshipDeleteRequest,
    rval: NotebookChange[],
  ): RelationshipInsertRequest|undefined {
    if (!this.hasRelationshipId(request.id)) { /* REVIEW/TODO emit warning */ return undefined; }
    const relationship = this.getRelationshipById(request.id);
    const change: RelationshipDeleted = { type: 'relationshipDeleted', relationship, };
    this.appendChange(change, rval);
    const undoChangeRequest: RelationshipInsertRequest = {
      type: 'insertRelationship',
      fromId: relationship.fromId,
      toId: relationship.toId,
      props: { meaning: relationship.meaning },
    }
    return undoChangeRequest;
  }

  private applyRelationshipInsertRequest(
    source: StyleSource,
    request: RelationshipInsertRequest,
    rval: NotebookChange[],
  ): RelationshipDeleteRequest {
    const relationship: RelationshipObject = {
      id: this.nextId++,
      source,
      fromId: request.fromId,
      toId: request.toId,
      ...request.props,
    };
    const change: RelationshipInserted = { type: 'relationshipInserted', relationship };
    this.appendChange(change, rval);
    const undoChangeRequest: RelationshipDeleteRequest = {
      type: 'deleteRelationship',
      id: relationship.id,
    };
    return undoChangeRequest;
  }

  private applyStyleChangeRequest(
    request: StyleChangeRequest,
    rval: NotebookChange[],
  ): StyleChangeRequest {
    const style = this.getStyleById(request.styleId);
    const previousData = style.data;
    style.data = request.data;
    const change: StyleChanged = { type: 'styleChanged', style, previousData };
    this.appendChange(change, rval);
    const undoChangeRequest: StyleChangeRequest = {
      type: 'changeStyle',
      styleId: style.id,
      data: previousData,
    }
    return undoChangeRequest;
  }

  private applyStyleDeleteRequest(
    request: StyleDeleteRequest,
    rval: NotebookChange[],
  ): StyleInsertRequest {
    const style = this.getStyleById(request.styleId);

    // Assemble the undo change request before we delete anything
    // from the notebook.
    // TODO: gather substyles and relationships from the same source, etc.
    const styleProps: StylePropertiesWithSubprops = {
      type: style.type,
      meaning: style.meaning,
      data: style.data,
    };
    const undoChangeRequest: StyleInsertRequest = {
      type: 'insertStyle',
      // TODO: afterId
      // TODO: parentId
      styleProps,
    };

    // Delete substyles recursively
    const substyles = this.childStylesOf(style.id);
    for(const substyle of substyles) {
      const request2: StyleDeleteRequest = { type: 'deleteStyle', styleId: substyle.id };
      this.applyStyleDeleteRequest(request2, rval);
    }

    // // Delete any relationships attached to this style.
    // Note: We actually can't do this automatically.
    // Although deleting a "from" or "to" style in a relationship
    // certainly invalidates that relationship, we may need the
    // relationship to compute how to "repair" or "reroute" the dependency
    // const relationships = this.relationshipsOf(id);
    // for(const relationship of relationships) {
    //   changes.push(this.deleteRelationshipChange(relationship.id));
    // }

    const change: StyleDeleted = { type: 'styleDeleted', style };
    this.appendChange(change, rval);

    return undoChangeRequest;
  }

  private applyStyleInsertRequest(
    source: StyleSource,
    request: StyleInsertRequest,
    rval: NotebookChange[],
  ): StyleDeleteRequest {
    const parentId = request.parentId||0;
    const styleProps = request.styleProps;
    const afterId = request.hasOwnProperty('afterId') ? request.afterId : -1;

    const style: StyleObject = {
      data: styleProps.data,
      id: this.nextId++,
      meaning: styleProps.meaning,
      parentId: parentId || 0,
      source,
      type: styleProps.type,
    };
    const change: StyleInserted =  { type: 'styleInserted', style, afterId };
    this.appendChange(change, rval);

    if (styleProps.subprops) {
      for (const substyleProps of styleProps.subprops) {
        const request2: StyleInsertRequest = { type: 'insertStyle', parentId: style.id, styleProps: substyleProps };
        this.applyStyleInsertRequest(source, request2, rval);
      }
    }

    if (styleProps.relationsFrom) {
      for (const [idStr, props] of Object.entries(styleProps.relationsFrom)) {
        const request2: RelationshipInsertRequest = { type: 'insertRelationship', fromId: parseInt(idStr, 10), toId: style.id, props };
        this.applyRelationshipInsertRequest(source, request2, rval);
      }
    }

    if (styleProps.relationsTo) {
      for (const [idStr, props] of Object.entries(styleProps.relationsTo)) {
        const request2: RelationshipInsertRequest = { type: 'insertRelationship', fromId: style.id, toId: parseInt(idStr, 10), props };
        this.applyRelationshipInsertRequest(source, request2, rval);
      }
    }

    if (styleProps.exclusiveChildTypeAndMeaning) {
        const children = this.findChildStylesOfType(parentId, style.type);

      // console.log("KIDS FOUND OF PARENT",children);
      // now in the set to be removed, remove ourself, and anyting with a different meaning
      const toRemove = children.filter(c => ((c.id != parentId) && (c.id != style.id) && (c.meaning == style.meaning) && (c.type == style.type)));
      // now remove the remainder
      // console.log("TO REMOVE",toRemove);
      for (const childToRemove of toRemove) {
        const request2: StyleDeleteRequest = { type: 'deleteStyle', styleId: childToRemove.id };
        this.applyStyleDeleteRequest(request2, rval);
      }
    }

    const undoChangeRequest: StyleDeleteRequest = {
      type: 'deleteStyle',
      styleId: style.id,
    }
    return undoChangeRequest;
  }

  private applyStyleMoveRequest(
    request: StyleMoveRequest,
    rval: NotebookChange[],
  ): StyleMoveRequest|undefined {
    const { styleId, afterId } = request;
    if (afterId == styleId) { throw new Error(`Style ${styleId} can't be moved after itself.`); }

    const style = this.getStyleById(styleId);
    if (style.parentId) {
      // REVIEW: Why are we attempting to move substyles? Should be:
      // throw new Error(`Attempting to move substyle ${styleId}`);
      return undefined;
    }

    const oldPosition: StylePosition = this.styleOrder.indexOf(style.id);
    if (oldPosition < 0) { throw new Error(`Style ${styleId} can't be moved: not found in styleOrder array.`); }

    let oldAfterId: number;
    if (oldPosition == 0) { oldAfterId = 0; }
    else if (oldPosition == this.styleOrder.length-1) { oldAfterId = -1; }
    else { oldAfterId = this.styleOrder[oldPosition-1]; }

    let newPosition: StylePosition;
    if (afterId == 0) { newPosition = 0; }
    else if (afterId == -1) { newPosition = this.styleOrder.length  - 1; }
    else {
      newPosition = this.styleOrder.indexOf(afterId);
      if (newPosition < 0) { throw new Error(`Style ${styleId} can't be moved: other style ${afterId} not found in styleOrder array.`); }
      if (oldPosition > newPosition) { newPosition++; }
    }

    const change: StyleMoved = { type: 'styleMoved', styleId, afterId, oldPosition, newPosition };
    this.appendChange(change, rval);

    const undoChangeRequest: StyleMoveRequest = {
      type: 'moveStyle',
      styleId: style.id,
      afterId: oldAfterId
    };
    return undoChangeRequest;
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

  private notifyClientsOfChanges(
    changes: NotebookChange[],
    undoChangeRequests: NotebookChangeRequest[]|undefined,
    options: RequestChangesOptions,
    complete: boolean,
  ): void {
    for (const [ clientId, observer ] of this.clientObservers) {
      const isTrackingClient = (clientId == options.clientId);
      let tracker = (options.tracker && isTrackingClient ? options.tracker : undefined);
      observer.onChanges(changes, undoChangeRequests, complete, tracker);
    };
  }

  private async processChangesAsync(changes: NotebookChange[]): Promise<NotebookChange[]> {
    // TODO: run resulting async changes through sync observers.
    // TODO: submit changes to asynchronous observers simultaneously.
    // TODO: timeout on observer processing of changes.
    // TODO: Don't allow multiple asynchronous requestChanges to be operating at the same time.
    let allChanges: NotebookChange[] = [];
    for (let round = 0; changes.length>0 && round<MAX_CHANGE_ROUNDS; round++) {
      debug(`Async round ${round}.`);

      // Pass the changes to each observer to determine if it wants to make
      // additional changes as the result of the previous changes.
      // LATER: Submit to all observers in parallel.
      // IMPORTANT: We don't actually make the changes to the notebook
      // until *after* all observers have submitted their change requests for this round.
      const observerChangeRequests: Map<StyleSource, NotebookChangeRequest[]> = new Map();
      for (const [source, observer] of this.observers) {
        const changeRequests = await observer.onChangesAsync(changes);
        observerChangeRequests.set(source, changeRequests);
      };

      // Apply the changes requested by the observers.
      const newChanges: NotebookChange[] = [];
      for (const [source, changeRequests] of observerChangeRequests) {
        this.applyRequestedChanges(source, changeRequests, newChanges);
      }

      // Get the changes made in this round for the next round of processing.
      changes = newChanges;
      allChanges = allChanges.concat(newChanges);
    }

    if (changes.length>0) {
      // TODO: What do we do? Just drop the changes on the floor?
      console.error(`Dropping async changes due to running out of rounds: ${changes.length}`);
    }

    return allChanges;
  }

  private processChangesSync(changes: NotebookChange[]): NotebookChange[] {
    let allChanges: NotebookChange[] = [];
    for (let round = 0; changes.length>0 && round<MAX_CHANGE_ROUNDS; round++) {
      debug(`Sync round ${round}.`);

      // Pass the changes to each observer synchronously to determine if
      // the observer wants to make additional changes as the result of
      // the previous changes.
      // IMPORTANT: We don't actually make the changes to the notebook
      // until *after* all observers have submitted their change requests for this round.
      const observerChangeRequests: Map<StyleSource, NotebookChangeRequest[]> = new Map();
      for (const [source, observer] of this.observers) {
        const changeRequests = observer.onChangesSync(changes);
        observerChangeRequests.set(source, changeRequests);
      };

      // Apply the changes requested by the observers.
      const newChanges: NotebookChange[] = [];
      for (const [source, changeRequests] of observerChangeRequests) {
        this.applyRequestedChanges(source, changeRequests, newChanges);
      }

      // Get the changes made in this round for the next round of processing.
      changes = newChanges;
      allChanges = allChanges.concat(newChanges);
    }

    if (changes.length>0) {
      // TODO: What do we do? Just drop the changes on the floor?
      console.error(`Dropping sync changes due to running out of rounds: ${changes.length}`);
    }

    return allChanges;
  }

  // Do not call this directly.
  // Changes to the document should result in calls to notifyChange,
  // which will schedule a save, eventually getting here.
  private async save(): Promise<void> {
    if (!this._path) { throw new Error("Cannot save non-persistent notebook."); }
    // TODO: Handle this in a more robust way.
    if (this.saving) { throw new Error(`Trying to save while save already in progress.`); }
    debug(`saving ${this._path}`);
    this.saving = true;
    const json = JSON.stringify(this);
    await writeNotebookFile(this._path, json);
    this.saving = false;
  }
}
