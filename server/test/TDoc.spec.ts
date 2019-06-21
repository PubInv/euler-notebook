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
import * as sinon from 'sinon';

import { NotebookChangeRequest, StyleInsertRequest, StylePropertiesWithSubprops, StyleType, NotebookChange, ToolInfo, StyleInserted, StyleObject } from '../../client/math-tablet-api';
import { TDoc, ObserverInstance, VERSION }  from '../tdoc';
import { Config } from '../config';

// Test Observer

export class TestObserver implements ObserverInstance {
  static async initialize(_config: Config): Promise<void> { }
  static async onOpen(_tDoc: TDoc): Promise<TestObserver> { return new this(); }
  constructor() {}
  async onChanges(_changes: NotebookChange[]): Promise<NotebookChangeRequest[]> { return []; }
  async onClose(): Promise<void> {}
  async useTool(_style: StyleObject): Promise<NotebookChangeRequest[]> { return []; }
}

// Unit Tests

describe("TDoc", function() {

  describe("Structure access", function() {

    const styleData = ['a', 'b', 'c'];
    let td: TDoc;

    before("Create a tdoc with three styles", async function(){
      td = await createTDocFromText('TEXT', styleData.join(';'));
    });

    it("Converts to and from a JSON object", async function() {
      const obj = td.toJSON();
      assert.deepEqual(obj, {
        "nextId": 4,
        "relationshipMap": {},
        "styleMap": {
          "1": { "data": "a", "id": 1, "meaning": "INPUT", "parentId": 0, "source": "TEST", "type": "TEXT", },
          "2": { "data": "b", "id": 2, "meaning": "INPUT", "parentId": 0, "source": "TEST", "type": "TEXT", },
          "3": { "data": "c", "id": 3, "meaning": "INPUT", "parentId": 0, "source": "TEST", "type": "TEXT", }
        },
        "styleOrder": [ 1, 2, 3 ],
        "version": VERSION,
      });
      // TODO: create td from obj.
    });

    it("Retrieves styles with allStyles and getStyleById", async function() {
      const styles = td.allStyles();
      assert.equal(styles.length, 3);
      assert.equal(styles[0].data, styleData[0]);

      const styleObject = td.getStyleById(styles[0].id);
      assert.equal(styleObject, styles[0]);
    });

  });

  describe("TDoc Observer", function(){

    let tDoc: TDoc;
    let observer: TestObserver;

    const onOpenSpy: sinon.SinonSpy<[TDoc], Promise<ObserverInstance>> = sinon.spy(TestObserver, 'onOpen');
    let onChangesSpy: sinon.SinonSpy<[NotebookChange[]], Promise<NotebookChangeRequest[]>>;
    let onCloseSpy: sinon.SinonSpy<[], Promise<void>>;
    let useToolSpy: sinon.SinonSpy<[StyleObject], Promise<NotebookChangeRequest[]>>;


    before("onOpen is called when tDoc is created", async function(){
      // Register the observer
      TDoc.registerObserver('TEST', TestObserver);

      // Create a tDoc
      tDoc = await TDoc.createAnonymous();

      // Observer's onOpen should be called with tDoc as an argument
      // and return an observer instance. Spy on the observer.
      assert(onOpenSpy.calledOnce);
     assert.equal(onOpenSpy.lastCall.args[0], tDoc);
      observer = <TestObserver>(await onOpenSpy.lastCall.returnValue);
      onChangesSpy = sinon.spy(observer, 'onChanges');
      onCloseSpy = sinon.spy(observer, 'onClose');
      useToolSpy = sinon.spy(observer, 'useTool');
    });

    after("onClose is called when tDoc is closed", async function(){
      // tDoc should be open and observer's onClose should not have been called.
      // TODO: assert tDoc is not closed.
      assert.equal(onCloseSpy.callCount, 0);

      // Close the tDoc.
      await tDoc.close();

      // Observer's onClose should be called for the first and only time.
      // onClose takes no arguments.
      assert.equal(onCloseSpy.callCount, 1);

      sinon.restore();
    });

    it("onChanges is called when style is inserted", async function(){
      const callCount = onChangesSpy.callCount;
      const styleProps: StylePropertiesWithSubprops = { type: 'TEXT', meaning: 'INPUT', data: 'foo' };
      const insertRequest: StyleInsertRequest = { type: 'insertStyle', styleProps };
      const changeRequests = [insertRequest];
      await tDoc.requestChanges('TEST', changeRequests);
      assert.equal(onChangesSpy.callCount, callCount + 1);
      const expectedNotebookChange: StyleInserted = {
        type: 'styleInserted',
        style: {
          id: 1,
          parentId: 0,
          source: 'TEST',
          ...styleProps,
        },
        afterId: -1,
      }
      assert.deepEqual(onChangesSpy.lastCall.args[0], [ expectedNotebookChange ]);
    });

    it("useTool is called when tool is used", async function(){

      // Insert a top-level style with a tool style attached.
      const toolInfo: ToolInfo = { name: 'test-tool', html: "Check Equivalences", data: "tool-data" };
      const styleProps: StylePropertiesWithSubprops = {
        type: 'TEXT', meaning: 'INPUT', data: 'tool-parent',
        subprops: [
          { type: 'TOOL', meaning: 'ATTRIBUTE', data: toolInfo },
        ]
      };
      const insertRequest: StyleInsertRequest = { type: 'insertStyle', styleProps };
      await tDoc.requestChanges('TEST', [insertRequest]);

      // Observer's onChange should be called with two new styles.
      // Pick out the tool style.
      const changes: NotebookChange[] = onChangesSpy.lastCall.args[0];
      assert.equal(changes.length, 2);
      const toolChange = changes.find(c=>c.type=='styleInserted' && c.style.type=='TOOL');
      assert.exists(toolChange);
      const toolStyle = (<StyleInserted>toolChange).style;

      // Invoke the tool.
      const callCount = useToolSpy.callCount;
      await tDoc.useTool(toolStyle.id);

      // Observer's useTool method should be called, passing the tool style.
      assert.equal(useToolSpy.callCount, callCount+1);
      assert.deepEqual(useToolSpy.lastCall.args[0], toolStyle);
    });
  });
});

// Helper Functions

async function createTDocFromText(type: StyleType, text: string): Promise<TDoc> {
  const td = await TDoc.createAnonymous();
  const changeRequests: NotebookChangeRequest[] = text.split(";").map(s=>{
    const data = s.trim();
    const styleProps: StylePropertiesWithSubprops = { type, meaning: 'INPUT', data };
    const rval: StyleInsertRequest = { type: 'insertStyle', styleProps }
    return rval;
  });
  await td.requestChanges('TEST', changeRequests);
  return td;
}

