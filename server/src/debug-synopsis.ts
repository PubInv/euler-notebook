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

import { assertFalse } from './shared/common';
import { NotebookChange, RelationshipObject, StyleObject } from './shared/notebook';

import { ServerNotebook } from './server-notebook';
import { NotebookChangeRequest } from './shared/math-tablet-api';

// Exported Functions

export function notebookChangeRequestSynopsis(request: NotebookChangeRequest): string {
  let rval: string;
  switch(request.type) {
    case 'changeStyle': {
      rval = `${request.type} S${request.styleId} ${dataSynopsis(request.data)}`;
      break;
    }
    case 'convertStyle': {
      rval = `${request.type} TBD`;
      break;
    }
    case 'deleteRelationship': {
      rval = `${request.type} R${request.id}`;
      break;
    }
    case 'deleteStyle': {
      rval = `${request.type} S${request.styleId}`;
      break;
    }
    case 'insertRelationship': {
      rval = `${request.type} ${request.type} ${request.fromId}->${request.toId} TBD: request.props`;
      break;
    }
    case 'insertStyle': {
      rval = `${request.type} TBD`;
      break;
    }
    case 'moveStyle': {
      rval = `${request.type} TBD`;
      break;
    }
  }
  return rval;
}

export function notebookChangeSynopsis(change: NotebookChange): string {
  let rval: string;
  switch(change.type) {
    case 'relationshipDeleted': {
      rval = `${change.type} ${relationshipSynopsis(change.relationship)}`;
      break;
    }
    case 'relationshipInserted': {
      rval = `${change.type} ${relationshipSynopsis(change.relationship)}`;
      break;
    }
    case 'styleChanged': {
      rval = `${change.type} ${styleSynopsis(change.style)}`;
      break;
    }
    case 'styleConverted': {
      rval = `${change.type} ${change.styleId}`;
      if (change.role) { rval += ` role->${change.role}`}
      if (change.subrole) { rval += ` subrole->${change.subrole}`}
      if (change.styleType) { rval += ` type->${change.styleType}`}
      if (change.data) { rval += ` data->${dataSynopsis(change.data)}`; }
      break;
    }
    case 'styleDeleted': {
      rval = `${change.type} ${styleSynopsis(change.style)}`;
      break;
    }
    case 'styleInserted': {
      rval = `${change.type} ${styleSynopsis(change.style)}`;
      break;
    }
    case 'styleMoved': {
      rval = `${change.type} ${change.styleId} after ${change.afterId} ${change.oldPosition}->${change.newPosition}`;
      break;
    }
    default: assertFalse();
  }
  return rval;
}

export function notebookSynopsis(notebook: ServerNotebook): string {
  return notebook.topLevelStyleOrder()
  .map(styleId=>{
    const style = notebook.getStyle(styleId);
    return styleSynopsisRecursive(notebook, style);
  })
  .join('');
}

// Helper Functions

function dataSynopsis(data: any): string {
  const json: string = JSON.stringify(data);
  const abbreviatedJson = json.length<31 ? json : `${json.substr(0,30)}...`;
  return `${abbreviatedJson}`;
}

function indentation(indentationLevel: number): string { return ' '.repeat(indentationLevel*2); }

function relationshipSynopsis(r: RelationshipObject, indentationLevel: number = 0): string {
  return `${indentation(indentationLevel)}R${r.id} ${r.source} ${r.role} ${r.fromId}->${r.toId} ${dataSynopsis(r.data)}`;
}

function styleSynopsis(s: StyleObject, indentationLevel: number = 0): string {
  return `${indentation(indentationLevel)}S${s.parentId?`${s.parentId}.`:''}${s.id} ${s.source} ${s.role}${s.subrole?`|${s.subrole}`:''} ${s.type} ${dataSynopsis(s.data)}`;
}

function styleSynopsisRecursive(notebook: ServerNotebook, style: StyleObject, indentationLevel: number = 0): string {
  // TODO: This is very inefficient as notebook.childStylesOf goes through *all* styles.
  const childStyleObjects = Array.from(notebook.childStylesOf(style.id));
  // TODO: This is very inefficient as notebook.relationshipOf goes through *all* relationships.
  const relationshipObjects = Array.from(notebook.relationshipsOf(style.id));
  let rval = `${styleSynopsis(style, indentationLevel)}\n`;
  for (const childStyle of childStyleObjects) {
    rval += styleSynopsisRecursive(notebook, childStyle, indentationLevel+1)
  }
  for (const relationship of relationshipObjects) {
    rval += relationshipSynopsis(relationship, indentationLevel+1);
  }
  return rval;
}

