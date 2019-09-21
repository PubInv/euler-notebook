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

import { NotebookChange } from '../../client/notebook';
import { Tracker } from '../../client/math-tablet-api';
import { ServerNotebook } from '../server-notebook';
import { ClientSocket } from '../client-socket';

// Exported Class

export class ClientObserver {

  // Class Methods

  public static open(notebook: ServerNotebook, clientSocket: ClientSocket): ClientObserver {
    const instance = new this(notebook, clientSocket);
    const clientId = clientSocket.id;
    notebook.registerClientObserver(clientId, instance);
    return instance;
  }

  // Class Event Handlers

  // Instance Properties

  public clientSocket: ClientSocket;
  public notebook: ServerNotebook;

  // Instance Methods

  public close() {
    this.notebook.deregisterClientObserver(this.clientSocket.id);
  }

  // Event Handlers

  public onChanges(changes: NotebookChange[], complete: boolean, tracker?: Tracker): void {
    debug(`onChanges ${changes.length}`);
    this.clientSocket.notebookChanged(this.notebook, changes, complete, tracker);
  }

  public onClose(): void {
    debug(`onClose ${this.notebook._path}`);
    this.clientSocket.close(/* REVIEW: code? reason? */);
    delete this.notebook;
  }

  // --- PRIVATE ---

  private constructor(notebook: ServerNotebook, clientSocket: ClientSocket) {
    this.notebook = notebook;
    this.clientSocket = clientSocket;
  }

}
