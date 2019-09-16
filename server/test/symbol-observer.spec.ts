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

import { NotebookChange,  StyleObject, RelationshipObject,
         StyleId
       } from '../../client/notebook';
import { NotebookChangeRequest, StyleInsertRequest,
         StyleDeleteRequest } from '../../client/math-tablet-api';
import { ServerNotebook, ObserverInstance }  from '../server-notebook';

import { SymbolClassifierObserver } from '../observers/symbol-classifier';
import { EquationSolverObserver } from '../observers/equation-solver';
import { MathematicaObserver } from '../observers/mathematica-cas';
import { TeXFormatterObserver } from '../observers/tex-formatter';
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
// I don't know why this might work....
async function serializeChangeRequests(notebook: ServerNotebook,
                                 changes: NotebookChangeRequest[]) {
  for(const cr of changes) {
      await notebook.requestChanges('TEST', [cr]);
  }
}

function generateInsertRequests(inputs :string[]) : StyleInsertRequest[] {
  var reqs : StyleInsertRequest[] = [];
  for(const i of inputs) {
    reqs.push( { type: 'insertStyle',
            styleProps: { type: 'WOLFRAM', meaning: 'INPUT', data: i } }
        );
  }
  return reqs;
}

const data:string[] = [
  "X = 4",
  "X + Y",
  "X = 5",
  "X = 6",
  "Y = X^2"];

// const styleProps:StylePropertiesWithSubprops[] =
//   [
//     { type: 'WOLFRAM', meaning: 'INPUT', data: data[0] },
//     { type: 'WOLFRAM', meaning: 'INPUT', data: data[1] },
//     { type: 'WOLFRAM', meaning: 'INPUT', data: data[2] },
//     { type: 'WOLFRAM', meaning: 'INPUT', data: data[3] },
//     { type: 'WOLFRAM', meaning: 'INPUT', data: data[4] },
//   ];

// const insertRequest:StyleInsertRequest[] = [{ type: 'insertStyle',
//                                               styleProps: styleProps[0] },
//                                             { type: 'insertStyle',
//                                               styleProps: styleProps[1] },
//                                            { type: 'insertStyle',
//                                              styleProps: styleProps[2] },
//                                             { type: 'insertStyle',
//                                               styleProps: styleProps[3] },
//                                             { type: 'insertStyle',
//                                               styleProps: styleProps[4] }];

function texformatOfLastThought(notebook : ServerNotebook) : string {
  // To try to make this robust, we will specifically construct
  // the value. We also need to be able to get the last thought.
  const lastThoughtId = getThought(notebook,-1);

  // now that we have the lastThought, we want to get the
  // LATEX type...
  const lastThought = notebook.getStyleById(lastThoughtId);
  const children = notebook.findChildStylesOfType(lastThought.id,
                                                  'LATEX');
  const texformatter = children[0];
  return texformatter.data;
}
function getThought(notebook : ServerNotebook,n : number) : StyleId {
  const tls = notebook.topLevelStyleOrder();
  const thoughtId = tls.slice(n)[0];
  return thoughtId;
}


const insertRequest:StyleInsertRequest[] = generateInsertRequests(data);

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
    ServerNotebook.registerObserver('EQUATION-SOLVER', EquationSolverObserver);
    ServerNotebook.registerObserver('TEX-FORMATTER', TeXFormatterObserver);


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
      assert.deepEqual(style.type,'WOLFRAM');
      assert.equal(notebook.allRelationships().length,1);
      const r : RelationshipObject = notebook.allRelationships()[0];
      const fromObj : StyleObject = notebook.topLevelStyleOf(r.fromId);
      const toObj : StyleObject =  notebook.topLevelStyleOf(r.toId);
      assert.equal(fromObj.data,data[0]);
      assert.equal(toObj.data,data[1]);
    });
    it("a definition and a use creates a relationship if combined", async function(){
      const changeRequests = [insertRequest[0],insertRequest[1]];
      await notebook.requestChanges('TEST', changeRequests);
      const style = notebook.topLevelStyleOf(1);
      assert.deepEqual(style.type,
                       'WOLFRAM'
                      );

      assert.equal(notebook.allRelationships().length,1);
      const r : RelationshipObject = notebook.allRelationships()[0];
      const fromObj : StyleObject = notebook.topLevelStyleOf(r.fromId);
      const toObj : StyleObject =  notebook.topLevelStyleOf(r.toId);

      assert.equal(fromObj.data,data[0]);
      assert.equal(toObj.data,data[1]);
    });

    it("deleting used doesn't fail", async function(){
      const changeRequests = [insertRequest[0],insertRequest[1]];
      await notebook.requestChanges('TEST', changeRequests);
      const style = notebook.topLevelStyleOf(1);
      assert.deepEqual(style.type,'WOLFRAM');

      assert.equal(notebook.allRelationships().length,1);
      const deleteReq : StyleDeleteRequest = { type: 'deleteStyle',
                           styleId: style.id };

      await notebook.requestChanges('TEST', [deleteReq]);
      assert.equal(notebook.allRelationships().length,0);
    });
    it("multiple definitions create inconsistencies",async function(){
      // Our goal here is to mark two defintions as inconsistent,
      // but still keep a linear chain.
      const changeRequests0 = [insertRequest[0],insertRequest[2]];
      const changeRequests1 = [insertRequest[3]];
      await notebook.requestChanges('TEST', changeRequests0);
      await notebook.requestChanges('TEST', changeRequests1);

      const style = notebook.topLevelStyleOf(1);
      assert.deepEqual(style.type,'WOLFRAM');
      assert.equal(notebook.allRelationships().length,2);
      // We want to check that the relaionship is "duplicate def".
      const r : RelationshipObject = notebook.allRelationships()[0];
      assert.equal(r.meaning,'DUPLICATE-DEFINITION');
    });
    it("two defs and a use create an inconsistency and a use",async function(){
      const changeRequests = [insertRequest[0],insertRequest[2],insertRequest[4]];
      await serializeChangeRequests(notebook,changeRequests);


      assert.equal(2,notebook.allRelationships().length);
      // We want to check that the relaionship is "duplicate def".
      const rd : RelationshipObject = notebook.allRelationships()[0];

      const ru : RelationshipObject = notebook.allRelationships()[1];
      assert.equal(ru.meaning,'DUPLICATE-DEFINITION');
      assert.equal(rd.meaning,'SYMBOL-DEPENDENCY');
    });
    it("three defs cause the final one to be used",async function(){
      const data:string[] = [
        "X = 4",
        "X = 5",
        "X = 6",
        "Y = X^2"];
      const changeRequests = generateInsertRequests(data);

      await serializeChangeRequests(notebook,changeRequests);

      // Now that we have this, the Final one, X^2, should evaulte to 36
      assert.equal(3,notebook.allRelationships().length);
      // Now we have want to take the last one, and observe an evaluation.
      // This raises the question: should we add an evaluation to the
      // notebook itself, which would be a bit expensive, but
      // allow us to directly see the evaluation.

      // To try to make this robust, we will specifically construct
      // the value. We also need to be able to get the last thought.
      const lastThoughtId = notebook.topLevelStyleOrder().slice(-1)[0];

      // now that we have the lastThought, we want to get the
      // LATEX type...
      const lastThought = notebook.getStyleById(lastThoughtId);

      const children = notebook.findChildStylesOfType(lastThought.id,
                                                      'LATEX');
      const texformatter = children[0];
      assert.equal('Y = 36',texformatter.data);

    });
    it("getSymbolStylesThatDependOnMe works",async function(){
      const data:string[] = [
        "X = 6",
        "Y = X^2"];
      const insertRequests = generateInsertRequests(data);
      await serializeChangeRequests(notebook,insertRequests);

      const rs = notebook.allRelationships();
      assert.equal(1,rs.length);
      const defStyle = notebook.getStyleById(rs[0].fromId);
      const U = notebook.getSymbolStylesThatDependOnMe(defStyle);
      assert.equal(1,U.length);


    });
    it("two defs and a delete cause the final one to be used",async function(){
      const data:string[] = [
        "X = 4",
        "X = 6",
        "Y = X^2"];
      const insertRequests = generateInsertRequests(data);
      await serializeChangeRequests(notebook,insertRequests);

      const secondThoughtId = notebook.topLevelStyleOrder()[1];
      const deleteRequest : StyleDeleteRequest = { type: 'deleteStyle',
                              styleId: secondThoughtId };

      await serializeChangeRequests(notebook,[deleteRequest]);

      // Now that we have this, the Final one, X^2, should evaulte to 36
      assert.equal(1,notebook.allRelationships().length);
      // Now we have want to take the last one, and observe an evaluation.
      // This raises the question: should we add an evaluation to the
      // notebook itself, which would be a bit expensive, but
      // allow us to directly see the evaluation.

      // To try to make this robust, we will specifically construct
      // the value. We also need to be able to get the last thought.
      const lastThoughtId = notebook.topLevelStyleOrder().slice(-1)[0];

      // now that we have the lastThought, we want to get the
      // LATEX type...
      const lastThought = notebook.getStyleById(lastThoughtId);

      const children = notebook.findChildStylesOfType(lastThought.id,
                                                      'LATEX');
      const texformatter = children[0];
      assert.equal('Y = 16',texformatter.data);


    });
    it("multiples defs and a deletes are handled",async function(){
      const NUM = 10;
      let data:string[] = [];

      for(var i = 0; i < NUM; i++) {
        data[i] = "X = "+i;
      }
      data.push("Y = X^2");
      const insertRequests = generateInsertRequests(data);
      await serializeChangeRequests(notebook,insertRequests);

      let penultimate = getThought(notebook,-2);

      // We need a function to
      const deleteRequest : StyleDeleteRequest = { type: 'deleteStyle',
                              styleId: penultimate };

      await serializeChangeRequests(notebook,[deleteRequest]);

      // Now that we have this, the Final one, X^2, should evaulte to 36
      assert.equal(NUM+1,notebook.allRelationships().length);
      // Now we have want to take the last one, and observe an evaluation.
      // This raises the question: should we add an evaluation to the
      // notebook itself, which would be a bit expensive, but
      // allow us to directly see the evaluation.

      const lasttex = texformatOfLastThought(notebook);

      assert.equal('Y = '+(NUM-2)*(NUM-2),lasttex);

      // Now we must delete objects!!!
    });
    // it("imposing inserted defintion in inconsistencies maintains chain")
    // it("deletion keeeps chain connected")
    // it("reordering of inserts correctly changes order of change")
    // it(" ")
  });
});
