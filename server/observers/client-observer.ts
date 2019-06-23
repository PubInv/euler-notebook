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
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

import { NotebookChange, NotebookChangeRequest, StyleObject } from '../../client/math-tablet-api';
import { ServerNotebook, ObserverInstance  } from '../server-notebook';
import { Config } from '../config';
import { ClientSocket } from '../client-socket';

// Exported Class

export class ClientObserver implements ObserverInstance {

  // Class Methods

  public static async initialize(_config: Config): Promise<void> {
    debug(`initialize`);
  }

  public static open(notebook: ServerNotebook, clientSocket: ClientSocket): ClientObserver {
    const rval = new this(notebook, clientSocket);
    // REVIEW: Should the observer be called 'CLIENT' instead of 'USER'?
    // REVIEW: const clientId = clientSocket.id;
    notebook.registerObserver('USER', rval);
    return rval;
  }

  // Class Event Handlers

  // REVIEW: Have a "read-only" notebook that only lets you read but not make any changes?
  //         This would enforce all changes being made through the observer interfaces
  //         rather than directly on the notebook.
  public static async onOpen(notebook: ServerNotebook): Promise<ObserverInstance> {
    // This should never happen because our class isn't registered with the ServerNotebook class.
    // Instead we register a client observer instance with each notebook instance.
    throw new Error(`Unexpected onOpen event in client observer: notebook ${notebook._path}.`);
  }

  // Instance Properties

  public clientSocket: ClientSocket;
  public notebook: ServerNotebook;

  // Instance Methods

  public async close() {
    // TODO: Deregister observer with ServerNotebook.
  }

  // Event Handlers

  public async onChanges(changes: NotebookChange[]): Promise<NotebookChangeRequest[]> {
    debug(`onChanges ${changes.length}`);
    this.clientSocket.notebookChanged(this.notebook, changes);
    return [];
  }

  public async onClose(): Promise<void> {
    debug(`onClose ${this.notebook._path}`);
    this.clientSocket.close(/* REVIEW: code? reason? */);
    delete this.notebook;
  }

  public async useTool(_style: StyleObject): Promise<NotebookChangeRequest[]> {
    throw new Error(`useTool on client-observer unexpected.`);
  }

  // --- PRIVATE ---

  private constructor(notebook: ServerNotebook, clientSocket: ClientSocket) {
    this.notebook = notebook;
    this.clientSocket = clientSocket;
  }

}
