/*
Math Tablet
Copyright (C) 2019-21 Public Invention
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

// REVIEW: Where should we be checking if this.terminated is set?
// REVIEW: Have a "read-only" notebook that only lets you read but not make any changes?
//         This would enforce all changes being made through the observer interfaces
//         rather than directly on the notebook.

// Requirements

import * as debug1 from "debug";
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// import { readdirSync, unlink, writeFileSync } from "fs"; // LATER: Eliminate synchronous file operations.

import { CellObject, CellSource, CellId, CellPosition, CellType, CellIndex } from "./shared/cell";
import { assert, assertFalse, CssLength, deepCopy, ExpectedError, Html, notImplementedError, Timestamp, cssSizeInPixels, CssLengthUnit, cssLengthInPixels } from "./shared/common";
import { NotebookPath, NOTEBOOK_PATH_RE, NotebookName, FolderPath, NotebookEntry, Folder } from "./shared/folder";
import { NotebookObject, NotebookWatcher, PageMargins } from "./shared/notebook";
import {
  NotebookChangeRequest, MoveCell, InsertEmptyCell, DeleteCell, InsertStroke, DeleteStroke,
  ChangeNotebook, UseTool, RequestId, NotebookRequest, OpenNotebook, CloseNotebook, ResizeCell,
} from "./shared/client-requests";
import {
  NotebookUpdated, NotebookOpened, NotebookUpdate, CellInserted, CellDeleted, StrokeInserted, CellResized, CellMoved, StrokeDeleted, NotebookCollaboratorConnected, NotebookCollaboratorDisconnected,
} from "./shared/server-responses";
import { notebookChangeRequestSynopsis } from "./shared/debug-synopsis";
import { strokePathId } from "./shared/stylus";
import { OpenOptions, WatchedResource } from "./shared/watched-resource";
import { UserPermission } from "./shared/permissions";

import { ServerSocket } from "./server-socket";
import { createDirectory, deleteDirectory, FileName, readJsonFile, renameDirectory, writeJsonFile } from "./adapters/file-system";
import { Permissions } from "./permissions";
import { CollaboratorObject } from "./shared/user";
import { existingCell, newCell } from "./server-cell/instantiator";
import { ServerCell } from "./server-cell";

export interface FindCellOptions {
  source?: CellSource;
  notSource?: CellSource;
}

export interface OpenNotebookOptions extends OpenOptions<ServerNotebookWatcher> {
  ephemeral?: boolean;    // true iff notebook not persisted to the file system and disappears after last close.
}

interface RequestChangesOptions {
  originatingSocket?: ServerSocket,
  requestId?: RequestId,
}

export interface ServerNotebookWatcher extends NotebookWatcher {
  onChanged(msg: NotebookUpdated): void;
}

interface ServerNotebookObject extends NotebookObject {
  formatVersion: string;
  nextId: CellId;
}

// Constants

const LETTER_PAGE_SIZE = cssSizeInPixels(8.5, 11, 'in');
const DEFAULT_LETTER_MARGINS = marginsInPixels(1,1,1,1, 'in');


const FORMAT_VERSION = "0.0.20";

const EMPTY_NOTEBOOK_OBJ: ServerNotebookObject = {
  nextId: 1,
  cells: [],
  margins: DEFAULT_LETTER_MARGINS,
  pageSize: LETTER_PAGE_SIZE,
  formatVersion: FORMAT_VERSION,
  pagination: [],
}

const NOTEBOOK_FILENAME = <FileName>'notebook.json';

// Exported Class

export class ServerNotebook extends WatchedResource<NotebookPath, ServerNotebookWatcher> {

  // Public Class Constants

  public static NOTEBOOK_DIR_SUFFIX = '.enb';

  // Public Class Properties

  // Public Class Property Functions

  public static isValidNotebookPath(path: NotebookPath): boolean {
    return NOTEBOOK_PATH_RE.test(path);
  }

  public static nameFromPath(path: NotebookPath): NotebookName {
    const match = NOTEBOOK_PATH_RE.exec(path);
    if (!match) { throw new Error(`Invalid notebook path: ${path}`); }
    return <NotebookName>match[3];
  }

  public static validateNotebookName(name: NotebookName): void {
    if (!Folder.isValidNotebookName(name)) { throw new Error(`Invalid notebook name: ${name}`); }
  }

  // Public Class Property Functions

  public static get allInstances(): ServerNotebook[]/* LATER: IterableIterator<ServerNotebook> */ {
    // LATER: ServerNotebook.instanceMap should only have notebooks, not notebooks and folders.
    return <ServerNotebook[]>Array.from(this.instanceMap.values()).filter(r=>r instanceof ServerNotebook);
  }

  // Public Class Methods

  public static async delete(path: NotebookPath): Promise<void> {
    // REVIEW: Race conditions?
    this.close(path, "Notebook has been deleted."); // no-op if the notebook is not open.
    deleteDirectory(path, true);
  }

  public static async move(oldPath: NotebookPath, newPath: NotebookPath): Promise<NotebookEntry> {
    // TODO: If notebook is open?

    // Called by the containing ServerFolder when one of its notebooks is renamed.

    this.close(oldPath, `Notebook is moving to ${newPath}.`)

    // REVIEW: If there is an existing *file* (not directory) at the new path then it will be overwritten silently.
    //         However, we don't expect random files to be floating around out notebook storage filesystem.
    await renameDirectory(oldPath, newPath);
    return { path: newPath, name: this.nameFromPath(newPath) }
  }

  public static open(path: NotebookPath, options: OpenNotebookOptions): Promise<ServerNotebook> {
    // IMPORTANT: This is a standard open pattern that all WatchedResource-derived classes should use.
    //            Do not modify unless you know what you are doing!
    const isOpen = this.isOpen(path);
    const instance = isOpen ? this.getInstance(path) : new this(path, options);
    instance.open(options, isOpen);
    return instance.openPromise;
  }

  public static openEphemeral(): Promise<ServerNotebook> {
    // For units testing, etc., to create a notebook that is not persisted to the filesystem.
    return this.open(this.generateUniqueEphemeralPath(), { ephemeral: true, mustNotExist: true });
  }

  // Public Class Event Handlers

  public static async onClientRequest(socket: ServerSocket, msg: NotebookRequest): Promise<void> {
    // Called by ServerSocket when a client sends a notebook request.
    let instance = </* TYPESCRIPT: shouldn't have to cast. */ServerNotebook>this.instanceMap.get(msg.path);
    if (!instance && msg.operation == 'open') {
      instance = await this.open(msg.path, { mustExist: true });
    }
    assert(instance);
    await instance.onClientRequest(socket, msg);
  }

  public static onSocketClosed(socket: ServerSocket): void {
    // Note: If the server has a large number of notebook instances, then
    //       we may want to create a map from sockets to lists of notebook instances
    //       so we can handle this more efficiently.
    for (const instance of this.allInstances) {
      if (instance.sockets.has(socket)) {
        instance.onSocketClosed(socket);
      }
    }
  }

  public static onSocketUserLogin(socket: ServerSocket): void {
    // Note: see note for onSocketClosed.
    for (const instance of this.allInstances) {
      if (instance.sockets.has(socket)) {
        instance.onSocketUserLogin(socket);
      }
    }
  }

  public static onSocketUserLogout(socket: ServerSocket): void {
    // Note: see note for onSocketClosed.
    for (const instance of this.allInstances) {
      if (instance.sockets.has(socket)) {
        instance.onSocketUserLogout(socket);
      }
    }
  }

  // Public Instance Properties

  public obj: ServerNotebookObject;

  // Public Instance Property Functions

  public toHtml(): Html {
    if (this.isEmpty()) { return <Html>"<i>Notebook is empty.</i>"; }
    else {
      return <Html>this.cells.map(cell=>cell.toHtml()).join('\n');
    }
  }

  // Public Instance Property Functions

  public allCells(): ServerCell<CellObject>[] {
    return this.cells;
  }

  public get leftMargin(): CssLength {
    return this.obj.margins.left;
  }

  public get topMargin(): CssLength {
    return this.obj.margins.top;
  }

  // Public Instance Methods

  public nextId(): CellId {
    return this.obj.nextId++;
  }

  public async requestChanges(
    source: CellSource,
    changeRequests: NotebookChangeRequest[],
    options: RequestChangesOptions,
  ): Promise<void> {
    assert(!this.terminated);
    debug(`${source} change requests: ${changeRequests.length}`);

    // Make the requested changes to the notebook.
    const updates: NotebookUpdate[] = [];
    const undoChangeRequests: NotebookChangeRequest[] = [];
    for (const changeRequest of changeRequests) {
      assert(changeRequest);
      debug(`${source} change request: ${notebookChangeRequestSynopsis(changeRequest)}`);
      switch(changeRequest.type) {
        case 'deleteCell':   await this.applyDeleteCellRequest(source, changeRequest, updates, undoChangeRequests); break;
        case 'deleteStroke': await this.applyDeleteStrokeRequest(source, changeRequest, updates, undoChangeRequests); break;
        case 'insertEmptyCell':   await this.applyInsertEmptyCellRequest(source, changeRequest, updates, undoChangeRequests); break;
        case 'insertStroke': await this.applyInsertStrokeRequest(source, changeRequest, updates, undoChangeRequests); break;
        case 'moveCell':     await this.applyMoveCellRequest(source, changeRequest, updates, undoChangeRequests); break;
        case 'resizeCell':   await this.applyResizeCellRequest(source, changeRequest, updates, undoChangeRequests); break;
        default: assertFalse();
      }
    }

    const update: NotebookUpdated = {
      type: 'notebook',
      path: this.path,
      operation: 'updated',
      updates,
      undoChangeRequests, // LATER: Only send undo information to client that requested the change.
      complete: true,
    }
    for (const socket of this.sockets) {
      if (socket === options.originatingSocket) {
        socket.sendMessage({ requestId: options.requestId, ...update });
      } else {
        socket.sendMessage(update);
      }
    }

    // REVIEW: If other batches of changes are being processed at the same time?
    // TODO: Set/restart a timer for the save so we save only once when the document reaches a quiescent state.
    await this.save();
  }

  public reserveId(): CellId {
    const cellId = this.obj.nextId++;
    this.reservedIds.add(cellId);
    return cellId;
  }

  // Public Event Handlers

  // --- PRIVATE ---

  // Private Class Properties

  private static lastEphemeralPathTimestamp: Timestamp = 0;

  // Private Class Property Functions

  protected static getInstance(path: NotebookPath): ServerNotebook {
    return <ServerNotebook>super.getInstance(path);
  }

  private isEmpty(): boolean {
    return this.cells.length == 0;
  }

  // Private Class Methods

  private static generateUniqueEphemeralPath(): NotebookPath {
    let timestamp = <Timestamp>Date.now();
    if (timestamp <= this.lastEphemeralPathTimestamp) {
      timestamp = this.lastEphemeralPathTimestamp+1;
    }
    this.lastEphemeralPathTimestamp = timestamp;
    return  <NotebookPath>`/eph${timestamp}${this.NOTEBOOK_DIR_SUFFIX}`;
  }

  public static validateObject(obj: ServerNotebookObject): void {
    // Throws an exception with a descriptive message if the object is not a valid notebook object.
    // LATER: More thorough validation of the object.
    if (!obj.nextId) { throw new Error("Invalid notebook object JSON."); }
    if (obj.formatVersion != FORMAT_VERSION) {
      throw new ExpectedError(`Invalid notebook version ${obj.formatVersion}. Expect version ${FORMAT_VERSION}`);
    }
  }

  // Private Class Event Handlers

  // Private Constructor

  private constructor(path: NotebookPath, options: OpenNotebookOptions) {
    super(path);
    this.obj = deepCopy(EMPTY_NOTEBOOK_OBJ);
    this.cellMap = new Map();
    this.cells = [];
    this.ephemeral = options.ephemeral;
    this.reservedIds = new Set();
    this.sockets = new Set<ServerSocket>();
  }

  // Private Instance Properties

  // TODO: purge changes in queue that have been processed asynchronously.
  private cellMap: Map<CellId, ServerCell<CellObject>>;
  private cells: ServerCell<CellObject>[];
  private ephemeral?: boolean;     // Not persisted to the filesystem.
  private permissions!: Permissions;
  private reservedIds: Set<CellId>;
  private saving?: boolean;
  private sockets: Set<ServerSocket>;

  // Private Instance Property Functions

  private cellIndex(cellId: CellId): CellIndex {
    const rval = this.cells.findIndex(cell=>cell.id===cellId);
    assert(rval>=0);
    return rval;
  }

  private clientObject(): NotebookObject {
    const rval: NotebookObject = {
      margins: this.obj.margins,
      pageSize: this.obj.pageSize,
      pagination: this.obj.pagination,
      cells: this.cells.map(cell=>cell.clientObject()),
    };
    return rval;
  }

  private getCell<T extends CellObject>(id: CellId): ServerCell<T> {
    const rval = <ServerCell<T>>this.cellMap.get(id);
    assert(rval, `Cell ${id} doesn't exist.`);
    return rval;
  }

  // Private Instance Methods

  private async applyDeleteCellRequest(
    _source: CellSource,
    request: DeleteCell,
    updates: NotebookUpdate[],
    _undoChangeRequests: NotebookChangeRequest[],
  ): Promise<void> {

    // Remove cell from the page and from the map.
    const cellId = request.cellId;
    assert(this.cellMap.has(cellId));
    // const cell = this.getCell<T>(cellId);
    const cellIndex = this.cellIndex(cellId);
    assert(cellIndex>=0);
    // const afterId = cellIndex === 0 ? CellPosition.Top : this.cells[cellIndex-1].id;
    this.cells.splice(cellIndex, 1);
    this.cellMap.delete(cellId);

    // TODO: Repaginate.

    const update: CellDeleted = { type: 'cellDeleted', cellId };
    updates.push(update);

    // TODO:
    // const undoChangeRequest: InsertCell = {
    //   type: 'insertCell',
    //   afterId,
    //   cell.object(),
    // };
    // undoChangeRequests.unshift(undoChangeRequest);
  }

  private async applyDeleteStrokeRequest(
    _source: CellSource,
    request: DeleteStroke,
    updates: NotebookUpdate[],
    undoChangeRequests: NotebookChangeRequest[],
  ): Promise<void> {
    const { cellId, strokeId } = request;
    const cell = this.getCell(cellId);
    const stroke = cell.deleteStroke(strokeId);

    // TODO: Update the displaySvg field

    // Construct the response
    const pathId = strokePathId(cellId, strokeId);
    const update: StrokeDeleted = {
      type: 'strokeDeleted',
      cellId,
      displayUpdate: { delete: [ pathId ]},
      strokeId,
    };
    updates.push(update);
    const undoChangeRequest: InsertStroke = {
      type: 'insertStroke',
      cellId,
      stroke,
    }
    undoChangeRequests.unshift(undoChangeRequest);
  }

  private async applyInsertEmptyCellRequest(
    source: CellSource,
    request: InsertEmptyCell,
    updates: NotebookUpdate[],
    undoChangeRequests: NotebookChangeRequest[],
  ): Promise<void> {
    const cell = newCell(this, request.cellType, source);

    let cellIndex: number;
    // Insert top-level styles in the style order.
    const afterId = request.afterId;
    if (!afterId || afterId===CellPosition.Top) {
      cellIndex = 0;
    } else if (afterId===CellPosition.Bottom) {
      cellIndex = this.cells.length;
    } else {
      cellIndex = this.cellIndex(afterId);
      cellIndex++;
    }
    this.cells.splice(cellIndex, 0, cell);
    this.cellMap.set(cell.id, cell);
    // TODO: repaginate

    const update: CellInserted = {
      type: 'cellInserted',
      cellObject: cell.clientObject(),
      cellIndex
    };
    updates.push(update);

    const undoChangeRequest: DeleteCell = { type: 'deleteCell', cellId: cell.id };
    undoChangeRequests.unshift(undoChangeRequest);
  }

  private async applyInsertStrokeRequest(
    _source: CellSource,
    request: InsertStroke,
    updates: NotebookUpdate[],
    undoChangeRequests: NotebookChangeRequest[],
  ): Promise<void> {
    const { cellId, stroke } = request;
    const cell = this.getCell(request.cellId);
    const displayUpdate = cell.insertStroke(stroke);

    // Construct the response
    const update: StrokeInserted = {
      type: 'strokeInserted',
      cellId: cell.id,
      displayUpdate,
      stroke: request.stroke,
    };
    updates.push(update);
    const undoChangeRequest: DeleteStroke = { type: 'deleteStroke', cellId, strokeId: stroke.id };
    undoChangeRequests.unshift(undoChangeRequest);
  }

  private async applyMoveCellRequest(
    _source: CellSource,
    request: MoveCell,
    updates: NotebookUpdate[],
    undoChangeRequests: NotebookChangeRequest[],
  ): Promise<void> {
    const { cellId, afterId } = request;
    if (afterId == cellId) { throw new Error(`Style ${cellId} can't be moved after itself.`); }

    const cellObj = this.getCell(cellId);

    let oldAfterId: number;
    const oldIndex: CellPosition = this.cellIndex(cellId);
    if (oldIndex == 0) { oldAfterId = 0; }
    else if (oldIndex == this.cells.length-1) { oldAfterId = -1; }
    else { oldAfterId = this.cells[oldIndex-1].id; }

    let newIndex: CellPosition;
    if (afterId == 0) { newIndex = 0; }
    else if (afterId == -1) { newIndex = this.cells.length  - 1; }
    else {
      newIndex = this.cellIndex(afterId);
      if (oldIndex > newIndex) { newIndex++; }
    }

    this.cells.splice(oldIndex, 1);
    this.cells.splice(newIndex, 0, cellObj);

    const update: CellMoved = { type: 'cellMoved', cellId, newIndex };
    updates.push(update);

    const undoChangeRequest: MoveCell = { type: 'moveCell', cellId, afterId: oldAfterId };
    undoChangeRequests.unshift(undoChangeRequest);
  }

  private async applyResizeCellRequest(
    _source: CellSource,
    request: ResizeCell,
    updates: NotebookUpdate[],
    undoChangeRequests: NotebookChangeRequest[],
  ): Promise<void> {
    const { cellId, cssSize } = request;
    assert(cssSize.height.endsWith('pt'));
    assert(cssSize.width.endsWith('pt'));
    const cell = this.getCell(cellId);
    const oldCssSize = deepCopy(cell.cssSize);

    cell.setCssSize(cssSize);

    const update: CellResized = { type: 'cellResized', cellId, cssSize };
    updates.push(update);

    const undoChangeRequest: ResizeCell = { type: 'resizeCell', cellId, cssSize: oldCssSize };
    undoChangeRequests.unshift(undoChangeRequest);
  }

  protected async initialize(options: OpenNotebookOptions): Promise<void> {
    if (options.mustExist) {
      assert(ServerNotebook.isValidNotebookPath(this.path));
      // REVIEW: Create file-system readJsonFile function?
      const obj = await readJsonFile<ServerNotebookObject>(this.path, NOTEBOOK_FILENAME);
      assert(typeof obj == 'object');
      ServerNotebook.validateObject(obj);
      this.obj = obj; // REVIEW: Deep copy?
      this.cells = obj.cells.map(cellObject=>existingCell(this, cellObject));
      for (const cell of this.cells) {
        this.cellMap.set(cell.id, cell);
      }
      obj.cells = [];
    } else if (options.mustNotExist) {
      await this.saveNew();

      // TODO: This is a temporary workaround for the fact that you can't insert a cell if there
      //       are no cells in the notebook.
      await this.requestChanges('USER', [
        { type: 'insertEmptyCell', cellType: CellType.Text, afterId: CellPosition.Top },
        { type: 'insertEmptyCell', cellType: CellType.Formula, afterId: CellPosition.Bottom },
        { type: 'insertEmptyCell', cellType: CellType.Formula, afterId: CellPosition.Bottom },
        { type: 'insertEmptyCell', cellType: CellType.Formula, afterId: CellPosition.Bottom },
      ], {});

    } else {
      // LATER: Neither mustExist or mustNotExist specified. Open if it exists, or create if it doesn't exist.
      //        Currently this is an illegal option configuration.
      notImplementedError("ServerNoteboook Neither mustExist or mustNotExist specified");
    }
    this.permissions = await Permissions.load(this.path);
  }

  private removeSocket(socket: ServerSocket): void {
    const hadSocket = this.sockets.delete(socket);
    assert(hadSocket);
    if (this.sockets.size == 0) {
      // TODO: purge this folder immediately or set a timer to purge it in the near future.
      console.warn(`Last socket removed from notebook: "${this.path}"`)
    }
  }

  private async save(): Promise<void> {
    // LATER: A new save can be requested before the previous save completes,
    //        so wait until the previous save completes before attempting to save.
    assert(!this.saving);
    this.saving = true;

    // "Ephemeral" notebooks are not persisted in the filesystem.
    if (this.ephemeral) { return; }

    assert(ServerNotebook.isValidNotebookPath(this.path));
    debug(`saving ${this.path}`);

    this.obj.cells = this.cells.map(cell=>cell.persistentObject());
    await writeJsonFile(this.path, NOTEBOOK_FILENAME, this.obj);
    this.obj.cells = [];
    this.saving = false;
  }

  private sendCollaboratorConnectedMessage(socket: ServerSocket): void {
    const user = socket.user;
    if (!user) { return; }
    const collaboratorObj: CollaboratorObject = {
      clientId: socket.clientId,
      userId: user.id,
      userName: user?.userName,
    };
    const response2: NotebookCollaboratorConnected = {
      type: 'notebook',
      operation: 'collaboratorConnected',
      path: this.path,
      obj: collaboratorObj,
    };
    for (const otherSocket of this.sockets) {
      if (otherSocket === socket || !otherSocket.user) { continue; }
      otherSocket.sendMessage(response2);
    }
  }

  private sendCollaboratorDisconnectedMessage(socket: ServerSocket): void {
    const user = socket.user;
    if (!user) { return; }
    const response2: NotebookCollaboratorDisconnected = {
      type: 'notebook',
      operation: 'collaboratorDisconnected',
      path: this.path,
      clientId: socket.clientId,
    };
    for (const otherSocket of this.sockets) {
      if (otherSocket === socket || !otherSocket.user) { continue; }
      otherSocket.sendMessage(response2);
    }
  }

  protected terminate(reason: string): void {
    // REVIEW: Notify watchers?
    super.terminate(reason);
  }

  private async saveNew(): Promise<void> {
    // "Ephemeral" notebooks are not persisted in the filesystem.
    if (this.ephemeral) { return; }
    assert(!this.saving);

    // Create the directory if it does not exists.
    // LATER: Don't attempt to create the directory every time we save. Only the first time.
    this.saving = true;
    try {
      await createDirectory(this.path);
    } catch(err) {
      if (err.code == 'EEXIST') {
        err = new ExpectedError(`Notebook '${this.path}' already exists.`);
      }
      throw err;
    } finally {
      this.saving = false;
    }

    await this.save();
  }

  // Private Event Handlers

  private async onClientRequest(socket: ServerSocket, msg: NotebookRequest): Promise<void> {
    assert(!this.terminated);
    switch(msg.operation) {
      case 'change': await this.onChangeRequest(socket, msg); break;
      case 'close':  this.onCloseRequest(socket, msg); break;
      case 'open':  this.onOpenRequest(socket, msg); break;
      case 'useTool': this.onUseToolRequest(socket, msg); break;
      default: assert(false); break;
    }
  }

  private onSocketClosed(socket: ServerSocket): void {
    this.removeSocket(socket);
    this.sendCollaboratorDisconnectedMessage(socket);
  }

  private onSocketUserLogin(socket: ServerSocket): void {
    this.sendCollaboratorConnectedMessage(socket);
  }

  private onSocketUserLogout(socket: ServerSocket): void {
    console.log("SERVER NOTEBOOK ON SOCKET USER LOGOUT");
    this.sendCollaboratorDisconnectedMessage(socket);
  }

  // Client Message Event Handlers

  private async onChangeRequest(socket: ServerSocket, msg: ChangeNotebook): Promise<void> {

    // Verify the user has permission to modify the notebook.
    const user = socket.user;
    const permissions = this.permissions.getUserPermissions(user);
    if (!(permissions & UserPermission.Modify)) {
      const message = user ?
                      `You do not have permission to modify this notebook.` :
                      `You must be logged in to modify this notebook.`;
      throw new ExpectedError(message)
    }

    const options: RequestChangesOptions = { originatingSocket: socket, requestId: msg.requestId };
    await this.requestChanges('USER', msg.changeRequests, options);
  }

  private onCloseRequest(socket: ServerSocket, _msg: CloseNotebook): void {
    // NOTE: No response is expected for a close request.
    assert(this.sockets.has(socket));
    this.removeSocket(socket);
    this.sendCollaboratorDisconnectedMessage(socket);
  }

  private onOpenRequest(socket: ServerSocket, msg: OpenNotebook): void {

    // Check if the user has permission to open this notebook.
    const user = socket.user;
    const permissions = this.permissions.getUserPermissions(user);
    if (!(permissions & UserPermission.Read)) {
      const message = user ?
                      `This notebook is not public and is not shared with you.` :
                      `You must be logged in to access this notebook.`;
      throw new ExpectedError(message)
    }

    this.sockets.add(socket);

    // Send NotebookOpened message back to the requesting client.
    const collaborators: CollaboratorObject[] = [];
    for (const otherSocket of this.sockets) {
      if (otherSocket == socket || !otherSocket.user) { continue; }
      const collaboratorObject: CollaboratorObject = {
        clientId: otherSocket.clientId,
        userId: otherSocket.user.id,
        userName: otherSocket.user.userName,
      };
      collaborators.push(collaboratorObject);
    }
    const response: NotebookOpened = {
      requestId: msg.requestId,
      type: 'notebook',
      operation: 'opened',
      path: this.path,
      collaborators,
      permissions,
      obj: this.clientObject(),
      complete: true
    };
    socket.sendMessage(response);

    this.sendCollaboratorConnectedMessage(socket);
  }

  private onUseToolRequest(_socket: ServerSocket, _msg: UseTool): void {
    // debug(`useTool ${cellId}`);
    notImplementedError("ServerNotebook onUseToolRequest");
    // const style = this.getStyle(cellId);
    // const source = style.source;
    // if (!style) { throw new Error(`Notebook useTool style ID not found: ${cellId}`); }
    // const observer = this.observers.get(source);
    // const changeRequests = await observer!.useTool(style);
    // const changes = await this.requestChanges(source, changeRequests);
    // return changes;
  }

  // NOT USED

//   public async exportLatex(): Promise<TexExpression> {
//     const ourPreamble = <TexExpression>`\\documentclass[12pt]{article}
// \\usepackage{amsmath}
// \\usepackage{amssymb}
// \\usepackage[normalem]{ulem}
// \\usepackage{graphicx}
// \\usepackage{epstopdf}
// \\epstopdfDeclareGraphicsRule{.gif}{png}{.png}{convert gif:#1 png:\\OutputFile}
// \\AppendGraphicsExtensions{.gif}
// \\begin{document}
// \\title{Magic Math Table}
// \\author{me}
// \\maketitle
// `;
//     const close = <TexExpression>`\\end{document}`;

//     // Our basic approach is to apply a function to each
//     // top level style in order. This function will preferentially
//     // take the LaTeX if there is any.
//     function displayFormula(f : string) : string {
//       return `\\begin{align}\n ${f} \\end{align}\n`;
//     }
//     const tlso = this.topLevelStyleOrder();
//     const cells = [];
//     debug("TOP LEVEL",tlso);
//     for(const tls of tlso) {
//       var retLaTeX = "";
//       // REVIEW: Does this search need to be recursive?
//       const latex = this.findStyles({ type: 'TEX-EXPRESSION' }, tls);
//       if (latex.length > 1) { // here we have to have some disambiguation
//         retLaTeX += "ambiguous: " +displayFormula(latex[0].data);
//       } else if (latex.length == 1) {  // here it is obvious, maybe...
//         retLaTeX += displayFormula(latex[0].data);
//       }


//       // REVIEW: Does this search need to be recursive?
//       const image = this.findStyles({ type: 'IMAGE-URL', role: 'PLOT' }, tls);
//       if (image.length > 0) {
//         const plot = image[0];
//         const apath = this.absoluteDirectoryPath();
//         // The notebook name is both a part of the plot.data,
//         // AND is a part of the absolute path. So we take only
//         // the final file name of local.data here.
//         const final = plot.data.split("/");
//         const graphics = `\\includegraphics{${apath}/${final[2]}}`;
//         retLaTeX += graphics;
//         retLaTeX += `\n`;
//         if (image.length > 1) {
//           retLaTeX += " more than one plot, not sure how to handle that";
//         }
//       }

      // TODO: Handle embedded PNGS & SVGs.
      //       We started putting SVGs of plots, etc. inline
      //       so the code here that reads the SVG files needs to be updated.
      // Now we search for .PNGs --- most likely generated from
      // .svgs, but not necessarily, which allows the possibility
      // of photographs being included in output later.
      // REVIEW: Does this search need to be recursive?
      // const svgs = this.findStyles({ type: 'SVG-MARKUP', recursive: true }, tls);
      // debug("SVGS:",svgs);
      // debug("tlso:",styleObject);
      // for(const s of svgs) {
      //   // NOTE: At present, this is using a BUFFER, which is volatile.
      //   // It does not correctly survive resets of the notebook.
      //   // In fact when we output the file to a file, we need to change
      //   // the notebook do have a durable 'PNG-FILE' type generated from
      //   // the buffer. This may seem awkward, but it keeps the
      //   // function "ruleConvertSvgToPng" completely pure and static,
      //   // which is a paradigm worth preserving. However, this means
      //   // we have to handle the data being null until we have consistent
      //   // file handling.
      //   if (s.data) {
      //     const b: Buffer = await apiFunctionWrapper(s.data);
      //     const ts = Date.now();
      //     console.log(tls);
      //     console.log(ts);
      //     const filename = `image-${s.id}-${ts}.png`;
      //     console.log("filename",filename);
      //     const apath = this.absoluteDirectoryPath();
      //     var abs_filename = `${apath}/${filename}`;
      //     const directory = apath;

      //     var foundfile = "";
      //     debug("BEGIN", directory);
      //     var files = readdirSync(directory);
      //     debug("files", files);
      //     // TODO: We removed timestamp from the style, so we need to make whatever changes are necessary here.
      //     // for (const file of files) {
      //     //   // I don't know why this is needed!
      //     //   if (fileIsLaterVersionThan(s.id, s.timestamp, file)) {
      //     //     foundfile = file;
      //     //   }
      //     // }
      //     debug("END");
      //     if (foundfile) {
      //       abs_filename = `${apath}/${foundfile}`;
      //     } else {
      //       writeFileSync(abs_filename, b);
      //       debug("directory",directory);
      //       var files = readdirSync(directory);

      //       for (const file of files) {
      //         debug("file",file);
      //         // I don't know why this is needed!
      //         if (fileIsEarlierVersionThan(s.id,ts,file)) {
      //           unlink(join(directory, file), err  => {
      //             if (err) throw err;
      //           });
      //         }
      //       }
      //     }
      //     const graphics = `\\includegraphics{${abs_filename}}`;
      //     retLaTeX += graphics;
      //   }
      // }
    //   cells.push(retLaTeX);
    // }

  //   const finalTeX = <TexExpression>(ourPreamble + cells.join('\n') + close);
  //   debug("finalTeX", finalTeX);
  //   return finalTeX;
  // }


  // public getCellThatMayNotExist(id: CellId): CellObject|undefined {
  //   // TODO: Eliminate. Change usages to .findStyle.
  //   return this.cellMap.get(id);
  // }

  // public precedingCellId(_id: CellId): CellId {
  //   notImplementedError();
  //   // // Returns the id of the style immediately before the top-level style specified.
  //   // // TODO: On different pages.
  //   // const i = this.pages[0].cellIds.indexOf(id);
  //   // assert(i>=0);
  //   // if (i<1) { return 0; }
  //   // return this.pages[0].cellIds[i-1];
  // }

  // public findCell(options: FindCellOptions): CellObject|undefined {
  //   // REVIEW: If we don't need to throw on multiple matches, then we can terminate the search
  //   //         after we find the first match.
  //   // Like findStyles but expects to find zero or one matching style.
  //   // If it finds more than one matching style then it returns the first and outputs a warning.
  //   const styles = this.findCells(options);
  //   if (styles.length > 0) {
  //     if (styles.length > 1) {
  //       // TODO: On the server, this should use the logging system rather than console output.
  //       console.warn(`More than one style found for ${JSON.stringify(options)}`);
  //     }
  //     return styles[0];
  //   } else {
  //     return undefined;
  //   }
  // }

  // public findCells(
  //   options: FindCellOptions,
  //   rval: CellObject[] = []
  // ): CellObject[] {
  //   // Option to throw if style not found.
  //   const cellObjects = this.topLevelCells();
  //   // REVIEW: Use filter with predicate instead of explicit loop.
  //   for (const cellObject of cellObjects) {
  //     if (cellMatchesPattern(cellObject, options)) { rval.push(cellObject); }
  //   }
  //   return rval;
  // }

  // public hasCellId(cellId: CellId): boolean {
  //   return this.cellMap.has(cellId);
  // }

  // public hasCell(
  //   options: FindCellOptions,
  // ): boolean {
  //   // Returns true iff findStyles with the same parameters would return a non-empty list.
  //   // OPTIMIZATION: Return true when we find the first matching style.
  //   // NOTE: We don't use 'findStyle' because that throws on multiple matches.
  //   const styles = this.findCells(options);
  //   return styles.length>0;
  // }

}

// Exported Functions

export function notebookPath(path: FolderPath, name: NotebookName): NotebookPath {
  return <NotebookPath>`${path}${name}${ServerNotebook.NOTEBOOK_DIR_SUFFIX}`;
}

// Helper Functions

export function marginsInPixels(top: number, right: number, bottom: number, left: number, unit: CssLengthUnit = 'px'): PageMargins {
  return {
    top: cssLengthInPixels(top, unit),
    right: cssLengthInPixels(right, unit),
    bottom: cssLengthInPixels(bottom, unit),
    left: cssLengthInPixels(left, unit),
  };
}

// function cellMatchesPattern(cell: CellObject, options: FindCellOptions): boolean {
//   return    (!options.source || cell.source == options.source)
//          && (!options.notSource || cell.source != options.notSource);
// }

// function emptyStrokeData(height: number, width: number): StrokeData {
//   return {
//     size: { height: <CssLength>`${height*72}pt`, width: <CssLength>`${width*72}pt` },
//     strokeGroups: [ { strokes: [] }, ]
//   };
// }

// function apiFunctionWrapper(data: string) : Promise<Buffer> {
//   // from : https://stackoverflow.com/questions/5010288/how-to-make-a-function-wait-until-a-callback-has-been-called-using-node-js
//   // myFunction wraps the above API call into a Promise
//   // and handles the callbacks with resolve and reject
//   // @ts-ignore
//   return new Promise((resolve, reject) => {
//     // @ts-ignore
//     svg2img(data,function(error, buffer) {
//       resolve(buffer);
//     });
//   });
// };

// function getTimeStampOfCompatibleFileName(id: number, name: string) : number|undefined{
//   const parts = name.split('-');
//   if (parts.length < 3) return;
//   if (parseInt(parts[1]) != id) return;
//   const third = parts[2];
//   const nametsAndExtension = third.split('.');
//   if (nametsAndExtension.length < 2) return;
//   return parseInt(nametsAndExtension[0]);
// }

// function fileIsEarlierVersionThan(id: number, ts: number|undefined, name: string) : boolean {
//   if (!ts) return false;
//   const filets = getTimeStampOfCompatibleFileName(id, name);
//   return !!filets && ts>filets;
// }

// function fileIsLaterVersionThan(id:number, ts: number|undefined, name: string) : boolean {
//   if (!ts) return false;
//   const filets = getTimeStampOfCompatibleFileName(id, name);
//   return !!filets && ts<filets;
// }

