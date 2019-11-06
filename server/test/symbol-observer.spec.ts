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
         StyleChangeRequest,
         StyleMoveRequest,
         StyleDeleteRequest, StylePropertiesWithSubprops
       } from '../../client/math-tablet-api';
import { ServerNotebook, ObserverInstance }  from '../server-notebook';

import { SymbolClassifierObserver } from '../observers/symbol-classifier';
import { EquationSolverObserver } from '../observers/equation-solver';
import { MathematicaObserver } from '../observers/mathematica-cas';
import { TeXFormatterObserver } from '../observers/tex-formatter';
import { AnyInputObserver } from '../observers/any-input';
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
    // TODO: It would be nice to be able to de-register
    // somthing to make things easier when we are testing.
    ServerNotebook.registerObserver('TEST', TestObserver);
    // We are specifically testing this one...
    ServerNotebook.registerObserver('SYMBOL-CLASSIFIER', SymbolClassifierObserver);
    ServerNotebook.registerObserver('MATHEMATICA', MathematicaObserver);
    ServerNotebook.registerObserver('EQUATION-SOLVER', EquationSolverObserver);
    ServerNotebook.registerObserver('TEX-FORMATTER', TeXFormatterObserver);
    ServerNotebook.registerObserver('ANY-INPUT', AnyInputObserver);


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
    // Note: Doing this for WOLFRAM / INPUT is not really
    // the intended use case for our "exclusivity", but it will serve.
    it("two insert requests, if marked exclusive, only produce one child", async function(){
      const data:string[] = [
        "X = 4"];
      const changeRequests = generateInsertRequests(data);


      await notebook.requestChanges('TEST', [changeRequests[0]]);
      const style = notebook.topLevelStyleOf(1);
      assert.deepEqual(style.type,'WOLFRAM');

      // Now we want to try to create two child requests,
      // and see that only one is created
      const fake_result = "4";
      const styleProps1: StylePropertiesWithSubprops = {
        type: 'WOLFRAM',
        data: <string>fake_result,
        meaning: 'EVALUATION',
        exclusiveChildTypeAndMeaning: true,
      }
      const cr1: StyleInsertRequest = {
        type: 'insertStyle',
        parentId: style.id,
        styleProps: styleProps1,
      };

      const styleProps2: StylePropertiesWithSubprops = {
        type: 'WOLFRAM',
        data: <string>fake_result,
        meaning: 'EVALUATION',
        exclusiveChildTypeAndMeaning: true,
      }
      const cr2: StyleInsertRequest = {
        type: 'insertStyle',
        parentId: style.id,
        styleProps: styleProps2,
      };
      await notebook.requestChanges('TEST', [cr1,cr2]);

      // Now we want to assert that "style" has only one WOLFRAM EVALUATION
      // child.
      const children = notebook.findChildStylesOfType(style.id,
                                                      'WOLFRAM');
      const properChildren = children.filter(c => (c.parentId == style.id));
      console.log("children:",properChildren);
      assert(properChildren.length == 1,"There should be one child, but there are:"+children.length);

    });

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
    it("An input and change does produces only one relationhsip",async function(){
      const data:string[] = [
        "X = 4",
        "X^2 + Y"];
      const changeRequests = generateInsertRequests(data);

      await serializeChangeRequests(notebook,changeRequests);

      // Now that we have this, the Final one, X^2, should evaulte to 36
      assert.equal(1,notebook.allRelationships().length);

      const rd : RelationshipObject = notebook.allRelationships()[0];
      const fromId = rd.fromId;
      console.log("YYYYYYYYYYY to Id",rd.toId);

      const cr: StyleChangeRequest = {
        type: 'changeStyle',
        styleId: fromId,
        data: "X = 5",
      };
      await serializeChangeRequests(notebook,[cr]);

      assert.equal(1,notebook.allRelationships().length);

    });
    it("An input and change does produces only one relationhsip",async function(){
      const data:string[] = [
        "X = 4",
        "X^2 + Y"];
      const changeRequests = generateInsertRequests(data);

      await serializeChangeRequests(notebook,changeRequests);

      // Now that we have this, the Final one, X^2, should evaulte to 36
      assert.equal(1,notebook.allRelationships().length);

      const rd : RelationshipObject = notebook.allRelationships()[0];
      const fromId = rd.fromId;
      console.log("YYYYYYYYYYY to Id",rd.toId);

      const cr: StyleChangeRequest = {
        type: 'changeStyle',
        styleId: fromId,
        data: "X = 5",
      };
      await serializeChangeRequests(notebook,[cr]);

      assert.equal(1,notebook.allRelationships().length);

    });

    it("Deleting a use correctly deletes relationships.",async function(){
      const data:string[] = [
        "X = 4",
        "X^2 + Y"];
      const changeRequests = generateInsertRequests(data);

      await serializeChangeRequests(notebook,changeRequests);

      // Now that we have this, the Final one, X^2, should evaulte to 36
      assert.equal(1,notebook.allRelationships().length);

      const rd : RelationshipObject = notebook.allRelationships()[0];
      const toId = rd.toId;

      const cr: StyleDeleteRequest = {
        type: 'deleteStyle',
        styleId: toId,
      };
      await serializeChangeRequests(notebook,[cr]);
      assert.equal(0,notebook.allRelationships().length);
    });
    it.only("Relationships can be completely recomputed",async function(){
      // const data:string[] = [
      //   "X = 4",
      //   "X = 5",
      //   "Y = 6",
      //   "X^2 + Y"];
      const data:string[] = [
        "X = 1",
        "X = 2",
        "X^2"];
      const changeRequests = generateInsertRequests(data);

      await serializeChangeRequests(notebook,changeRequests);
      console.log("NOTEBOOK",notebook);

      // We want to compute relationship computation...
      const rels = notebook.recomputeAllSymbolRelationships();
      assert.equal(notebook.allRelationships().length,rels.length);
      console.log("RELATIONSHIPS",rels);
    });

    // Note: I'm leaving this in because it is an example of
    // where the serialization works, but the performing all
    // requests doesn't. However, nobody ever really deletes
    // a use in the same instant it is inserted, so this
    // should be considered a strange case!
    it.skip("Deleting a use without serialization correctly deletes relationships.",async function(){
      const data:string[] = [
        "X = 4",
        "X^2 + Y"];
      const changeRequests = generateInsertRequests(data);

      // This was experimentally deteremined!!
      const toId = 6;
      const cr: StyleDeleteRequest = {
        type: 'deleteStyle',
        styleId: toId,
      };

      // This will fail
      await notebook.requestChanges('TEST',[...changeRequests,cr]);
      // This will work
//      await serializeChangeRequests(notebook,[...changeRequests,cr]);

      assert.equal(0,notebook.allRelationships().length);
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
      const rels = notebook.recomputeAllSymbolRelationships();
      assert.equal(notebook.allRelationships().length,rels.length);

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
      const NUM = 8;
      let data:string[] = [];

      for(var i = 0; i < NUM; i++) {
        data[i] = "X = "+(i+3);
      }
      data.push("Y = X^2");
      const insertRequests = generateInsertRequests(data);
      await serializeChangeRequests(notebook,insertRequests);
      console.log("XXXXX",notebook);


      for(var i = NUM-1; i > 1; i--) {

        let penultimate = getThought(notebook,-2);
        const deleteRequest : StyleDeleteRequest = { type: 'deleteStyle',
                                                     styleId: penultimate };

        await serializeChangeRequests(notebook,[deleteRequest]);

//        console.log("penultimate id",penultimate);
//        console.log("notebook IIIII",i,notebook);

        // Now that we have this, the Final one, X^2, should evaulte to 36
//        assert.equal(NUM-2,notebook.allRelationships().length);
        // Now we have want to take the last one, and observe an evaluation.
        // This raises the question: should we add an evaluation to the
        // notebook itself, which would be a bit expensive, but
        // allow us to directly see the evaluation.

        const lasttex = texformatOfLastThought(notebook);

        assert.equal('Y = '+(i+2)*(i+2),lasttex);
        const rels = notebook.recomputeAllSymbolRelationships();
        assert.equal(notebook.allRelationships().length,rels.length);
      }

      // Now we must delete objects!!!
    });

    it("reorderings are supported",async function(){
  //    const NUM = 2;
      let data:string[] = [];
      notebook.deRegisterObserver('MATHEMATICA');
      notebook.deRegisterObserver('EQUATION-SOLVER');
      notebook.deRegisterObserver('TEX-FORMATTER');

//      for(var i = 0; i < NUM; i++) {
//        data[i] = "X = "+(i+3);
      //      }
      data.push("X = 1");
      data.push("X = 2");
      data.push("Y = X^2");
      const insertRequests = generateInsertRequests(data);
      await serializeChangeRequests(notebook,insertRequests);

      // Okay, now we have a bunch of assignments set up.
      // The simplest thing is to take the last one and
      // move it in relative order, then test that
      // we have updated the orders correctly.

      let penultimate = getThought(notebook,-2);
      let initialThought = getThought(notebook,0);
      console.log("penultimate id",penultimate);
      console.log("initial",initialThought);
      const moveRequest : StyleMoveRequest = { type: 'moveStyle',
                                                 styleId: penultimate,
                                                 afterId: 0
                                               };


      console.log("BEFORE MOVE REQUEST",notebook);

      // TODO: it think these are wrong:
      console.error("PRE TLS",notebook.topLevelStyleOrder());
      await serializeChangeRequests(notebook,[moveRequest]);

      console.error("POST TLS",notebook.topLevelStyleOrder());
      const rel_r =  notebook.allRelationships();
      const rel_recomp = notebook.recomputeAllSymbolRelationships();

      console.error("notebook.allRelationships()", rel_r);
      console.error("notebook.recomputeAllSymbolRelationships()",rel_recomp );
      console.log("AFTER MOVE REQUEST",notebook);
      // TODO: I believe at least one error here is that after this operation
      // the top-level styles no long match; this should not happen!
      console.log("ICREMENTAL, RECOMPUT",rel_r.length,
                   rel_recomp.length);
      assert.equal(rel_r.length,
                   rel_recomp.length);
    });
  });
});
