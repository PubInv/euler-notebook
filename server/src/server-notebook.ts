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

// REVIEW: Where should we be checking if this.terminated is set?
// REVIEW: Have a "read-only" notebook that only lets you read but not make any changes?
//         This would enforce all changes being made through the observer interfaces
//         rather than directly on the notebook.

// Requirements

import * as debug1 from "debug";
// import { readdirSync, unlink, writeFileSync } from "fs"; // LATER: Eliminate synchronous file operations.
import { join } from "path";

import { CellObject, CellSource, CellId, CellPosition, StylusCellObject, InputType } from "./shared/cell";
import { assert, assertFalse, ExpectedError, notImplemented, Timestamp } from "./shared/common";
import { NotebookPath, NOTEBOOK_PATH_RE, NotebookName, FolderPath, NotebookEntry } from "./shared/folder";
import {
  Notebook, NotebookObject,
  VERSION,
  NotebookWatcher,
} from "./shared/notebook";
import {
  NotebookChangeRequest, MoveCell, InsertCell, DeleteCell,
  ChangeNotebook, UseTool, RequestId, AddStroke, RemoveStroke, NotebookRequest, OpenNotebook, CloseNotebook,
} from "./shared/client-requests";
import {
  NotebookUpdated, NotebookOpened, NotebookUpdate,
  CellMoved, CellInserted, CellDeleted, StrokeInserted,
} from "./shared/server-responses";
import { notebookChangeRequestSynopsis } from "./shared/debug-synopsis";
import { StrokeId } from "./shared/stylus";
import { OpenOptions } from "./shared/watched-resource";

import { ServerSocket } from "./server-socket";
import { AbsDirectoryPath, ROOT_DIR_PATH, mkDir, readFile, rename, rmRaf, writeFile } from "./adapters/file-system";
import { logError } from "./error-handler";


// const svg2img = require('svg2img');

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// Types

type AbsFilePath = string; // Absolute path to a file in the file system.

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

// Constants

const NOTEBOOK_ENCODING = 'utf8';
const NOTEBOOK_FILE_NAME = 'notebook.json';

// Base Class

export class ServerNotebook extends Notebook<ServerNotebookWatcher> {

  // Public Class Constants

  public static NOTEBOOK_DIR_SUFFIX = '.mtnb';

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
    if (!this.isValidNotebookName(name)) { throw new Error(`Invalid notebook name: ${name}`); }
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
    const absPath = absDirPathFromNotebookPath(path);
    debug(`Deleting notebook directory ${absPath}`);
    await rmRaf(absPath); // TODO: Handle failure.
  }

  public static async move(path: NotebookPath, newPath: NotebookPath): Promise<NotebookEntry> {
    // Called by the containing ServerFolder when one of its notebooks is renamed.

    this.close(path, `Notebook is moving to ${newPath}.`)
    const oldAbsPath = absDirPathFromNotebookPath(path);
    const newAbsPath = absDirPathFromNotebookPath(newPath);

    // REVIEW: If there is an existing *file* (not directory) at the new path then it will be overwritten silently.
    //         However, we don't expect random files to be floating around out notebook storage filesystem.
    await rename(oldAbsPath, newAbsPath);
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
    // REVIEW: If the server has a large number of notebook instances, then
    //         we may want to create a map from sockets to lists of notebook instances
    //         so we can handle this more efficiently.
    for (const instance of this.allInstances) {
      instance.onSocketClosed(socket);
    }
  }

  // Public Instance Properties

  // Public Instance Property Functions

  public absoluteDirectoryPath(): AbsDirectoryPath {
    return absDirPathFromNotebookPath(this.path);
  }

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

  public toJSON(): NotebookObject {
    const rval: NotebookObject = {
      nextId: this.nextId,
      pageConfig: this.pageConfig,
      pages: this.pages,
      cellMap: this.cellMap,
      version: VERSION,
    }
    return rval;
  }

  // Public Instance Methods

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
        case 'addStroke':
          await this.applyAddStrokeRequest(source, changeRequest, updates, undoChangeRequests);
          break;
        case 'deleteCell':
          await this.applyDeleteCellRequest(source, changeRequest, updates, undoChangeRequests);
          break;
        case 'insertCell':
          await this.applyInsertCellRequest(source, changeRequest, updates, undoChangeRequests);
          break;
        case 'moveCell':
          await this.applyMoveStyleRequest(source, changeRequest, updates, undoChangeRequests);
          break;
        case 'removeStroke':
          await this.applyRemoveStrokeRequest(source, changeRequest, updates, undoChangeRequests);
          break;
        default:
          assertFalse();
      }
    }

    const update: NotebookUpdated = {
      type: 'notebook',
      path: this.path,
      operation: 'updated',
      updates: updates,
      undoChangeRequests, // TODO: Only undo for initiating client.
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
    // LATER: Set/restart a timer for the save so we save only once when the document reaches a quiescent state.
    await this.save();
  }

  public reserveId(): CellId {
    const cellId = this.nextId++;
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

  // Private Class Methods

  private static generateUniqueEphemeralPath(): NotebookPath {
    let timestamp = <Timestamp>Date.now();
    if (timestamp <= this.lastEphemeralPathTimestamp) {
      timestamp = this.lastEphemeralPathTimestamp+1;
    }
    this.lastEphemeralPathTimestamp = timestamp;
    return  <NotebookPath>`/eph${timestamp}${this.NOTEBOOK_DIR_SUFFIX}`;
  }


  // Private Class Event Handlers

  // Private Constructor

  private constructor(path: NotebookPath, options: OpenNotebookOptions) {
    super(path);
    this.ephemeral = options.ephemeral;
    this.reservedIds = new Set();
    this.sockets = new Set<ServerSocket>();
  }

  // Private Instance Properties

  // TODO: purge changes in queue that have been processed asynchronously.
  private ephemeral?: boolean;     // Not persisted to the filesystem.
  private reservedIds: Set<CellId>;
  private saving?: boolean;
  private sockets: Set<ServerSocket>;

  // Private Instance Property Functions

  // Private Instance Methods

  private async applyAddStrokeRequest<T extends StylusCellObject>(
    _source: CellSource,
    request: AddStroke,
    updates: NotebookUpdate[],
    undoChangeRequests: NotebookChangeRequest[],
  ): Promise<void> {
    const cellId = request.cellId;
    const cellObject = this.getCell<T>(request.cellId);
    const strokeId: StrokeId = -1; //BUGBUG;
    const update: StrokeInserted = {
      type: 'strokeInserted',
      cellId: cellObject.id,
      strokeId: strokeId,
      stroke: request.stroke
    };
    updates.push(update);

    assert(cellObject.inputType == InputType.Stylus);
    cellObject.stylusInput.strokeGroups[0].strokes.push(update.stroke);
    notImplemented();

    const undoChangeRequest: RemoveStroke = { type: 'removeStroke', cellId, strokeId };
    undoChangeRequests.unshift(undoChangeRequest);
  }

  private async applyDeleteCellRequest<T extends CellObject>(
    _source: CellSource,
    request: DeleteCell,
    updates: NotebookUpdate[],
    undoChangeRequests: NotebookChangeRequest[],
  ): Promise<void> {

    const cellObject = this.getCell<T>(request.cellId);

    // Assemble the undo change request before we delete anything
    // from the notebook.
    const undoChangeRequest: InsertCell<T> = {
      type: 'insertCell',
      afterId: this.precedingCellId(cellObject.id),
      cellObject,
    };
    undoChangeRequests.unshift(undoChangeRequest);

    const update: CellDeleted = { type: 'cellDeleted', cellId: cellObject.id };
    updates.push(update);

    const cellId = update.cellId;
    assert(this.cellMap[cellId]);
    // If this is a top-level style then remove it from the top-level style order first.
    const i = this.pages[0].cellIds.indexOf(cellId);
    assert(i>=0);
    this.pages[0].cellIds.splice(i,1);
    delete this.cellMap[cellId];

  }

  private async applyInsertCellRequest<T extends CellObject>(
    _source: CellSource,
    request: InsertCell<T>,
    updates: NotebookUpdate[],
    undoChangeRequests: NotebookChangeRequest[],
  ): Promise<void> {
    const cellObject = request.cellObject;
    const afterId = request.afterId;
    assert(cellObject.id == 0);
    const cellId = cellObject.id = this.nextId++;
    const update: CellInserted =  { type: 'cellInserted', cellObject, afterId };
    updates.push(update);

    this.cellMap[cellObject.id] = cellObject;
    // Insert top-level styles in the style order.
    if (!afterId || afterId===CellPosition.Top) {
      this.pages[0].cellIds.unshift(cellObject.id);
    } else if (afterId===CellPosition.Bottom) {
      this.pages[0].cellIds.push(cellObject.id);
    } else {
      const i = this.pages[0].cellIds.indexOf(afterId);
      if (i<0) { throw new Error(`Cannot insert thought after unknown thought ${afterId}`); }
      this.pages[0].cellIds.splice(i+1, 0, cellObject.id);
    }

    const undoChangeRequest: DeleteCell = { type: 'deleteCell', cellId };
    undoChangeRequests.unshift(undoChangeRequest);
  }

  private async applyMoveStyleRequest(
    _source: CellSource,
    request: MoveCell,
    updates: NotebookUpdate[],
    undoChangeRequests: NotebookChangeRequest[],
  ): Promise<void> {
    const { cellId, afterId } = request;
    if (afterId == cellId) { throw new Error(`Style ${cellId} can't be moved after itself.`); }

    const style = this.getCell(cellId);
    const oldPosition: CellPosition = this.pages[0].cellIds.indexOf(style.id);
    if (oldPosition < 0) { throw new Error(`Style ${cellId} can't be moved: not found in styleOrder array.`); }

    let oldAfterId: number;
    if (oldPosition == 0) { oldAfterId = 0; }
    else if (oldPosition == this.pages[0].cellIds.length-1) { oldAfterId = -1; }
    else { oldAfterId = this.pages[0].cellIds[oldPosition-1]; }

    let newPosition: CellPosition;
    if (afterId == 0) { newPosition = 0; }
    else if (afterId == -1) { newPosition = this.pages[0].cellIds.length  - 1; }
    else {
      newPosition = this.pages[0].cellIds.indexOf(afterId);
      if (newPosition < 0) { throw new Error(`Style ${cellId} can't be moved: other style ${afterId} not found in styleOrder array.`); }
      if (oldPosition > newPosition) { newPosition++; }
    }

    const update: CellMoved = { type: 'cellMoved', cellId, afterId, oldPosition, newPosition };
    updates.push(update);

    this.pages[0].cellIds.splice(oldPosition, 1);
    this.pages[0].cellIds.splice(newPosition, 0, cellId);

    const undoChangeRequest: MoveCell = {
      type: 'moveCell',
      cellId: style.id,
      afterId: oldAfterId
    };
    undoChangeRequests.unshift(undoChangeRequest);
  }

  private async applyRemoveStrokeRequest<T extends CellObject>(
    _source: CellSource,
    request: RemoveStroke,
    updates: NotebookUpdate[],
    undoChangeRequests: NotebookChangeRequest[],
  ): Promise<void> {
    const cellId = request.cellId;
    const cellObject = this.getCell<T>(request.cellId);
    const afterId = CellPosition.Bottom;  // TODO: Get the ID of the cell preceding us.
    const update: CellDeleted =  { type: 'cellDeleted', cellId };
    updates.push(update);

    const undoChangeRequest: InsertCell<T> = { type: 'insertCell', cellObject, afterId };
    undoChangeRequests.unshift(undoChangeRequest);

    notImplemented();

  }

  protected async initialize(options: OpenNotebookOptions): Promise<void> {
    if (options.mustExist) {
      assert(ServerNotebook.isValidNotebookPath(this.path));
      const absPath = absFilePathFromNotebookPath(this.path);
      // REVIEW: Create file-system readJsonFile function?
      const json = await readFile(absPath, NOTEBOOK_ENCODING);
      const obj = JSON.parse(json);
      assert(typeof obj == 'object');
      Notebook.validateObject(obj);
      this.initializeFromObject(obj);
    } else if (options.mustNotExist) {
      await this.saveNew();
    } else {
      // LATER: Neither mustExist or mustNotExist specified. Open if it exists, or create if it doesn't exist.
      //        Currently this is an illegal option configuration.
      notImplemented();
    }
  }

  // private processInsertCellRequest(
  //   request: InsertCellRequest,
  // ): StyleInsertRequest {
  //   let data: FigureCellData|FormulaCellData|TextCellData;
  //   let role: StyleRole;
  //   let type: StyleType;
  //   switch(request.cellType) {
  //     case CellType.Figure: {
  //       role = 'FIGURE';
  //       type = 'FIGURE-DATA';
  //       assert(request.inputType == InputType.Stylus);
  //       const figureCellData: FigureCellData = {
  //         type: request.cellType,
  //         height: 72*3, // 3 inches in points
  //         displaySvg: EMPTY_SVG,
  //         inputType: InputType.Stylus,
  //         stylusInput: emptyStylusInput(3, 6.5),
  //       };
  //       data = figureCellData;
  //       break;
  //     }
  //     case CellType.Formula: {
  //       role = 'FORMULA';
  //       type = 'FORMULA-DATA';
  //       switch(request.inputType) {
  //         case InputType.Keyboard: {
  //           const formulaCellKeyboardData: FormulaCellKeyboardData = {
  //             type: request.cellType,
  //             height: 72*1, // 1 inch in points
  //             displaySvg: EMPTY_SVG,
  //             inputType: InputType.Keyboard,
  //             inputText: <PlainText>'',
  //             plainTextFormula: EMPTY_FORMULA,
  //           };
  //           data = formulaCellKeyboardData;
  //           break;
  //         }
  //         case InputType.Stylus: {
  //           const formulaCellStylusData: FormulaCellStylusData = {
  //             type: request.cellType,
  //             height: 72*1, // 1 inch in points
  //             displaySvg: EMPTY_SVG,
  //             inputType: InputType.Stylus,
  //             inputText: <PlainText>'',
  //             plainTextFormula: EMPTY_FORMULA,
  //             stylusInput: emptyStylusInput(1, 6.5),
  //             stylusSvg: EMPTY_SVG,
  //           };
  //           data = formulaCellStylusData;
  //           break;
  //         }
  //         default: assertFalse();
  //       }
  //       break;
  //     }
  //     case CellType.Text: {
  //       role = 'TEXT';
  //       type = 'TEXT-DATA';
  //       switch(request.inputType) {
  //         case InputType.Keyboard: {
  //           const textCellKeyboardData: TextCellKeyboardData = {
  //             type: request.cellType,
  //             height: 72*1, // 1 inch in points
  //             displaySvg: EMPTY_SVG,
  //             inputType: InputType.Keyboard,
  //             inputText: <PlainText>"",
  //           };
  //           data = textCellKeyboardData;
  //           break;
  //         }
  //         case InputType.Stylus: {
  //           const textCellStylusData: TextCellStylusData = {
  //             type: request.cellType,
  //             height: 72*1, // 1 inch in points
  //             displaySvg: EMPTY_SVG,
  //             inputType: InputType.Stylus,
  //             inputText: <PlainText>"",
  //             stylusInput: emptyStylusInput(1, 6.5),
  //             stylusSvg: EMPTY_SVG,
  //           };
  //           data = textCellStylusData;
  //           break;
  //         }
  //         default: assertFalse();
  //       }
  //       break;
  //     }
  //     default: assertFalse();
  //   }

  //   const changeRequest: StyleInsertRequest = {
  //     type: 'insertCell',
  //     afterId: request.afterId,
  //     parentId: 0,
  //     styleProps: { role, type, data },
  //   }
  //   return changeRequest;

  // }

  // private processKeyboardChangeRequest(
  //   _source: StyleSource,
  //   request: KeyboardInputRequest,
  //   requestId?: RequestId,
  // ): ServerNotebookCellChangedMessage {

  //   // Update the inputText field in the cell.
  //   const style = this.getStyle(request.cellId);
  //   assert(style.role == 'FORMULA' || style.role == 'TEXT');
  //   const data: FormulaCellData|TextCellData = style.data;

  //   // TODO: Use start, end, replacement to just replace changed segment.
  //   // data.inputText = <PlainText>replaceStringSegment(data.inputText, request.start, request.end, request.replacement);
  //   data.inputText = request.value;

  //   // LATER: This will fail when there is a race condition between two clients attempting to update the value.
  //   //        Need to deal with that case.
  //   assert(data.inputText==request.value);

  //   // TODO: Update display svg, etc.

  //   // Notify all watchers
  //   const reply: ServerNotebookCellChangedMessage = {
  //     type: 'notebook',
  //     path: this.path,
  //     operation: 'cellChanged',
  //     cellId: request.cellId,
  //     complete: true,
  //     requestId,

  //     inputText: data.inputText,
  //     inputTextStart: request.start,
  //     inputTextEnd: request.end,
  //     inputTextReplacement: request.replacement,
  //   };
  //   return reply;
  // }

  // private processStylusChangeRequest(
  //   _source: StyleSource,
  //   _request: StylusInputRequest,
  //   _requestId?: RequestId,
  // ): ServerNotebookCellChangedMessage {
  //   notImplemented();
  // }

  private removeSocket(socket: ServerSocket): void {
    const hadSocket = this.sockets.delete(socket);
    assert(hadSocket);
    if (this.sockets.size == 0) {
      // TODO: purge this notebook immediately or set a timer to purge it in the near future.
      notImplemented();
    }
  }

  private async save(): Promise<void> {
    // Do not call this directly.
    // Changes to the document should result in calls to notifyChange,
    // which will schedule a save, eventually getting here.

    // "Ephemeral" notebooks are not persisted in the filesystem.
    if (this.ephemeral) { return; }

    assert(!this.saving); // LATER: Saving promise?
    assert(ServerNotebook.isValidNotebookPath(this.path));
    debug(`saving ${this.path}`);
    this.saving = true;

    const json = JSON.stringify(this);
    const filePath = absFilePathFromNotebookPath(this.path);
    await writeFile(filePath, json, NOTEBOOK_ENCODING)
    this.saving = false;
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
      const dirPath = absDirPathFromNotebookPath(this.path);
      await mkDir(dirPath);
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
      case 'change': this.onChangeRequest(socket, msg); break;
      case 'close':  this.onCloseRequest(socket, msg); break;
      case 'open':  this.onOpenRequest(socket, msg); break;
      case 'useTool': this.onUseToolRequest(socket, msg); break;
      default: assert(false); break;
    }
  }

  private onSocketClosed(socket: ServerSocket): void {
    if (this.sockets.has(socket)) {
      this.removeSocket(socket);
    }
  }

  // Client Message Event Handlers

  private onChangeRequest(originatingSocket: ServerSocket, msg: ChangeNotebook): void {
    const options: RequestChangesOptions = { originatingSocket, requestId: msg.requestId };
    this.requestChanges('USER', msg.changeRequests, options)
    .catch(err=>{
      // REVIEW: Proper error handling?
      logError(err, "Error processing client notebook change message.");
    });
  }

  private onCloseRequest(socket: ServerSocket, _msg: CloseNotebook): void {
    assert(this.sockets.has(socket));
    this.removeSocket(socket);
    // NOTE: No response is expected for a close request.
  }

  private onOpenRequest(socket: ServerSocket, msg: OpenNotebook): void {
    this.sockets.add(socket);
    const obj = this.toJSON();
    const response: NotebookOpened = {
      requestId: msg.requestId,
      type: 'notebook',
      operation: 'opened',
      path: this.path,
      obj,
      complete: true
    };
    socket.sendMessage(response);
  }

  private onUseToolRequest(_socket: ServerSocket, _msg: UseTool): void {
    // debug(`useTool ${cellId}`);
    notImplemented();
    // const style = this.getStyle(cellId);
    // const source = style.source;
    // if (!style) { throw new Error(`Notebook useTool style ID not found: ${cellId}`); }
    // const observer = this.observers.get(source);
    // const changeRequests = await observer!.useTool(style);
    // const changes = await this.requestChanges(source, changeRequests);
    // return changes;
  }

}

// Exported Functions

export function absDirPathFromNotebookPath(path: NotebookPath): AbsDirectoryPath {
  const pathSegments = path.split('/').slice(1);  // slice removes leading slash
  return join(ROOT_DIR_PATH, ...pathSegments);
}

export function notebookPath(path: FolderPath, name: NotebookName): NotebookPath {
  return <NotebookPath>`${path}${name}${ServerNotebook.NOTEBOOK_DIR_SUFFIX}`;
}

// Helper Functions

function absFilePathFromNotebookPath(path: NotebookPath): AbsFilePath {
  const absPath = absDirPathFromNotebookPath(path);
  return join(absPath, NOTEBOOK_FILE_NAME);
}

// function emptyStylusInput(height: number, width: number): StylusInput {
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

