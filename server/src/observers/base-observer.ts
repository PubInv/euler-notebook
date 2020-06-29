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
  NotebookChange, StyleObject, FindStyleOptions, styleMatchesPattern, StyleProperties, StyleId} from '../shared/notebook';
import { NotebookChangeRequest } from '../shared/math-tablet-api';
import { ObserverInstance, ServerNotebook }  from '../server-notebook';
import { Config } from '../config';
import { ServerKeys } from '../myscript-batch-api';

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// Types

export enum StyleRelation {
  ChildToParent = 0,
  ParentToChild = 1,
  PeerToPeer = 2,
}

type StyleTestFunction = (notebook: ServerNotebook, style: StyleObject)=>boolean;

type StyleTest  = FindStyleOptions|StyleTestFunction;

export type Rules = Rule[];

type Rule = AsyncRule | SyncRule
interface BaseRule {
  exclusiveChildTypeAndRole?: boolean;
  name: string;   // Rule name for debugging.
  styleTest: StyleTest;
  styleRelation: StyleRelation;
  props: Omit<StyleProperties, "data">;
}
interface AsyncRule extends BaseRule {
  computeAsync: (parentData: /* TYPESCRIPT: */any)=>Promise</* TYPESCRIPT: */any|undefined>;
}
interface SyncRule extends BaseRule {
  computeSync: (parentData: /* TYPESCRIPT: */any)=>/* TYPESCRIPT: */any|undefined;
}

// Exported Class

export abstract class BaseObserver implements ObserverInstance {

  // --- ABSTRACT/OVERRIDABLE ---

  protected abstract get rules(): Rules;

  // --- PUBLIC ---

  // Class Properties

  // Class Methods

  public static async initialize(_config: Config, _keys: ServerKeys): Promise<void> {
    debug(`initialize`);
  }

  // Instance Methods

  public async onChangesAsync(changes: NotebookChange[]): Promise<NotebookChangeRequest[]> {
    // IMPORTANT: This code is identical to onChangesSync, except this code has awaits and that code doesn't.
    const rval: NotebookChangeRequest[] = [];
    for (const change of changes) {
      if (!change) { /* REVIEW: Don't allow falsy changes */ continue; }
      for (const rule of this.rules) {
        // If the rule is asynchronous, then don't bother.
        // TODO: separate list of sync rules from async rules.
        if (!isAsyncRule(rule)) { continue; }
        const changeRequest = await this.onChangeAsync(rule, change);
        if (changeRequest) { rval.push(changeRequest); }
      }
    }
    return rval;
  }

  public onChangesSync(changes: NotebookChange[]): NotebookChangeRequest[] {
    // IMPORTANT: This code is identical to onChangesAsync, except that code has awaits and this code doesn't.
    const rval: NotebookChangeRequest[] = [];
    for (const change of changes) {
      if (!change) { /* REVIEW: Don't allow falsy changes */ continue; }
      for (const rule of this.rules) {
        // If the rule is asynchronous, then don't bother.
        if (isAsyncRule(rule)) { continue; }
        const changeRequest = this.onChangeSync(rule, change);
        if (changeRequest) { rval.push(changeRequest); }
      }
    }
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

  private async onChangeAsync(rule: AsyncRule, change: NotebookChange): Promise<NotebookChangeRequest|undefined> {
    // IMPORTANT: This code is identical to onChangeSync, except this code has awaits and that code doesn't.
    const inputData = this.preChange(rule, change);
    if (typeof inputData == 'undefined') { return undefined; }
    // TODO: The function in the rule should be an instance method, not a class method.
    //       See how it is done in the dataflow-observer base class.
    const outputData = await rule.computeAsync!.call(this.constructor, inputData);
    return this.postChange(rule, change, outputData);
  }

  private onChangeSync(rule: SyncRule, change: NotebookChange): NotebookChangeRequest|undefined {
    // IMPORTANT: This code is identical to onChangeAsync, except that code has awaits and this code doesn't.
    const inputData = this.preChange(rule, change);
    if (typeof inputData == 'undefined') { return undefined; }
    const outputData = rule.computeSync!.call(this.constructor, inputData);
    return this.postChange(rule, change, outputData);
  }

  private preChange(rule: Rule, change: NotebookChange): any|undefined {
    switch(change.type) {
      case 'styleChanged':
      case 'styleInserted':
        if (styleMatchesRuleTest(this.notebook, change.style, rule.styleTest)) { return change.style.data; }
        else { return undefined; }
      default:
        // TODO: 'styleDeleted': if styleInserted resulted in creating a peer style, then styleDeleted should delete that style.
        // TODO: 'styleConverted': should be treated like a style deleted followed by a style inserted.
        return undefined;
    }
  }

  private postChange(rule: Rule, change: NotebookChange, data: any): NotebookChangeRequest|undefined {

    if (change.type != 'styleChanged' && change.type != 'styleInserted') { throw new Error('Unexpected.'); }

    let parentId: StyleId|undefined;
    let targetStyle: StyleObject|undefined|false;
    switch (rule.styleRelation) {
      case StyleRelation.ChildToParent:
        parentId = undefined;
        targetStyle = this.notebook.getStyle(change.style.parentId);
        // TODO: Verify parent matches rule.props?
        break;
      case StyleRelation.ParentToChild:
        parentId = change.style.id;
        targetStyle = this.notebook.findStyle({ role: rule.props.role, subrole: rule.props.subrole, type: rule.props.type}, parentId);
        break;
      case StyleRelation.PeerToPeer:
        parentId = change.style.parentId;
        targetStyle = this.notebook.findStyle({ role: rule.props.role, subrole: rule.props.subrole, type: rule.props.type}, parentId);
        break;
    }

    let changeRequest: NotebookChangeRequest|undefined = undefined;
    if (typeof data != 'undefined') {
      // Data was produced by the rule.
      // Change the target style if it exists, otherwise create the target style.
      if (targetStyle) {
        // Only change the target style if the data actually changed.
        // TODO: We should do a deep compare here.
        if (data !== targetStyle.data) {
          changeRequest = { type: 'changeStyle', styleId: targetStyle.id, data };
        }
      } else {
        changeRequest = { type: 'insertStyle', parentId, styleProps: { ...rule.props, data, exclusiveChildTypeAndRole: rule.exclusiveChildTypeAndRole } };
      }
    } else {
      // No data was produced by the rule.
      // Delete the target style if it exists.
      if (targetStyle && parentId) { changeRequest = { type: 'deleteStyle', styleId: targetStyle.id }; }
    }

    if (changeRequest) {
      debug(`Rule ${this.constructor.name}/${rule.name}\n  Applied to ${JSON.stringify(change)}\n  yields ${JSON.stringify(changeRequest)}`);
    } else {
      debug(`Rule ${this.constructor.name}/${rule.name}\n  Applied to ${JSON.stringify(change)}\n  yields no change.`);
    }
    return changeRequest;
  }

}

// Helper Functions

function isAsyncRule(rule: Rule): rule is AsyncRule {
  return rule.hasOwnProperty('computeAsync');
}

function styleMatchesRuleTest(notebook: ServerNotebook, style: StyleObject, test: StyleTest): boolean {
  return (typeof test == 'function' ? test(notebook, style) : styleMatchesPattern(style, test));
}