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

// import * as debug1 from 'debug';
// const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
// const debug = debug1(`server:${MODULE}`);
import { assert } from 'chai';
import 'mocha';
// import * as sinon from 'sinon';

import { NotebookChange,  StyleObject, RelationshipObject } from '../../client/notebook';
import { NotebookChangeRequest, StyleInsertRequest,
         StyleDeleteRequest,
         StylePropertiesWithSubprops } from '../../client/math-tablet-api';
import { ServerNotebook, ObserverInstance }  from '../server-notebook';

import { SymbolClassifierObserver } from '../observers/symbol-classifier';
import { MathematicaObserver } from '../observers/mathematica-cas';
import { start as startWolframscript } from '../observers/wolframscript';
import { Config, getConfig } from '../config';
// Test Observer

export class TestObserver implements ObserverInstance {
  static async initialize(_config: Config): Promise<void> { }
  static async onOpen(_notebook: ServerNotebook): Promise<TestObserver> { return new this(); }
  constructor() {}
  async onChanges(_changes: NotebookChange[]): Promise<NotebookChangeRequest[]> { return []; }
  async onClose(): Promise<void> {}
  async useTool(_style: StyleObject): Promise<NotebookChangeRequest[]> { return []; }
}

// Unit Tests

const data:string[] = [
  "X = 4",
  "X + Y"];

const styleProps:StylePropertiesWithSubprops[] =
  [
    { type: 'WOLFRAM', meaning: 'INPUT', data: data[0] },
    { type: 'WOLFRAM', meaning: 'INPUT', data: data[1] },
  ];

const insertRequest:StyleInsertRequest[] = [{ type: 'insertStyle',
                                              styleProps: styleProps[0] },
                                            { type: 'insertStyle',
                                              styleProps: styleProps[1] }];


describe("test symbol observer", function() {
  let notebook: ServerNotebook;

  before("correctly configure stuff", async function(){
    // We can't do this test if we don't have mathematica
    const config = await getConfig();

    // TODO: stopWolframscript before exiting.
    if (config.mathematica) { await startWolframscript(config); }

    if (config.mathematica) {
      await MathematicaObserver.initialize(config);
    } else {
    }

    // Register the observer
    ServerNotebook.registerObserver('TEST', TestObserver);
    // We are specifically testing this one...
    ServerNotebook.registerObserver('SYMBOL-CLASSIFIER', SymbolClassifierObserver);
    ServerNotebook.registerObserver('MATHEMATICA', MathematicaObserver);


  });

  beforeEach("Reinitialize notebook",async function(){
    // Create a notebook
    notebook = await ServerNotebook.createAnonymous();
  });
  afterEach("Close notebook",async function(){
    // Close the notebook.
    await notebook.close();
  });

  after("onClose is called when notebook is closed", async function(){

  });


  describe("observer", function(){
    it("a definition and a use creates a relationship if separate", async function(){

      const changeRequests = [insertRequest[0],insertRequest[1]];
      await notebook.requestChanges('TEST', [changeRequests[0]]);
      await notebook.requestChanges('TEST', [changeRequests[1]]);
      const style = notebook.topLevelStyleOf(1);
      assert.deepEqual(style.type,
                       'WOLFRAM'
                      );
      console.log(notebook);
      console.log("Relationships",notebook.allRelationships());
      assert.equal(notebook.allRelationships().length,1);
      const r : RelationshipObject = notebook.allRelationships()[0];
      const fromObj : StyleObject = notebook.topLevelStyleOf(r.fromId);
      const toObj : StyleObject =  notebook.topLevelStyleOf(r.toId);
      console.log("from",fromObj.data );
      console.log("to",toObj.data);
      assert.equal(fromObj.data,data[0]);
      assert.equal(toObj.data,data[1]);
    });
    it("a definition and a use creates a relationship if combined", async function(){
      const changeRequests = [insertRequest[0],insertRequest[1]];

      // TODO: This should work; but it doesn't, which we need to fix
      // Doing the change requests separate works, however. This should
      // be a determinant action!
      await notebook.requestChanges('TEST', changeRequests);
      const style = notebook.topLevelStyleOf(1);
      assert.deepEqual(style.type,
                       'WOLFRAM'
                      );
      console.log(notebook);
      console.log("Relationships",notebook.allRelationships());
      assert.equal(notebook.allRelationships().length,1);
      const r : RelationshipObject = notebook.allRelationships()[0];
      const fromObj : StyleObject = notebook.topLevelStyleOf(r.fromId);
      const toObj : StyleObject =  notebook.topLevelStyleOf(r.toId);
      console.log("from",fromObj.data );
      console.log("to",toObj.data);
      assert.equal(fromObj.data,data[0]);
      assert.equal(toObj.data,data[1]);
    });

    it("deleting used doesn't fail", async function(){
      const changeRequests = [insertRequest[0],insertRequest[1]];

      // TODO: This should work; but it doesn't, which we need to fix
      // Doing the change requests separate works, however. This should
      // be a determinant action!
      await notebook.requestChanges('TEST', changeRequests);

      const style = notebook.topLevelStyleOf(1);
      assert.deepEqual(style.type,
                       'WOLFRAM'
                      );
      console.log(notebook);
      console.log("Relationships",notebook.allRelationships());
      assert.equal(notebook.allRelationships().length,1);
      const r : RelationshipObject = notebook.allRelationships()[0];
      const fromObj : StyleObject = notebook.topLevelStyleOf(r.fromId);
      const toObj : StyleObject =  notebook.topLevelStyleOf(r.toId);
      console.log("from",fromObj.data );
      console.log("to",toObj.data);

      const deleteReq : StyleDeleteRequest = { type: 'deleteStyle',
                           styleId: style.id };

      await notebook.requestChanges('TEST', [deleteReq]);
      assert.equal(notebook.allRelationships().length,0);
    });
    // it("multiple definitions create inconsistencies")
    // it("two defs and a use create an inconsistency and a use")
    // it("two defs uses the latter definition")
    // it("imposing inserted defintion in inconsistencies maintains chain")
    // it("deletion keeeps chain connected")
    // it("reordering of inserts correctly changes order of change")
    // it(" ")
  });
});
