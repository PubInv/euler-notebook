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

// TODO: Merge this with base-observer for a single high-level observer base class that deals with
//       style rules and relationship rules.

// Requirements

import * as debug1 from 'debug';
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

import { assert } from '../shared/common';
import { NotebookChange, StyleObject, RelationshipObject, RelationshipRole } from '../shared/notebook';
import { NotebookChangeRequest, StyleChangeRequest } from '../shared/math-tablet-api';
import { ServerNotebook, ObserverInstance  } from '../server-notebook';
import { Config } from '../config';

// Types

export enum DataflowStatus {
  Invalid = -1,
  Unchanged = 0,
  Changed = 1,
}

export interface DataflowValue {
  status: DataflowStatus;
  message?: string;   // If status is DataflowStatus.Invalid
  value?: any;        // If status is DataflowStatus.Changed (or DataflowStatus.Unchanged on input values)
}

export type DataflowAsyncFunction = (relationship: RelationshipObject, inputValues: DataflowValue[]) => Promise<DataflowValue[]>;
export type DataflowSyncFunction = (relationship: RelationshipObject, inputValues: DataflowValue[]) => DataflowValue[];

export type Rules = Rule[];

type Rule = AsyncRule | SyncRule;
interface BaseRule {
  name: string;                             // Rule name for debugging.
  relationshipRole: RelationshipRole;       // Relationships with this role trigger this rule.
}
interface AsyncRule extends BaseRule {
  computeAsync: DataflowAsyncFunction;
}
interface SyncRule extends BaseRule {
  computeSync: DataflowSyncFunction;
}

// Exported Class

export abstract class DataflowObserver implements ObserverInstance {

  // --- ABSTRACT/OVERRIDABLE ---

  protected abstract get rules(): Rules;

  // Class Methods

  public static async initialize(_config: Config): Promise<void> {
    debug(`initialize`);
  }

  // Instance Methods

  public async onChangesAsync(changes: NotebookChange[]): Promise<NotebookChangeRequest[]> {
    debug(`async changes: ${changes.length} changes`);
    const rval: NotebookChangeRequest[] = [];

    // Identify all of the styles that have changed,
    // and the relationships associated with those styles.
    const rules = this.rules;
    for (const change of changes) {
      switch(change.type) {
        case 'styleChanged': {
          const style = change.style;
          const relationships = this.notebook.findRelationships({ fromId: style.id, dataflow: true });
          debug(` styleChanged ${style.id}: ${relationships.length} relationships.`);
          for (const relationship of relationships) {
            debug(`  relationship ${relationship.role}`);
            for (const rule of rules) {
              debug(`   rule ${rule.name} ${rule.relationshipRole}`);
              // TODO: Separate the async rule list from the sync rule list so we don't have to iterate through irrelevant rules.
              if (!isAsyncRule(rule)) { continue; }
              if (relationshipMatchesRule(relationship, rule)) {

                // Assemble the input dataflow values to the relationship.
                const inStyles = relationship.inStyles;
                const inputValues = new Array<DataflowValue>(inStyles.length);
                for (let i=0; i<inStyles.length; i++) {
                  // TODO: In the change set, multiple styles could have changed,
                  //       including one of the other style inputs to this relationship
                  //       in which case we should mark that as "Changed" too.
                  const inStyle = inStyles[i];
                  let status: DataflowStatus = ( inStyle.id == style.id ? DataflowStatus.Changed : DataflowStatus.Unchanged);
                  const inputStyle = this.notebook.getStyle(inStyle.id);
                  const value = inputStyle.data;
                  inputValues[i] = { status, value };
                }

                // Call the rule function
                const outputValues = await rule.computeAsync.call(this, relationship, inputValues);

                // Create change requests from the output values.
                const outStyles = relationship.outStyles;
                assert(outputValues.length == outStyles.length);
                for (let i=0; i<outStyles.length; i++) {
                  const outStyle = outStyles[i];
                  const outputValue = outputValues[i];
                  switch(outputValue.status) {
                    case DataflowStatus.Changed: {
                      const request: StyleChangeRequest = {
                        type: 'changeStyle',
                        styleId: outStyle.id,
                        data: outputValue.value,
                      }
                      rval.push(request);
                      break;
                    }
                    case DataflowStatus.Unchanged:
                      // Nothing to do.
                      break;
                    case DataflowStatus.Invalid:
                      // TODO:
                      break;
                  }
                }
              }
            }
          }
          break;
        }
        default:
          // debug(` Ignoring ${change.type}: ${JSON.stringify(change)}`);
          break;
      }
    }
    debug(`async changes result in ${rval.length} change requests: ${JSON.stringify(rval)}`);
    return rval;
  }

  public onChangesSync(_changes: NotebookChange[]): NotebookChangeRequest[] {
    // TODO: Sync version of onChangesAsync.
    return [];
  }

  public async onClose(): Promise<void> {
    debug(`onClose ${this.notebook.path}`);
    delete this.notebook;
  }

  public async useTool(_style: StyleObject): Promise<NotebookChangeRequest[]> {
    throw new Error("Unexpected useTool request for dataflow-observer.");
  }

  // --- PRIVATE ---

  // Private Constructor

  protected constructor(notebook: ServerNotebook) {
    this.notebook = notebook;
  }

  // Private Instance Properties

  private notebook: ServerNotebook;

  // Private Instance Methods

}

// Helper Functions

function relationshipMatchesRule(relationship: RelationshipObject, rule: Rule): boolean {
  return relationship.role == rule.relationshipRole;
}

function isAsyncRule(rule: Rule): rule is AsyncRule {
  return rule.hasOwnProperty('computeAsync');
}
