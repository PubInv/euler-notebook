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

// Textual representations useful for debugging.

// Requirements

import { CellObject, CellType } from "./cell";
import { assert } from './common';
//import { Notebook } from './notebook';
import {
  FolderRequest, ClientRequest, NotebookRequest, FolderChangeRequest, NotebookChangeRequest,
} from './client-requests';
import { FolderResponse, FolderUpdate, ServerResponse, NotebookResponse, NotebookUpdate } from "./server-responses";
import { NotebookObject } from "./notebook";
import { Stroke } from "./stylus";

// Constants

const CELL_TYPES: Map<CellType, string> = new Map([
  [ CellType.Figure, "Figure" ],
  [ CellType.Formula, "Formula" ],
  [ CellType.Plot, "Plot" ],
  [ CellType.Text, "Text" ],
]);

const UNKNOWN_TYPE = " UNKNOWN!";

// Exported Functions

export function cellBriefSynopsis(cell: CellObject, indentationLevel: number = 0): string {
  return `${indentation(indentationLevel)}C${cell.id} ${cellTypeString(cell.type)} ${cell.source}`;
}

export function cellSynopsis(cell: CellObject, indentationLevel: number = 0): string {
  return `${cellBriefSynopsis(cell, indentationLevel)} TODO: more data depending on type.`;
}

export function clientMessageSynopsis(msg: ClientRequest): string {
  let rval = `${msg.requestId?`${msg.requestId} `:''}${msg.type} `;

  switch (msg.type) {
    case 'folder': rval += clientFolderMessageSynopsis(msg); break;
    case 'notebook': rval += clientNotebookMessageSynopsis(msg); break;
    default: rval += UNKNOWN_TYPE;
  }
  return rval;
}

export function folderChangeRequestSynopsis(request: FolderChangeRequest): string {
  let rval: string = request.type;
  switch(request.type) {
    case 'createFolder':   rval += ` TODO`; break;
    case 'createNotebook': rval += ` TODO`; break;
    case 'deleteFolder':   rval += ` TODO`; break;
    case 'deleteNotebook': rval += ` TODO`; break;
    case 'renameFolder':   rval += ` TODO`; break;
    case 'renameNotebook': rval += ` TODO`; break;
    default: rval += UNKNOWN_TYPE;
  }
  return rval;
}

export function folderChangeSynopsis(change: FolderUpdate): string {
  let rval: string = change.type;
  switch(change.type) {
    case 'folderCreated':   rval += ` ${change.entry.name}`; break;
    case 'folderDeleted':   rval += ` ${change.entry.name}`; break;
    case 'folderRenamed':   rval += ` ${change.oldName}=>${change.entry.name}`; break;
    case 'notebookCreated': rval += ` ${change.entry.name}`; break;
    case 'notebookDeleted': rval += ` ${change.entry.name}`; break;
    case 'notebookRenamed': rval += ` ${change.oldName}=>${change.entry.name}`; break;
    default: rval += UNKNOWN_TYPE;
  }
  return rval;
}

export function notebookChangeRequestSynopsis(request: NotebookChangeRequest): string {
  let rval: string = request.type;
  switch(request.type) {
    case 'deleteCell':          rval += ` C${request.cellId}`; break;
    case 'deleteStroke':        rval += ` C${request.cellId} S${request.strokeId}`; break;
    case 'insertEmptyCell':          rval += ` TODO:`; break;
    case 'insertStroke':        rval +=  ` C${request.cellId} ${strokeSynopsis(request.stroke)}`; break;
    case 'keyboardInputChange': rval += ` TODO:`; break;
    case 'moveCell':            rval += ` C${request.cellId} A${request.afterId}`; break;
    case 'resizeCell':          rval += ` C${request.cellId} ${JSON.stringify(request.cssSize)}`; break;
    default: rval += UNKNOWN_TYPE;
  }
  return rval;
}

export function notebookUpdateSynopsis(update: NotebookUpdate): string {
  let rval: string = update.type;
  switch(update.type) {
    case 'cellDeleted':    rval += ` P${update.cellId}`; break;
    case 'cellInserted':   rval += ` ${cellSynopsis(update.cellObject)}`; break;
    case 'cellMoved':      rval += ` C${update.cellId} to index ${update.newIndex}`; break;
    case 'cellResized':    rval += ` C${update.cellId} ${JSON.stringify(update.cssSize)}`; break;
    case 'strokeInserted': rval += ` C${update.cellId} ${strokeSynopsis(update.stroke)}`; break;
    case 'strokeDeleted':  rval += ` C${update.cellId} S${update.strokeId}`; break;
    default: rval += UNKNOWN_TYPE;
  }
  return rval;
}

export function notebookSynopsis(notebookObject: NotebookObject): string {
  // TODO: Notebook formatVersion, pageConfiguration, etc.
  return notebookObject.cells.map(cell=>{
    return cellSynopsis(cell);
  }).join('/n');
}

export function serverMessageSynopsis(msg: ServerResponse): string {
  let rval = `${msg.requestId?`${msg.requestId} `:''}${msg.type} `;

  switch (msg.type) {
    case 'error':    rval += `msg: "${msg.message}"`; break;
    case 'folder':   rval += folderResponseSynopsis(msg); break;
    case 'notebook': rval += notebookResponseSynopsis(msg); break;
    default: rval += UNKNOWN_TYPE;
  }
  if (msg.complete) { rval += ' [complete]' };
  return rval;
}

// Helper Functions

function cellTypeString(type: CellType): string {
  const rval = CELL_TYPES.get(type)!;
  assert(rval);
  return rval;
}

function clientFolderMessageSynopsis(msg: FolderRequest): string {
  let rval = `${msg.path} ${msg.operation}`;
  switch(msg.operation) {
    case 'change':
      for (const request of msg.changeRequests) {
        rval += ` ${folderChangeRequestSynopsis(request)};`;
      }
      break;
    case 'close': break;
    case 'open': break;
    default: rval += UNKNOWN_TYPE;
  }
  return rval;
}

function clientNotebookMessageSynopsis(msg: NotebookRequest): string {
  let rval = `${msg.path} ${msg.operation}`;
  switch(msg.operation) {
    case 'change':
      for (const request of msg.changeRequests) {
        rval += ` ${notebookChangeRequestSynopsis(request)};`;
      }
      break;
    case 'close': break;
    case 'open': break;
    case 'useTool': rval += `style ${msg.cellId}`; break;
    default: rval += UNKNOWN_TYPE;
  }
  return rval;
}

function indentation(indentationLevel: number): string { return ' '.repeat(indentationLevel*2); }

function folderResponseSynopsis(msg: FolderResponse): string {
  let rval = `${msg.path} ${msg.operation} `;
  switch(msg.operation) {
    case 'updated':
      for (const change of msg.updates) {
        rval += `${folderChangeSynopsis(change)}; `;
      }
      break;
    case 'closed': rval += ` reason: "${msg.reason}"`; break;
    case 'opened': break;
    default: rval += UNKNOWN_TYPE;
  }
  return rval;
}

function notebookResponseSynopsis(msg: NotebookResponse): string {
  let rval = `${msg.path} ${msg.operation} `;
  switch(msg.operation) {
    case 'updated':
      for (const change of msg.updates) {
        rval += `${notebookUpdateSynopsis(change)}; `;
      }
      break;
    case 'closed': rval += ` reason: ${msg.reason}`; break;
    case 'opened': break;
    default: rval += UNKNOWN_TYPE;
  }
  return rval;
}

function strokeSynopsis(stroke: Stroke): string {
  const prefixLen = Math.min(stroke.x.length, 3);
  const abbreviated = stroke.x.length > prefixLen;
  const xPrefix = stroke.x.slice(0, prefixLen);
  const points = xPrefix.map((x,i)=>{
    const y = stroke.y[i];
    return `(${x.toFixed(2)},${y.toFixed(2)})`;
  });
  return `S${stroke.id}[${points.join(',')}${abbreviated?"...":""}]`
}
