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

// import * as debug1 from "debug";
// const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
// const debug = debug1(`tests:${MODULE}`);
import { assert } from "chai";
import 'mocha';
import * as sinon from "sinon";

import { Html } from "../shared/common";
import { FormulaCellData, PlainTextMath } from "../shared/formula";
import { NotebookChange, StyleInserted, StyleObject } from "../shared/notebook";
import { NotebookChangeRequest, StyleInsertRequest, StylePropertiesWithSubprops, ToolData } from "../shared/math-tablet-api";
import { ServerNotebook, ObserverInstance }  from "../server-notebook";
import { Config } from "../config";

import { ensureGlobalLoaded } from "./global";
import { CellType, InputType } from "../shared/cell";
ensureGlobalLoaded();

// Test Observer Class

class TestObserver implements ObserverInstance {
  static async initialize(_config: Config): Promise<void> { }
  static async onOpen(_notebook: ServerNotebook): Promise<TestObserver> { return new this(); }
  constructor() {}
  async onChangesAsync(_changes: NotebookChange[], _startIndex: number, _endIndex: number): Promise<NotebookChangeRequest[]> { return []; }
  public onChangesSync(_changes: NotebookChange[], _startIndex: number, _endIndex: number): NotebookChangeRequest[] { return []; }
  onClose(): void { }
  async useTool(_style: StyleObject): Promise<NotebookChangeRequest[]> { return []; }
}

// Unit Tests

describe("server notebook", function() {

  describe("observer", function(){

    let notebook: ServerNotebook;
    let observer: TestObserver;

    const onOpenSpy: sinon.SinonSpy<[ServerNotebook], Promise<ObserverInstance>> = sinon.spy(TestObserver, 'onOpen');
    let onChangesAsyncSpy: sinon.SinonSpy<[NotebookChange[], number, number], Promise<NotebookChangeRequest[]>>;
    let onChangesSyncSpy: sinon.SinonSpy<[NotebookChange[], number, number], NotebookChangeRequest[]>;
    let onCloseSpy: sinon.SinonSpy<[], void>;
    let useToolSpy: sinon.SinonSpy<[StyleObject], Promise<NotebookChangeRequest[]>>;

    before("onOpen is called when notebook is created", async function(){
      // Register the observer
      notebook = await ServerNotebook.openEphemeral();
      const testObserver = await TestObserver.onOpen(notebook);
      notebook.registerObserver('TEST', testObserver);

      // Observer's onOpen should be called with notebook as an argument
      // and return an observer instance. Spy on the observer.
      assert(onOpenSpy.calledOnce);
      assert.equal(onOpenSpy.lastCall.args[0], notebook);
      observer = <TestObserver>(await onOpenSpy.lastCall.returnValue);
      onChangesAsyncSpy = sinon.spy(observer, 'onChangesAsync');
      onChangesSyncSpy = sinon.spy(observer, 'onChangesSync');
      onCloseSpy = sinon.spy(observer, 'onClose');
      useToolSpy = sinon.spy(observer, 'useTool');
    });

    after("onClose is called when notebook is closed", async function(){
      // notebook should be open and observer's onClose should not have been called.
      // TODO: assert notebook is not closed.
      assert.equal(onCloseSpy.callCount, 0);

      // Close the notebook.
      notebook.close();

      // Observer's onClose should be called for the first and only time.
      // onClose takes no arguments.
      assert.equal(onCloseSpy.callCount, 1);

      sinon.restore();
    });

    it("onChanges is called when style is inserted", async function(){
      const callCountAsync = onChangesAsyncSpy.callCount;
      const callCountSync = onChangesSyncSpy.callCount;
      const data: FormulaCellData = {
        type: CellType.Formula,
        inputType: InputType.None,
        height: 72, // points
          plainTextMath: <PlainTextMath>"",
      };
      const styleProps: StylePropertiesWithSubprops = { role: 'FORMULA', type: 'FORMULA-DATA', data };
      const insertRequest: StyleInsertRequest = { type: 'insertStyle', styleProps };
      const changeRequests = [insertRequest];
      await notebook.requestChanges('TEST', changeRequests);
      assert(onChangesAsyncSpy.callCount>callCountAsync);
      assert(onChangesSyncSpy.callCount>callCountSync);

      // TODO: Commented out this test because it is very fragile, depending on what the observers
      //       are doing exactly. Need to change it to look specifically for changes that are expected,
      //       and not worry about what other changes may occur.
      // const expectedNotebookChange: StyleInserted = {
      //   type: 'styleInserted',
      //   style: {
      //     id: 1,
      //     parentId: 0,
      //     source: 'TEST',
      //     ...styleProps,
      //   },
      //   afterId: -1,
      // }
      // assert.deepEqual(onChangesAsyncSpy.lastCall.args[0], [ expectedNotebookChange ]);
      // assert.deepEqual(onChangesSyncSpy.lastCall.args[0], [ expectedNotebookChange ]);
    });

    it("useTool is called when tool is used", async function(){

      // Insert a top-level style with a tool style attached.
      const toolData: ToolData = { name: 'test-tool', html: <Html>"Check Equivalences", data: "tool-data" };
      const formulaData: FormulaCellData = {
        type: CellType.Formula,
        inputType: InputType.None,
        height: 72, // points
        plainTextMath: <PlainTextMath>'',
      };
      const styleProps: StylePropertiesWithSubprops = {
        role: 'FORMULA',
        type: 'FORMULA-DATA',
        data: formulaData,
        subprops: [
          { role: 'ATTRIBUTE', type: 'TOOL-DATA', data: toolData },
        ]
      };
      const insertRequest: StyleInsertRequest = { type: 'insertStyle', styleProps };
      const changes = await notebook.requestChange('TEST', insertRequest);

      // Find the tool style that was inserted.
      const insertToolChange = changes.find(c=>c.type=='styleInserted' && c.style.role=='ATTRIBUTE');
      const toolStyle = (<StyleInserted>insertToolChange).style;

      // Invoke the tool.
      const callCount = useToolSpy.callCount;
      await notebook.useTool(toolStyle.id);

      // Observer's useTool method should be called, passing the tool style.
      assert.equal(useToolSpy.callCount, callCount+1);
      assert.deepEqual(useToolSpy.lastCall.args[0], toolStyle);
    });
  });
});

