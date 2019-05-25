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

// This file is a place to put experimental observer functionality on a temporary basis.

// Requirements

import * as debug1 from 'debug';
const MODULE = __filename.split('/').slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

import { NotebookChange, StyleProperties, ToolMenu, ThoughtId, StyleSource, ToolInfo } from '../../client/math-tablet-api';
import { TDoc  } from '../tdoc';
import { Config } from '../config';

// Exports

export async function initialize(_config: Config): Promise<void> {
  debug(`initializing`);
  TDoc.on('open', (tDoc: TDoc)=>{
    tDoc.on('change', function(this: TDoc, change: NotebookChange){ onChange(this, change); });
    tDoc.on('close', function(this: TDoc){ onClose(this); });
    tDoc.on('useTool', function(this: TDoc, thoughtId: ThoughtId, source: StyleSource, info: ToolInfo){ onUseTool(this, thoughtId, source, info); })
    onOpen(tDoc);
  });
}

// Event Handlers

function onChange(tDoc: TDoc, change: NotebookChange): void {
  debug(`tDoc change: ${tDoc._path} ${change.type}`);
  switch(change.type) {
    case 'relationshipDeleted': {
      break;
    }
    case 'relationshipInserted': {
      break;
    }
    case 'styleDeleted': {
      break;
    }
    case 'styleInserted': {
      break;
    }
    case 'thoughtInserted': {
      const thought = change.thought;
      const toolMenu: ToolMenu = [
        { name: 'plot', html: "Plot" },
        { name: 'debug', html: "Debug" },
      ]
      const styleProps: StyleProperties = {
        type: 'TOOL-MENU',
        meaning: 'ATTRIBUTE',
        source: 'SANDBOX',
        data: toolMenu,
      }
      tDoc.insertStyle(thought, styleProps);
      break;
    }
    case 'thoughtDeleted': {
      break;
    }
    default: {
      break;
    }
  }
}

function onClose(tDoc: TDoc): void {
  debug(`tDoc close: ${tDoc._path}`);
}

function onOpen(tDoc: TDoc): void {
  debug(`tDoc open: ${tDoc._path}`);
}
 
function onUseTool(tDoc: TDoc, thoughtId: ThoughtId, source: StyleSource, info: ToolInfo): void {
  if (source != 'SANDBOX') { return; }
  debug(`tDoc use tool: ${tDoc._path} ${thoughtId} ${source} ${JSON.stringify(info)}`)
}