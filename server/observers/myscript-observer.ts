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

import { NotebookChange, StyleObject, StyleChanged, DrawingData, StyleId } from '../../client/notebook';
import { NotebookChangeRequest, LatexData } from '../../client/math-tablet-api';

import { Config } from '../config';
import { ServerKeys, postLatexRequest } from '../myscript-batch-api';
import { ObserverInstance, ServerNotebook }  from '../server-notebook';

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// Types

// Exported Class

export class MyScriptObserver implements ObserverInstance {

  // Class Methods

  public static async initialize(_config: Config, keys: ServerKeys): Promise<void> {
    this.keys = keys;
  }

  public static async onOpen(notebook: ServerNotebook): Promise<ObserverInstance> {
    // debug(`onOpen`);
    return new this(notebook);
  }

  // Instance Methods

  public async onChangesAsync(changes: NotebookChange[]): Promise<NotebookChangeRequest[]> {
    for (const change of changes) {
      if (!change) { continue; } // REVIEW: We shouldn't have null changes.
      this.onChangeAsync(change);
    }
    return [];
  }

  public onChangesSync(changes: NotebookChange[]): NotebookChangeRequest[] {
    const rval = <NotebookChangeRequest[]>[];
    for (const change of changes) {
      if (!change) { continue; } // REVIEW: We shouldn't have null changes.
      // this.onChangeSync(change, rval);
    }
    return rval;
  }

  public async onClose(): Promise<void> {
    // debug(`onClose ${this.notebook._path}`);
    delete this.notebook;
  }

  public async useTool(style: StyleObject): Promise<NotebookChangeRequest[]> {
    debug(`useTool ${this.notebook._path} ${style.id}`);
    return [];
  }

  // --- PRIVATE ---

  // Private Class Properties

  private static keys: ServerKeys;

  // Private Constructor

  private constructor(notebook: ServerNotebook) {
    this.notebook = notebook;
    this.styleOrder = [];
    this.styleData = new Map();
  }

  // Private Instance Properties

  private notebook: ServerNotebook;
  private processingPromise?: Promise<void>;
  private styleOrder: StyleId[];
  private styleData: Map<StyleId, DrawingData>;

  // Private Instance Methods

  private addStyleToQueue(styleId: StyleId, data: DrawingData): void {
    if (this.styleOrder.indexOf(styleId)<0) { this.styleOrder.push(styleId); }
    this.styleData.set(styleId, data);
    if (!this.processingPromise) {
      this.processingPromise = this.processQueue();
      this.processingPromise.finally(()=>{ delete this.processingPromise; })
    }
  }

  private async processEntry(styleId: StyleId, data: DrawingData): Promise<void> {
    const latexData = await this.recognizeStrokes(data);
    // console.dir(latexData);

    // If the style already has a LaTeX style attached, then
    // update it. Otherwise add one.
    let change: NotebookChangeRequest;
    const repStyle = this.notebook.findStyle({ role: 'REPRESENTATION', type: 'LATEX' }, styleId);
    if (repStyle) {
      debug(`Changing REPRESENTATION/LATEX style on ${styleId}/${repStyle.id}`)
      change = { type: 'changeStyle', styleId: repStyle.id, data: latexData }
    } else {
      debug(`Inserting REPRESENTATION|ALTERNATE/LATEX style on ${styleId}`)
      change = {
        type: 'insertStyle',
        parentId: styleId,
        styleProps: { role: 'REPRESENTATION', subrole: 'ALTERNATE', type: 'LATEX', data: latexData, }
      }
    }
    await this.notebook.requestChanges('MYSCRIPT', [ change ]);
  }

  private async processQueue(): Promise<void> {
    debug(`Processing the queue.`);
    while  (this.styleOrder.length>0) {
      const styleId = this.styleOrder.shift()!;
      const data = this.styleData.get(styleId)!;
      /* assert(data) */ if (!data) { throw new Error(`Data not found for style ${styleId}`); }
      this.styleData.delete(styleId);
      debug(`Recognizing strokes for style ${styleId}.`);
      await this.processEntry(styleId, data);
    }
    debug(`Finished processing the queue.`);
  }

  private async recognizeStrokes(data: DrawingData): Promise<LatexData> {
    // REVIEW: Are there fractional x and y values? Should we store strokes rounded already?
    // const jiix = await postJiixRequest(MyScriptObserver.keys, batchRequest);
    const latex = await postLatexRequest(MyScriptObserver.keys, data.strokeGroups);
    // console.dir(latex);
    return latex;
  }

  // Private Event Handlers

  private chStyleChanged(change: StyleChanged): void {
    const style = change.style;
    if (style.role != 'REPRESENTATION' || style.subrole != 'INPUT' || style.type != 'DRAWING') { return };
    debug(`REPRESENTATION|INPUT/DRAWING style ${style.id} changed. Adding to queue.`);
    this.addStyleToQueue(style.id, style.data);
  }

  private onChangeAsync(change: NotebookChange): void {
    // debug(`onChangeAsync ${this.notebook._path} ${change.type}`);
    switch (change.type) {
      case 'styleChanged':  this.chStyleChanged(change); break;
      //case 'styleDeleted':  this.chStyleDeleted(change); break;
      //case 'styleInserted': this.chStyleInserted(change); break;
      default: break;
    }
  }

  // private onChangeSync(change: NotebookChange, rval: NotebookChangeRequest[]): void {
  //   // debug(`onChangeSync ${this.notebook._path} ${change.type}`);
  //   switch (change.type) {
  //     case 'styleChanged':  this.chStyleChanged(change); break;
  //     //case 'styleDeleted':  this.chStyleDeleted(change); break;
  //     //case 'styleInserted': this.chStyleInserted(change); break;
  //     default: break;
  //   }
  // }

}

// HELPER FUNCTIONS

