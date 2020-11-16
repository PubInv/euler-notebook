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

import { CellObject } from "./cell";
import { assertFalse } from './common';
import { FolderChange } from './folder';
import { Notebook, NotebookChange, } from './notebook';
import {
  FolderRequest, ClientRequest, NotebookRequest, FolderChangeRequest, NotebookChangeRequest,
} from './client-requests';
import { FolderResponse, ServerResponse, NotebookResponse } from "./server-responses";
// Exported Functions

export function clientMessageSynopsis(msg: ClientRequest): string {
  let rval = `${msg.requestId?`${msg.requestId} `:''}${msg.type} `;

  switch (msg.type) {
    case 'folder': rval += clientFolderMessageSynopsis(msg); break;
    case 'notebook': rval += clientNotebookMessageSynopsis(msg); break;
    default: assertFalse();
  }
  return rval;
}

export function folderChangeRequestSynopsis(request: FolderChangeRequest): string {
  let rval: string = request.type;
  switch(request.type) {
    case 'createFolder': rval += ` TODO`; break;
    case 'createNotebook': rval += ` TODO`; break;
    case 'deleteFolder': rval += ` TODO`; break;
    case 'deleteNotebook': rval += ` TODO`; break;
    case 'renameFolder': rval += ` TODO`; break;
    case 'renameNotebook': rval += ` TODO`; break;
    default: assertFalse();
  }
  return rval;
}

export function folderChangeSynopsis(change: FolderChange): string {
  let rval: string = change.type;
  switch(change.type) {
    case 'folderCreated':
      rval += ` ${change.entry.name}`;
      break;
    case 'folderDeleted':
      rval += ` ${change.entry.name}`;
      break;
    case 'folderRenamed':
      rval += ` ${change.oldName}=>${change.entry.name}`;
      break;
    case 'notebookCreated':
      rval += ` ${change.entry.name}`;
      break;
    case 'notebookDeleted':
      rval += ` ${change.entry.name}`;
      break;
    case 'notebookRenamed':
      rval += ` ${change.oldName}=>${change.entry.name}`;
      break;
    default: assertFalse();
  }
  return rval;
}

export function notebookChangeRequestSynopsis(request: NotebookChangeRequest): string {
  let rval: string = request.type;
  switch(request.type) {
    case 'deleteCell': rval += ` C${request.cellId}`; break;
    case 'deleteStroke': rval += ` C${request.cellId} S${request.strokeId}`; break;
    case 'insertCell': rval += ` TBD`; break;
    case 'moveCell': rval += ` C${request.cellId} A${request.afterId}`; break;
    default: assertFalse();
  }
  return rval;
}

export function notebookChangeSynopsis(change: NotebookChange): string {
  let rval: string = change.type;
  switch(change.type) {
    case 'cellDeleted': {
      rval += ` C${change.cellId}`;
      break;
    }
    case 'cellInserted': {
      rval += ` ${cellSynopsis(change.cellObject)}`;
      break;
    }
    case 'cellMoved': {
      rval += ` ${change.cellId} after ${change.afterId} ${change.oldPosition}->${change.newPosition}`;
      break;
    }
    case 'strokeInserted': {
      rval += ` TODO:`;
      break;
    }
    case 'strokeDeleted': {
      rval += ` TODO:`;
      break;
    }
    default: assertFalse();
  }
  return rval;
}

export function notebookSynopsis(notebook: Notebook<any>): string {
  return notebook.topLevelCellOrder()
  .map(cellId=>{
    const cellObject = notebook.getCell(cellId);
    return cellSynopsis(cellObject);
  })
  .join('');
}

export function serverMessageSynopsis(msg: ServerResponse): string {
  let rval = `${msg.requestId?`${msg.requestId} `:''}${msg.type} `;

  switch (msg.type) {
    case 'error': {
      rval += `msg: "${msg.message}"`;
      break;
    }
    case 'folder': {
      rval += FolderResponseSynopsis(msg);
      break;
    }
    case 'notebook': {
      rval += NotebookResponseSynopsis(msg);
      break;
    }
    default: assertFalse();
  }
  if (msg.complete) { rval += ' [complete]' };
  return rval;
}

export function cellSynopsis(cell: CellObject, indentationLevel: number = 0): string {
  return `${indentation(indentationLevel)}C${cell.id} ${cell.type} ${cell.source} TODO: more data depending on type.`;
}

// Helper Functions

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
    default: assertFalse();
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
    default: assertFalse();
  }
  return rval;
}



function indentation(indentationLevel: number): string { return ' '.repeat(indentationLevel*2); }

function FolderResponseSynopsis(msg: FolderResponse): string {
  let rval = `${msg.path} ${msg.operation} `;
  switch(msg.operation) {
    case 'changed':
      for (const change of msg.changes) {
        rval += `${folderChangeSynopsis(change)}; `;
      }
      break;
    case 'closed': rval += ` reason: "${msg.reason}"`; break;
    case 'opened': break;
    default: assertFalse();
  }
  return rval;
}

function NotebookResponseSynopsis(msg: NotebookResponse) {
  let rval = `${msg.path} ${msg.operation} `;
  switch(msg.operation) {
    case 'changed':
      for (const change of msg.changes) {
        rval += `${notebookChangeSynopsis(change)}; `;
      }
      break;
    case 'closed': rval += ` reason: ${msg.reason}`; break;
    case 'opened': break;
    default: assertFalse();
  }
  return rval;
}

