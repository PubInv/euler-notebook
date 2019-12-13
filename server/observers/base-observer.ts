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
import {
  NotebookChange, StyleObject, StyleRole, FindStyleOptions, StyleType,
  styleMatchesPattern, StyleProperties
} from '../../client/notebook';
import { NotebookChangeRequest } from '../../client/math-tablet-api';
import { ObserverInstance, ServerNotebook }  from '../server-notebook';
import { Config } from '../config';

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// Types

type StyleTestFunction = (notebook: ServerNotebook, style: StyleObject)=>boolean;

type StyleTest  = FindStyleOptions|StyleTestFunction;

export type Rules = Rule[];

interface Rule {
  name: string;   // Rule name for debugging.
  parentStyleTest: StyleTest;
  role: StyleRole;
  type: StyleType;
  computeSync?: (parentData: /* TYPESCRIPT: */any)=>/* TYPESCRIPT: */any|undefined;
  computeAsync?: (parentData: /* TYPESCRIPT: */any)=>Promise</* TYPESCRIPT: */any|undefined>;
}

// Exported Class

export abstract class BaseObserver implements ObserverInstance {

  // --- ABSTRACT/OVERRIDABLE ---

  protected abstract get rules(): Rules;

  // --- PUBLIC ---

  // Class Properties

  // Class Methods

  public static async initialize(_config: Config): Promise<void> {
    debug(`initialize`);
  }

  // public static async onOpen(notebook: ServerNotebook): Promise<ObserverInstance> {
  //   debug(`onOpen`);
  //   return new this(notebook);
  // }

  // Instance Methods

  public async onChangesAsync(changes: NotebookChange[]): Promise<NotebookChangeRequest[]> {
    // IMPORTANT: This code parallels code in onChangesSync, with the major difference that
    //            we do not have an await on the synchronous compute function.
    //            If you change this code, then you probably need to change onChangesSync.
    debug(`onChangesAsync ${this.notebook._path} ${changes.length}`);
    const rval: NotebookChangeRequest[] = [];
    for (const rule of this.rules) {
      // If the rule is asynchronous, then don't bother.
      if (!rule.computeAsync) { continue; }
      debug(`Evaluating async rule ${rule.name}.`);
      for (const change of changes) {
        if (!change) { /* REVIEW: Don't allow falsy changes */ continue; }
        if (change.type != 'styleChanged' && change.type != 'styleInserted') { continue; }
        debug(`Processing change: `, change);
        const style = change.style;
        if (!styleMatchesTest(this.notebook, style, rule.parentStyleTest)) { break; }
        const data = await rule.computeAsync(style.data);
        const substyle = (change.type == 'styleChanged' && this.notebook.findStyle({ role: rule.role, type: rule.type}, style.id));
        let changeRequest: NotebookChangeRequest|undefined;
        if (data) {
          // Child data was produced.
          if (change.type == 'styleInserted' || (change.type == 'styleChanged' && !substyle)) {
            // The substyle doesn't exist, so add it.
            const styleProps: StyleProperties = { role: rule.role, type: rule.type, data }
            changeRequest = { type: 'insertStyle', parentId: style.id, styleProps };
          } else {
            // The substyle exists, so change it.
            changeRequest = { type: 'changeStyle', styleId: (<StyleObject>substyle).id, data };
          }
        } else {
          // No child data was produced. Based on the input, the observer has determined that a substyle should
          // not exist.
          if (substyle) {
            // Delete the existing substyle..
            changeRequest = { type: 'deleteStyle', styleId: substyle.id };
          } else {
            // No substyle, no problem! Nothing to do.
            changeRequest = undefined;
          }
        }
        if (changeRequest) {
          debug(`Generated change request: `, changeRequest);
          rval.push(changeRequest);
        }
      }
    }
    debug(`onChangesAsync returning ${rval.length} changes.`);
    return rval;
  }

  public onChangesSync(changes: NotebookChange[]): NotebookChangeRequest[] {
    // IMPORTANT: This code parallels code in onChangesAsync, with the major difference that
    //            we have an await on the asynchronous compute function.
    //            If you change this code, then you probably need to change onChangesAsync.
    debug(`onChangesSync ${changes.length}`);
    const rval: NotebookChangeRequest[] = [];
    for (const rule of this.rules) {
      // If the rule is asynchronous, then don't bother.
      if (!rule.computeSync) { continue; }
      debug(`Evaluating sync rule ${rule.name}.`);
      for (const change of changes) {
        if (!change) { /* REVIEW: Don't allow falsy changes */ continue; }
        if (change.type != 'styleChanged' && change.type != 'styleInserted') { continue; }
        debug(`onChangeSync ${this.notebook._path} ${change.type}`);
        const style = change.style;
        if (!styleMatchesTest(this.notebook, style, rule.parentStyleTest)) { break; }
        const data = rule.computeSync(style.data);
        const substyle = (change.type == 'styleChanged' && this.notebook.findStyle({ role: rule.role, type: rule.type}, style.id));
        let changeRequest: NotebookChangeRequest|undefined;
        if (data) {
          // Child data was produced.
          if (change.type == 'styleInserted' || (change.type == 'styleChanged' && !substyle)) {
            // The substyle doesn't exist, so add it.
            const styleProps: StyleProperties = { role: rule.role, type: rule.type, data }
            changeRequest = { type: 'insertStyle', parentId: style.id, styleProps };
          } else {
            // The substyle exists, so change it.
            changeRequest = { type: 'changeStyle', styleId: (<StyleObject>substyle).id, data };
          }
        } else {
          // No child data was produced. Based on the input, the observer has determined that a substyle should
          // not exist.
          if (substyle) {
            // Delete the existing substyle..
            changeRequest = { type: 'deleteStyle', styleId: substyle.id };
          } else {
            // No substyle, no problem! Nothing to do.
            changeRequest = undefined;
          }
        }
        if (changeRequest) { rval.push(changeRequest);}
      }
    }
    debug(`onChangesSync returning ${rval.length} changes.`);
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

  protected constructor(notebook: ServerNotebook) {
    this.notebook = notebook;
  }

  // Private Instance Properties

  protected notebook: ServerNotebook;

  // Private Instance Methods

}

// Helper Functions

function styleMatchesTest(notebook: ServerNotebook, style: StyleObject, test: StyleTest): boolean {
  return (typeof test == 'function' ? test(notebook, style) : styleMatchesPattern(style, test));
}