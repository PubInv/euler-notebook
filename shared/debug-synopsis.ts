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

import { assertFalse } from './common';
import { FolderChange } from './folder';
import { Notebook, NotebookChange, StyleObject } from './notebook';
import {
  ClientFolderMessage, ClientMessage, ClientNotebookMessage, FolderChangeRequest, NotebookChangeRequest,
  ServerFolderMessage, ServerMessage, ServerNotebookMessage,
} from './math-tablet-api';

// Exported Functions

export function clientMessageSynopsis(msg: ClientMessage): string {
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
    case 'changeStyle': rval += ` S${request.styleId} ${dataSynopsis(request.data)}`; break;
    case 'convertStyle': rval += ` TBD`; break;
    case 'deleteStyle': rval += ` S${request.styleId}`; break;
    case 'insertStyle': rval += ` TBD`; break;
    case 'moveStyle': rval += ` TBD`; break;
    default: assertFalse();
  }
  return rval;
}

export function notebookChangeSynopsis(change: NotebookChange): string {
  let rval: string = change.type;
  switch(change.type) {
    case 'styleChanged': {
      rval += ` ${styleSynopsis(change.style)}`;
      break;
    }
    case 'styleConverted': {
      rval += ` ${change.styleId}`;
      if (change.role) { rval += ` role->${change.role}`}
      if (change.subrole) { rval += ` subrole->${change.subrole}`}
      if (change.styleType) { rval += ` type->${change.styleType}`}
      if (change.data) { rval += ` data->${dataSynopsis(change.data)}`; }
      break;
    }
    case 'styleDeleted': {
      rval += ` ${styleSynopsis(change.style)}`;
      break;
    }
    case 'styleInserted': {
      rval += ` ${styleSynopsis(change.style)}`;
      break;
    }
    case 'styleMoved': {
      rval += ` ${change.styleId} after ${change.afterId} ${change.oldPosition}->${change.newPosition}`;
      break;
    }
    default: assertFalse();
  }
  return rval;
}

export function notebookSynopsis(notebook: Notebook<any>): string {
  return notebook.topLevelStyleOrder()
  .map(styleId=>{
    const style = notebook.getStyle(styleId);
    return styleSynopsisRecursive(notebook, style);
  })
  .join('');
}

export function serverMessageSynopsis(msg: ServerMessage): string {
  let rval = `${msg.requestId?`${msg.requestId} `:''}${msg.type} `;

  switch (msg.type) {
    case 'error': {
      rval += `msg: "${msg.message}"`;
      break;
    }
    case 'folder': {
      rval += serverFolderMessageSynopsis(msg);
      break;
    }
    case 'notebook': {
      rval += serverNotebookMessageSynopsis(msg);
      break;
    }
    default: assertFalse();
  }
  if (msg.complete) { rval += ' [complete]' };
  return rval;
}

export function styleSynopsis(s: StyleObject, indentationLevel: number = 0): string {
  return `${indentation(indentationLevel)}S${s.parentId?`${s.parentId}.`:''}${s.id} ${s.source} ${s.role}${s.subrole?`|${s.subrole}`:''} ${s.type} ${dataSynopsis(s.data)}`;
}

// Helper Functions

function clientFolderMessageSynopsis(msg: ClientFolderMessage): string {
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

function clientNotebookMessageSynopsis(msg: ClientNotebookMessage): string {
  let rval = `${msg.path} ${msg.operation}`;
  switch(msg.operation) {
    case 'change':
      for (const request of msg.changeRequests) {
        rval += ` ${notebookChangeRequestSynopsis(request)};`;
      }
      break;
    case 'close': break;
    case 'open': break;
    case 'useTool': rval += `style ${msg.styleId}`; break;
    default: assertFalse();
  }
  return rval;
}


function dataSynopsis(data: any): string {
  if (typeof data == 'undefined') {
    return 'undefined';
  } else {
    const json: string = JSON.stringify(data);
    const abbreviatedJson = json.length<31 ? json : `${json.substr(0,30)}...`;
    return `${abbreviatedJson}`;
  }
}

function indentation(indentationLevel: number): string { return ' '.repeat(indentationLevel*2); }

function serverFolderMessageSynopsis(msg: ServerFolderMessage): string {
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

function serverNotebookMessageSynopsis(msg: ServerNotebookMessage): string {
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

function styleSynopsisRecursive(notebook: Notebook<any>, style: StyleObject, indentationLevel: number = 0): string {
  // TODO: This is very inefficient as notebook.childStylesOf goes through *all* styles.
  const childStyleObjects = Array.from(notebook.childStylesOf(style.id));
  let rval = `${styleSynopsis(style, indentationLevel)}\n`;
  for (const childStyle of childStyleObjects) {
    rval += styleSynopsisRecursive(notebook, childStyle, indentationLevel+1)
  }
  return rval;
}

