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

// Requirements

import * as debug1 from 'debug';
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

import { NotebookChange, StyleObject, StyleMoved } from '../../client/notebook';
import { NotebookChangeRequest, StyleMoveRequest } from '../../client/math-tablet-api';
import { ObserverInstance, ServerNotebook }  from '../server-notebook';
import { Config } from '../config';

// Exported Class

export class AnyInputObserver implements ObserverInstance {

  // Class Methods

  public static async initialize(_config: Config): Promise<void> {
    debug(`initialize`);
  }

  public static async onOpen(notebook: ServerNotebook): Promise<ObserverInstance> {
    debug(`onOpen`);
    return new this(notebook);
  }

  // Instance Methods

  public async onChangesAsync(_changes: NotebookChange[]): Promise<NotebookChangeRequest[]> {
    return [];
  }

  public onChangesSync(changes: NotebookChange[]): NotebookChangeRequest[] {
    debug(`onChanges ${changes.length}`);
    const rval: NotebookChangeRequest[] = [];
    for (const change of changes) {
      this.onChange(change, rval);
    }
    debug(`onChanges returning ${rval.length} changes.`);
    return rval;
  }

  // TODO: can't these be inherited?
  public async onClose(): Promise<void> {
    debug(`onClose ${this.notebook._path}`);
    delete this.notebook;
  }

  public async useTool(style: StyleObject): Promise<NotebookChangeRequest[]> {
    debug(`useTool ${this.notebook._path} ${style.id}`);
    return [];
  }

  // --- PRIVATE ---

  // Private Constructor

  private constructor(notebook: ServerNotebook) {
    this.notebook = notebook;
  }

  // Private Instance Properties

  private notebook: ServerNotebook;

  // Private Instance Methods

  private onChange(change: NotebookChange|undefined, rval: NotebookChangeRequest[]): void {
    // REVIEW; Don't allow null/undefined changes.
    if (!change) { return; }
    debug(`onChange ${this.notebook._path} ${change.type}`);
    switch (change.type) {
      case 'styleMoved': this.chStyleMoved(change, rval); break;
      default: break;
    }
  }

  // This is a simple observer; we have observers for "types" that are associated
  // with the "meaning" input. However, independent of the input type, if you
  // move an input (that is, a cell, of which input is the top level thought
  // type in most cases by our principle of "human actions creates thoughts,
  // observers create styles", then there is a small amount of processing to do:
  // although it ONLY changes the style order, that is still a move of children.
  // So the idea of this function is to pass the StyleMoveRequest to relevant
  // children. In fact, the only releveant children are those that have a
  // use or depdendency relationship connected to them. So in practice
  // we go through all children, if pass "styleMoved" to SYMBOL-DEFINITION
  // and SYMBOL-USE styles.
  private chStyleMoved(change: StyleMoved, rval: NotebookChangeRequest[]): void {
    const style = this.notebook.getStyle(change.styleId);

    if (style.role == 'FORMULA') {

      // We may have at most one SYMOBL-DEFINTION style, and a set of
      // SYMBOL-USES styles. These need to be sent a "move" change Request.
      // REVIEW: Does this search need to be recursive?
      const children = this.notebook.findStyles({ type: 'SYMBOL-DATA', recursive: true }, style.id );
      children.forEach(
        k => {
            const changeReq: StyleMoveRequest = {
              type: 'moveStyle',
              styleId: k.id,
              afterId: change.afterId
            }
            rval.push(changeReq);
          }
      );
      debug("any-input has added moves:",rval);
    }
  }
}
