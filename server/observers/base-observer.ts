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
  NotebookChange, StyleObject, FindStyleOptions, styleMatchesPattern, StyleProperties} from '../../client/notebook';
import { NotebookChangeRequest } from '../../client/math-tablet-api';
import { ObserverInstance, ServerNotebook }  from '../server-notebook';
import { Config } from '../config';

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// Types

type StyleTestFunction = (notebook: ServerNotebook, style: StyleObject)=>boolean;

type StyleTest  = FindStyleOptions|StyleTestFunction;

export type Rules = Rule[];

// TYPESCRIPT: AsyncRule vs. SyncRule?
// TYPESCRIPT: ParentRule vs. PeerRule?
interface Rule {
  name: string;   // Rule name for debugging.
  parentStyleTest?: StyleTest;
  peerStyleTest?: StyleTest;
  props: Omit<StyleProperties, "data">;
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
    // IMPORTANT: This code is identical to onChangesSync, except this code has awaits and that code doesn't.
    debug(`onChangesAsync ${this.notebook._path} ${changes.length}`);
    const rval: NotebookChangeRequest[] = [];
    for (const rule of this.rules) {
      // If the rule is asynchronous, then don't bother.
      if (!rule.computeAsync) { continue; }
      // REVIEW: Can we just check rules once, instead of on every set of changes?
      if (rule.parentStyleTest && rule.peerStyleTest) { throw new Error(`Rule has both parent and peer style tests.`); }
      if (!rule.parentStyleTest && !rule.peerStyleTest) { throw new Error(`Rule doesn't have parent or peer style test.`); }

      for (const change of changes) {
        if (!change) { /* REVIEW: Don't allow falsy changes */ continue; }
        const changeRequest = await this.onChangeAsync(rule, change);
        if (changeRequest) { rval.push(changeRequest); }
      }
    }
    debug(`onChangesAsync returning ${rval.length} changes.`);
    return rval;
  }

  public onChangesSync(changes: NotebookChange[]): NotebookChangeRequest[] {
    // IMPORTANT: This code is identical to onChangesAsync, except that code has awaits and this code doesn't.
    debug(`onChangesSync ${changes.length}`);
    const rval: NotebookChangeRequest[] = [];
    for (const rule of this.rules) {
      // If the rule is asynchronous, then don't bother.
      if (!rule.computeSync) { continue; }
      // REVIEW: Can we just check rules once, instead of on every set of changes?
      if (rule.parentStyleTest && rule.peerStyleTest) { throw new Error(`Rule has both parent and peer style tests.`); }
      if (!rule.parentStyleTest && !rule.peerStyleTest) { throw new Error(`Rule doesn't have parent or peer style test.`); }

      for (const change of changes) {
        if (!change) { /* REVIEW: Don't allow falsy changes */ continue; }
        const changeRequest = this.onChangeSync(rule, change);
        if (changeRequest) { rval.push(changeRequest); }
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

  private async onChangeAsync(rule: Rule, change: NotebookChange): Promise<NotebookChangeRequest|undefined> {
    // TODO: 'styleDeleted': if styleInserted resulted in creating a peer style, then styleDeleted should delete that style.
    // TODO: 'styleConverted': should be treated like a style deleted followed by a style inserted.
    // IMPORTANT: This code is identical to onChangeSync, except this code has awaits and that code doesn't.
    if (change.type != 'styleChanged' && change.type != 'styleInserted') { return undefined; }
    const sourceStyle = change.style;
    const styleTest = (rule.parentStyleTest || rule.peerStyleTest)!;
    if (!styleMatchesTest(this.notebook, sourceStyle, styleTest)) { return undefined; }
    const data = await rule.computeAsync!(sourceStyle.data);
    const parentId = (rule.parentStyleTest ? sourceStyle.id: sourceStyle.parentId);
    const targetStyle = (change.type == 'styleChanged' && this.notebook.findStyle({ role: rule.props.role, type: rule.props.type}, parentId));
    let changeRequest: NotebookChangeRequest|undefined = undefined;
    if (data) {
      // Data was produced by the rule.
      // Insert the target style if it doesn't exist, or change the target style's data if it exists.
      if (change.type == 'styleInserted' || (change.type == 'styleChanged' && !targetStyle)) {
        changeRequest = { type: 'insertStyle', parentId, styleProps: { ...rule.props, data } };
      } else {
        changeRequest = { type: 'changeStyle', styleId: (<StyleObject>targetStyle).id, data };
      }
    } else {
      // No data was produced by the rule.
      // Delete the target style if it exists.
      if (targetStyle) { changeRequest = { type: 'deleteStyle', styleId: targetStyle.id }; }
    }
    if (changeRequest) {
      debug(`Rule: ${JSON.stringify(rule)}`);
      debug(`Change: ${JSON.stringify(change)}`);
      debug(`Yields: ${JSON.stringify(changeRequest)}`);
    }
    return changeRequest;
  }

  private onChangeSync(rule: Rule, change: NotebookChange): NotebookChangeRequest|undefined {
    // IMPORTANT: This code is identical to onChangeAsync, except that code has awaits and this code doesn't.
    if (change.type != 'styleChanged' && change.type != 'styleInserted') { return undefined; }
    const sourceStyle = change.style;
    const styleTest = (rule.parentStyleTest || rule.peerStyleTest)!;
    if (!styleMatchesTest(this.notebook, sourceStyle, styleTest)) { return undefined; }
    const data = rule.computeSync!(sourceStyle.data);
    const parentId = (rule.parentStyleTest ? sourceStyle.id: sourceStyle.parentId);
    const targetStyle = (change.type == 'styleChanged' && this.notebook.findStyle({ role: rule.props.role, type: rule.props.type}, parentId));
    let changeRequest: NotebookChangeRequest|undefined = undefined;
    if (data) {
      // Data was produced by the rule.
      // Insert the target style if it doesn't exist, or change the target style's data if it exists.
      if (change.type == 'styleInserted' || (change.type == 'styleChanged' && !targetStyle)) {
        changeRequest = { type: 'insertStyle', parentId, styleProps: { ...rule.props, data } };
      } else {
        changeRequest = { type: 'changeStyle', styleId: (<StyleObject>targetStyle).id, data };
      }
    } else {
      // No data was produced by the rule.
      // Delete the target style if it exists.
      if (targetStyle) { changeRequest = { type: 'deleteStyle', styleId: targetStyle.id }; }
    }
    if (changeRequest) {
      debug(`Rule: ${JSON.stringify(rule)}`);
      debug(`Change: ${JSON.stringify(change)}`);
      debug(`Yields: ${JSON.stringify(changeRequest)}`);
    }
    return changeRequest;
  }

}

// Helper Functions

function styleMatchesTest(notebook: ServerNotebook, style: StyleObject, test: StyleTest): boolean {
  return (typeof test == 'function' ? test(notebook, style) : styleMatchesPattern(style, test));
}