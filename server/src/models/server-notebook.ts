/*
Euler Notebook
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

import { CellObject, CellSource, CellId, CellType, CellRelativePosition } from "../shared/cell";
import { assert, assertFalse, deepCopy, ExpectedError, Html, Milliseconds } from "../shared/common";
import { CssSize, convertCssLength } from "../shared/css";
import { LEFT_MARGIN, TOP_MARGIN, RIGHT_MARGIN, BOTTOM_MARGIN, PAGE_HEIGHT, PAGE_WIDTH } from "../shared/dimensions";
import { Folder, NotebookPath, NOTEBOOK_PATH_RE, NotebookName, FolderPath, NotebookEntry } from "../shared/folder";
import { Notebook, NotebookObject, PageMargins } from "../shared/notebook";
import {
  NotebookChangeRequest, MoveCell, DeleteCell, ChangeNotebook, RequestId, NotebookRequest, OpenNotebook, CloseNotebook, InsertCell, DeleteStroke, InsertStroke, ResizeCell, TypesetFormula, TypesetText, TypesetFigure, RemoveSuggestion, AddSuggestion,
} from "../shared/client-requests";
import {
  NotebookUpdated, NotebookOpened, NotebookUpdate, CellInserted, CellDeleted, CellMoved, NotebookCollaboratorConnected, NotebookCollaboratorDisconnected, ServerResponse, StrokeInserted, StrokeDeleted, CellResized, FormulaTypeset, TextTypeset, FigureTypeset, SuggestionAdded, SuggestionRemoved,
} from "../shared/server-responses";
import { notebookChangeRequestSynopsis, notebookUpdateSynopsis } from "../shared/debug-synopsis";
import { UserPermission } from "../shared/permissions";
import { CollaboratorObject } from "../shared/user";
import { FormulaCellObject } from "../shared/formula";
import { InactivityTimeout } from "../shared/inactivity-timeout";
import { TextCellObject } from "../shared/text";

import { existingCell, insertCell, newCellObject } from "./server-cell/instantiator";
import { ServerCell } from "./server-cell";
import { FormulaCell } from "./server-cell/formula-cell";

import { ServerSocket } from "./server-socket";
import { createDirectory, deleteDirectory, FileName, readJsonFile, renameDirectory, writeJsonFile } from "../adapters/file-system";
import { Permissions } from "./permissions";
import { FigureCellObject } from "../shared/figure";
import { StrokeId } from "../shared/stylus";

// Types

interface OpenInfo {
  promise: Promise<ServerNotebook>;
  tally: number;
}

export interface FindCellOptions {
  source?: CellSource;
  notSource?: CellSource;
}

interface RequestChangesOptions {
  originatingSocket?: ServerSocket,
  requestId?: RequestId,
}

interface PersistentServerNotebookObject {
  formatVersion: string;
  nextCellId: CellId;
  obj: NotebookObject;
}

// Constants

const LETTER_PAGE_SIZE: CssSize = {
  width: convertCssLength(PAGE_WIDTH, 'px'),
  height: convertCssLength(PAGE_HEIGHT, 'px'),
};
const DEFAULT_LETTER_MARGINS: PageMargins = {
  top: convertCssLength(TOP_MARGIN, 'px'),
  right: convertCssLength(RIGHT_MARGIN, 'px'),
  bottom: convertCssLength(BOTTOM_MARGIN, 'px'),
  left: convertCssLength(LEFT_MARGIN, 'px'),
};

// IMPORTANT: We have not yet implemented automatic upgrading of notebooks to new format versions.
//            At this point, if you change this number, then users will get an error opening their
//            existing notebooks. This is fine as long as it is only David and Rob, but as soon as
//            other people starting using the program then we need to implement the upgrading.
const FORMAT_VERSION = "0.0.29";

const EMPTY_NOTEBOOK_OBJ: PersistentServerNotebookObject = {
  formatVersion: FORMAT_VERSION,
  nextCellId: 1,
  obj: {
    cells: [],
    margins: DEFAULT_LETTER_MARGINS,
    pageSize: LETTER_PAGE_SIZE,
  },
}

const NOTEBOOK_FILENAME = <FileName>'notebook.json';

const SAVE_INACTIVITY_INTERVAL: Milliseconds = 5000; // How long the notebook is quiescent before it is saved.

// Exported Class

export class ServerNotebook extends Notebook {

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

  public static get allInstances(): IterableIterator<ServerNotebook> {
    return this.instanceMap.values()
  }

  // Public Class Methods

  public static async close(path: NotebookPath, reason: string): Promise<void> {
    const info = this.openMap.get(path);
    if (!info) { return; }
    const instance = await info.promise;
    instance.terminate(reason);
  }

  public static async createOnDisk(path: NotebookPath, permissions: Permissions): Promise<void> {
    assert(ServerNotebook.isValidNotebookPath(path));
    try {
      await createDirectory(path);
    } catch(err) {
      if (err.code == 'EEXIST') {
        err = new ExpectedError(`Notebook '${path}' already exists.`);
      }
      throw err;
    }
    await writeJsonFile(path, NOTEBOOK_FILENAME, EMPTY_NOTEBOOK_OBJ)
    await Permissions.createOnDisk(path, permissions);
  }

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

  public static open(path: NotebookPath): Promise<ServerNotebook> {
    let openInfo = this.openMap.get(path);
    if (openInfo) {
      openInfo.tally++;
    } else {
      const promise = this.openFirst(path);
      openInfo = {
        promise,
        tally: 1,
      };
      this.openMap.set(path, openInfo);
      promise.catch(_err=>{ this.openMap.delete(path); });
    };
    return openInfo.promise;
  }

  // Public Class Event Handlers

  public static async onClientRequest(socket: ServerSocket, msg: NotebookRequest): Promise<void> {
    // Called by ServerSocket when a client sends a notebook request.
    const info = this.openMap.get(msg.path);
    const instance = await(info ? info.promise : this.open(msg.path));
    instance.onClientRequest(socket, msg);
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

  // Public Instance Property Functions

  public *cells2(): Iterable<ServerCell<CellObject>> {
    for (const cellObject of this.obj.cells) {
      const cell = this.cellMap.get(cellObject.id)!;
      assert(cell);
      yield cell;
    }
  }

  public toHtml(): Html {
    if (this.isEmpty()) { return <Html>"<i>Notebook is empty.</i>"; }
    else {
      let html: Html = <Html>"";
      for (const cell of this.cells2()) {
        html += cell.toHtml();
      }
      return html;
    }
  }

  // Public Instance Methods

  public broadcastMessage(response: ServerResponse): void {
    for (const socket of this.sockets) {
      socket.sendMessage(response)
    }
  }

  public close(): void {
    assert(!this.terminated);
    const openInfo = ServerNotebook.openMap.get(this.path)!;
    assert(openInfo);
    openInfo.tally--;
    if (openInfo.tally == 0) {
      // LATER: Set timer to destroy in the future.
      this.terminate("Closed by all clients");
    }
  }

  public nextCellId(): CellId { return this._nextCellId++; }

  public requestChanges(
    source: CellSource,
    changeRequests: NotebookChangeRequest[],
    options: RequestChangesOptions,
  ): void {
    assert(changeRequests.length>0);
    assert(!this.terminated);
    debug(`${source} change requests: ${changeRequests.length}`);

    const response: NotebookUpdated = {
      type: 'notebook',
      path: this.path,
      operation: 'updated',
      updates: [],
      undoChangeRequests: [],
      complete: true,
    }

    for (const changeRequest of changeRequests) {
      const [ updates, undoChangeRequests ] = this.requestChange(changeRequest);
      for (const update of updates) { response.updates.push(update); }
      for (let i=undoChangeRequests.length;i>0;i--) { response.undoChangeRequests.unshift(undoChangeRequests[i-1]); }
    }

    for (const socket of this.sockets) {
      if (socket === options.originatingSocket) {
        socket.sendMessage({ requestId: options.requestId, ...response });
      } else {
        socket.sendMessage({ ...response, undoChangeRequests: [] });
      }
    }

    this.saveTimeout.startOrPostpone();
  }

  public static validateObject(obj: PersistentServerNotebookObject): void {
    // Throws an exception with a descriptive message if the object is not a valid notebook object.
    // LATER: More thorough validation of the object.

    if (typeof obj != 'object' || !obj.nextCellId) { throw new Error("Invalid notebook object JSON."); }
    if (obj.formatVersion != FORMAT_VERSION) {
      throw new ExpectedError(`Invalid notebook version ${obj.formatVersion}. Expect version ${FORMAT_VERSION}`);
    }
  }

  // Public Instance Event Handlers

  // --- PRIVATE ---

  // Private Class Properties

  private static openMap = new Map<NotebookPath, OpenInfo>();
  private static instanceMap = new Map<NotebookPath, ServerNotebook>();

  // Private Class Property Functions

  // Private Class Methods

  private static async openFirst(path: NotebookPath): Promise<ServerNotebook> {
    assert(ServerNotebook.isValidNotebookPath(path));
    const obj = await readJsonFile<PersistentServerNotebookObject>(path, NOTEBOOK_FILENAME);
    ServerNotebook.validateObject(obj);
    const permissions = await Permissions.load(path);
    const instance = new this(path, obj, permissions);
    this.instanceMap.set(path, instance);
    return instance;
  }

  // Private Class Event Handlers

  // Private Constructor

  private constructor(
    path: NotebookPath,
    persistentObj: PersistentServerNotebookObject,
    permissions: Permissions,
  ) {
    super(path, persistentObj.obj);
    this._nextCellId = persistentObj.nextCellId;
    this.permissions = permissions;
    this.saveTimeout = new InactivityTimeout(SAVE_INACTIVITY_INTERVAL, ()=>{ return this.save(); })
    this.cellMap = new Map();
    for (const cellObject of this.obj.cells) {
      const cell = existingCell(this, cellObject);
      this.cellMap.set(cell.id, cell);
    }
    this.sockets = new Set<ServerSocket>();
  }

  // Private Instance Properties

  // TODO: purge changes in queue that have been processed asynchronously.
  private cellMap: Map<CellId, ServerCell<CellObject>>;
  private _nextCellId: CellId;
  private permissions!: Permissions;
  private saveTimeout: InactivityTimeout;
  private saving?: boolean;
  private sockets: Set<ServerSocket>;
  private terminated?: boolean;

  // Private Instance Property Functions

  private getCell<T extends CellObject>(id: CellId): ServerCell<T> {
    const rval = <ServerCell<T>>this.cellMap.get(id)!;
    assert(rval);
    return rval;
  }

  public getFormulaCell(id: CellId): FormulaCell {
    const cell = this.getCell<FormulaCellObject>(id);
    assert(cell.type == CellType.Formula);
    assert(cell instanceof FormulaCell);
    return <FormulaCell><unknown>cell;
  }

  // private getTextCell(id: CellId): TextCell {
  //   const cell = this.getCell<TextCellObject>(id);
  //   assert(cell.type == CellType.Text);
  //   assert(cell instanceof TextCell);
  //   return <TextCell>cell;
  // }

  // Private Instance Methods

  private convertChangeRequestToUpdates(request: NotebookChangeRequest): [ NotebookUpdate[], NotebookChangeRequest[] ] {
    // Helper function for requestChange method.
    // Does not make any changes to the notebook.
    const updates: NotebookUpdate[] = [];
    const undoChangeRequests: NotebookChangeRequest[] = [];

    switch(request.type) {
      case 'addSuggestion': {
        const { cellId, suggestionObject } = request;
        const update: SuggestionAdded = { type: 'suggestionAdded', cellId, suggestionObject };
        updates.push(update);

        const suggestionId = suggestionObject.id;
        const undoChangeRequest: RemoveSuggestion = { type: 'removeSuggestion', cellId, suggestionId };
        undoChangeRequests.unshift(undoChangeRequest);
        break;
      }
      case 'deleteCell': {
        const { cellId } = request;
        const update: CellDeleted = { type: 'cellDeleted', cellId };
        updates.push(update);

        const afterId: CellRelativePosition = this.afterIdForCell(cellId);
        const undoChangeRequest: InsertCell = {
          type: 'insertCell',
          afterId,
          cellObject: this.getCellObject(cellId),
        };
        undoChangeRequests.unshift(undoChangeRequest);
        break;
      }
      case 'deleteStroke': {
        const { cellId, strokeId } = request;
        const update: StrokeDeleted = {
          type: 'strokeDeleted',
          cellId,
          strokeId,
        };
        updates.push(update);

        const cellObject = this.getCellObject(cellId);
        const stroke = cellObject.strokeData.strokes.find(stroke=>stroke.id==strokeId)!
        assert(stroke);
        const undoChangeRequest: InsertStroke = { type: 'insertStroke', cellId, stroke };
        undoChangeRequests.unshift(undoChangeRequest);
        break;
      }
      case 'insertCell': {
        const { afterId, cellObject } = request;
        const cellId = cellObject.id = this.nextCellId();
        cellObject.source = 'USER'; // TODO:
        const update: CellInserted = {
          type: 'cellInserted',
          cellObject,
          afterId,
        };
        updates.push(update);

        const undoChangeRequest: DeleteCell = { type: 'deleteCell', cellId };
        undoChangeRequests.unshift(undoChangeRequest);
        break;
      }
      case 'insertEmptyCell': {
        const { afterId, cellType } = request;
        const cellId = this.nextCellId();
        const source: CellSource = 'USER'; // TODO:
        const cellObject: CellObject = newCellObject(this, cellType, cellId, source);
        const update: CellInserted = {
          type: 'cellInserted',
          cellObject,
          afterId,
        };
        updates.push(update);

        const undoChangeRequest: DeleteCell = { type: 'deleteCell', cellId };
        undoChangeRequests.unshift(undoChangeRequest);
        break;
      }
      case 'insertStroke': {
        const { cellId, stroke } = request;
        const cellObject = this.getCellObject(cellId);
        stroke.id = <StrokeId>(cellObject.strokeData.nextId++).toString();

        const update: StrokeInserted = {
          type: 'strokeInserted',
          cellId,
          stroke,
        };
        updates.push(update);

        const undoChangeRequest: DeleteStroke = { type: 'deleteStroke', cellId, strokeId: stroke.id };
        undoChangeRequests.unshift(undoChangeRequest);
        break;
      }
      case 'moveCell': {
        const { cellId, afterId } = request;
        const priorAfterId = this.afterIdForCell(cellId);
        assert(afterId != cellId); // Cell can't be moved after itself.
        assert(afterId != priorAfterId); // Cell must move.

        const update: CellMoved = { type: 'cellMoved', cellId, afterId };
        updates.push(update);

        const undoChangeRequest: MoveCell = { type: 'moveCell', cellId, afterId: priorAfterId };
        undoChangeRequests.unshift(undoChangeRequest);
        break;
      }
      case 'removeSuggestion': {
        const { cellId, suggestionId } = request;
        const update: SuggestionRemoved = { type: 'suggestionRemoved', cellId, suggestionId };
        updates.push(update);

        const cellObject = this.getCellObject(cellId);
        const suggestionObject = cellObject.suggestions.find(s=>s.id==suggestionId)!;
        assert(suggestionObject);
        const undoChangeRequest: AddSuggestion = { type: 'addSuggestion', cellId, suggestionObject };
        undoChangeRequests.unshift(undoChangeRequest);
        break;
      }
      case 'resizeCell':  {
        const { cellId, cssSize } = request;
        assert(cssSize.height.endsWith('px'));
        assert(cssSize.width.endsWith('px'));

        const update: CellResized = { type: 'cellResized', cellId, cssSize };
        updates.push(update);

        const cellObject = this.getCellObject(cellId);
        const oldCssSize = deepCopy(cellObject.cssSize);
        const undoChangeRequest: ResizeCell = { type: 'resizeCell', cellId, cssSize: oldCssSize };
        undoChangeRequests.unshift(undoChangeRequest);
        break;
      }
      case 'typesetFigure': {
        const { cellId, figure, strokeData } = request;

        const update: FigureTypeset = { type: 'figureTypeset', cellId, figure, strokeData };
        updates.push(update);

        const cellObject = this.getCellObject<FigureCellObject>(cellId);
        const undoChangeRequest: TypesetFigure = { type: 'typesetFigure', cellId, figure: cellObject.figure, strokeData: cellObject.strokeData };
        undoChangeRequests.unshift(undoChangeRequest);
        break;
      }
      case 'typesetFormula': {
        const { cellId, formula, strokeData } = request;

        const update: FormulaTypeset = { type: 'formulaTypeset', cellId, formula, strokeData };
        updates.push(update);

        const cellObject = this.getCellObject<FormulaCellObject>(cellId);
        const undoChangeRequest: TypesetFormula = { type: 'typesetFormula', cellId, formula: cellObject.formula, strokeData: cellObject.strokeData };
        undoChangeRequests.unshift(undoChangeRequest);
        break;
      }
      case 'typesetText': {
        const { cellId, text, strokeData } = request;

        const update: TextTypeset = { type: 'textTypeset', cellId, text, strokeData };
        updates.push(update);

        const cellObject = this.getCellObject<TextCellObject>(cellId);
        const undoChangeRequest: TypesetText = { type: 'typesetText', cellId, text: cellObject.inputText, strokeData: cellObject.strokeData };
        undoChangeRequests.unshift(undoChangeRequest);
        break;
      }
      default: assertFalse();
    }

    return [ updates, undoChangeRequests ];
  }

  private removeSocket(socket: ServerSocket): void {
    const hadSocket = this.sockets.delete(socket);
    assert(hadSocket);
    if (this.sockets.size == 0) {
      // TODO: purge this folder immediately or set a timer to purge it in the near future.
      console.warn(`Last socket removed from notebook: "${this.path}"`)
    }
  }

  private requestChange(request: NotebookChangeRequest): [ NotebookUpdate[], NotebookChangeRequest[] ] {
    debug(`Change request: ${notebookChangeRequestSynopsis(request)}`);
    const rval = this.convertChangeRequestToUpdates(request);

    // Apply the updates to the notebook.
    for (const update of rval[0]) {
      this.onUpdate(update);
    }
    return rval;
  }


  private async save(): Promise<void> {
    // LATER: A new save can be requested before the previous save completes,
    //        so wait until the previous save completes before attempting to save.

    debug(`Saving ${this.path}`);
    assert(!this.saving);
    this.saving = true;

    const psno: PersistentServerNotebookObject = {
      formatVersion: FORMAT_VERSION,
      nextCellId: this._nextCellId,
      obj: this.obj,
    };
    await writeJsonFile<PersistentServerNotebookObject>(this.path, NOTEBOOK_FILENAME, psno);
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

  private terminate(_reason: string): void {
    assert(!this.terminated);
    this.terminated = true;
    ServerNotebook.openMap.delete(this.path);
    ServerNotebook.instanceMap.delete(this.path);
  }

  // Private Event Handlers

  private  onClientRequest(socket: ServerSocket, msg: NotebookRequest): void {
    assert(!this.terminated);
    switch(msg.operation) {
      case 'change': this.onClientChangeRequest(socket, msg); break;
      case 'close':  this.onClientCloseRequest(socket, msg); break;
      case 'open':  this.onClientOpenRequest(socket, msg); break;
      default: assert(false); break;
    }
  }

  private onClientChangeRequest(socket: ServerSocket, msg: ChangeNotebook): void {

    // Verify the user has permission to modify the notebook.
    const user = socket.user;
    const permissions = this.permissions.getUserPermissions(user);
    if (!(permissions & UserPermission.Modify)) {
      const message = user ?
                      `You do not have permission to modify this notebook.` :
                      `You must logged in to modify this notebook.`;
      throw new ExpectedError(message)
    }

    const options: RequestChangesOptions = { originatingSocket: socket, requestId: msg.requestId };
    this.requestChanges('USER', msg.changeRequests, options);
  }

  private onClientCloseRequest(socket: ServerSocket, _msg: CloseNotebook): void {
    // NOTE: No response is expected for a close request.
    assert(this.sockets.has(socket));
    this.removeSocket(socket);
    this.sendCollaboratorDisconnectedMessage(socket);
  }

  private onClientOpenRequest(socket: ServerSocket, msg: OpenNotebook): void {

    // Check if the user has permission to open this notebook.
    const user = socket.user;
    const permissions = this.permissions.getUserPermissions(user);
    if (!(permissions & UserPermission.Read)) {
      const message = user ?
                      `This notebook is not public and is not shared with you.` :
                      `You must log in to access this notebook.`;
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
      obj: this.obj,
      complete: true
    };
    socket.sendMessage(response);

    this.sendCollaboratorConnectedMessage(socket);
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

  protected onUpdate(update: NotebookUpdate): void {
    // Process an individual notebook change from the server.
    debug(`onUpdate ${notebookUpdateSynopsis(update)}`);

    // Apply the update to our base data structure.
    super.onUpdate(update);

    // Apply the update to any data structure extensions to the base data structure.
    switch (update.type) {

      case 'cellDeleted': {
        const { cellId } = update;
        assert(this.cellMap.has(cellId));
        this.cellMap.delete(cellId);
        // REVIEW: Notify the cell it has been deleted?
        break;
      }
      case 'cellInserted': {
        const { cellObject } = update;
        // TODO: Source???
        const cell = insertCell(this, cellObject);
        this.cellMap.set(cell.id, cell);
        break;
      }
      default: {
        if (update.hasOwnProperty('cellId')) {
          const cell = this.getCell((<any/* TYPESCRIPT: */>update).cellId);
          cell.onUpdate(update);
        }
        break;
      }
    }

  }

}

// Exported Functions

export function notebookPath(path: FolderPath, name: NotebookName): NotebookPath {
  return <NotebookPath>`${path}${name}${ServerNotebook.NOTEBOOK_DIR_SUFFIX}`;
}

// Helper Functions

