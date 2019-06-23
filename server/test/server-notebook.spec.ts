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

import { NotebookChangeRequest, StyleInsertRequest, StylePropertiesWithSubprops, NotebookChange, ToolInfo, StyleInserted, StyleObject } from '../../client/math-tablet-api';
import { ServerNotebook, ObserverInstance }  from '../server-notebook';
import { Config } from '../config';

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

describe("server notebook", function() {

  describe("observer", function(){

    let notebook: ServerNotebook;
    let observer: TestObserver;

    const onOpenSpy: sinon.SinonSpy<[ServerNotebook], Promise<ObserverInstance>> = sinon.spy(TestObserver, 'onOpen');
    let onChangesSpy: sinon.SinonSpy<[NotebookChange[]], Promise<NotebookChangeRequest[]>>;
    let onCloseSpy: sinon.SinonSpy<[], Promise<void>>;
    let useToolSpy: sinon.SinonSpy<[StyleObject], Promise<NotebookChangeRequest[]>>;


    before("onOpen is called when notebook is created", async function(){
      // Register the observer
      ServerNotebook.registerObserver('TEST', TestObserver);

      // Create a notebook
      notebook = await ServerNotebook.createAnonymous();

      // Observer's onOpen should be called with notebook as an argument
      // and return an observer instance. Spy on the observer.
      assert(onOpenSpy.calledOnce);
     assert.equal(onOpenSpy.lastCall.args[0], notebook);
      observer = <TestObserver>(await onOpenSpy.lastCall.returnValue);
      onChangesSpy = sinon.spy(observer, 'onChanges');
      onCloseSpy = sinon.spy(observer, 'onClose');
      useToolSpy = sinon.spy(observer, 'useTool');
    });

    after("onClose is called when notebook is closed", async function(){
      // notebook should be open and observer's onClose should not have been called.
      // TODO: assert notebook is not closed.
      assert.equal(onCloseSpy.callCount, 0);

      // Close the notebook.
      await notebook.close();

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
      await notebook.requestChanges('TEST', changeRequests);
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
      await notebook.requestChanges('TEST', [insertRequest]);

      // Observer's onChange should be called with two new styles.
      // Pick out the tool style.
      const changes: NotebookChange[] = onChangesSpy.lastCall.args[0];
      assert.equal(changes.length, 2);
      const toolChange = changes.find(c=>c.type=='styleInserted' && c.style.type=='TOOL');
      assert.exists(toolChange);
      const toolStyle = (<StyleInserted>toolChange).style;

      // Invoke the tool.
      const callCount = useToolSpy.callCount;
      await notebook.useTool(toolStyle.id);

      // Observer's useTool method should be called, passing the tool style.
      assert.equal(useToolSpy.callCount, callCount+1);
      assert.deepEqual(useToolSpy.lastCall.args[0], toolStyle);
    });
  });
});

