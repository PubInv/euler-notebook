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

// TODO: Switch to only use 'notebook' functionality, not 'server-notebook' functionality.
// Requirements

// import * as debug1 from "debug";
// const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
// const debug = debug1(`tests:${MODULE}`);
import { assert } from "chai";
import 'mocha';

import { StyleType, VERSION }  from "../shared/notebook";
import { NotebookChangeRequest, InsertCellRequest, StyleProperties } from "../shared/math-tablet-api";
import { ServerNotebook }  from "../server-notebook";

import { ensureGlobalLoaded } from "./global";
import { CssLength, PlainText } from "../shared/common";
import { CellType, InputType, TextCellData } from "../shared/cell";
ensureGlobalLoaded();

// Unit Tests

describe("notebook", function() {

  describe("structure", function() {

    const styleData = ['a', 'b', 'c'];

    let notebook: ServerNotebook;
    before("Create a notebook with three styles", async function(){
      notebook = await createNotebookFromText('PLAIN-TEXT', styleData.join(';'));
    });
    after(function(){ notebook.close(); });

    it("Converts to and from a JSON object", async function() {
      const obj = notebook.toJSON();
      assert.deepEqual(obj, {
        nextId: 4,
        pageConfig: {
          size: {
            height: <CssLength>"11in",
            width: <CssLength>"8.5in",
          },
          margins: {
            top: <CssLength>"72pt",
            right: <CssLength>"72pt",
            bottom: <CssLength>"72pt",
            left: <CssLength>"72pt",
          }
        },
        relationshipMap: {},
        styleMap: {
          1: { data: "a", id: 1, role: "TEXT", parentId: 0, source: "TEST", type: "PLAIN-TEXT", },
          2: { data: "b", id: 2, role: "TEXT", parentId: 0, source: "TEST", type: "PLAIN-TEXT", },
          3: { data: "c", id: 3, role: "TEXT", parentId: 0, source: "TEST", type: "PLAIN-TEXT", }
        },
        pages: [
          { styleIds: [ 1, 2, 3 ] },
        ],
        version: VERSION,
      });
      // TODO: create td from obj.
    });

    it("Retrieves styles with allStyles and getStyle", async function() {
      const styles = notebook.allStyles();
      assert.equal(styles.length, 3);
      assert.equal(styles[0].data, styleData[0]);

      const styleObject = notebook.getStyle(styles[0].id);
      assert.equal(styleObject, styles[0]);
    });

  });

});

// Helper Functions

async function createNotebookFromText(type: StyleType, text: string): Promise<ServerNotebook> {
  const td = await ServerNotebook.openEphemeral();
  const changeRequests: NotebookChangeRequest[] = text.split(";").map(s=>{
    const data: TextCellData = {
      type: CellType.Text,
      inputType: InputType.Keyboard,
      height: 72, // points
      inputText: <PlainText>s.trim()
    };
    const styleProps: StyleProperties = { role: 'TEXT', type, data };
    const rval: InsertCellRequest = { type: 'insertCell', styleProps }
    return rval;
  });
  await td.requestChanges('TEST', changeRequests);
  return td;
}

