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

// import * as debug1 from 'debug';
// const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
// const debug = debug1(`server:${MODULE}`);
import { assert } from 'chai';
import 'mocha';

import { StyleType, VERSION }  from '../../client/notebook';
import { NotebookChangeRequest, StyleInsertRequest, StylePropertiesWithSubprops } from '../../client/math-tablet-api';
import { ServerNotebook }  from '../server-notebook';

// Unit Tests

describe("notebook", function() {

  describe("structure", function() {

    const styleData = ['a', 'b', 'c'];
    let td: ServerNotebook;

    before("Create a notebook with three styles", async function(){
      td = await createNotebookFromText('TEXT', styleData.join(';'));
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

});

// Helper Functions

async function createNotebookFromText(type: StyleType, text: string): Promise<ServerNotebook> {
  const td = await ServerNotebook.createAnonymous();
  const changeRequests: NotebookChangeRequest[] = text.split(";").map(s=>{
    const data = s.trim();
    const styleProps: StylePropertiesWithSubprops = { type, meaning: 'INPUT', data };
    const rval: StyleInsertRequest = { type: 'insertStyle', styleProps }
    return rval;
  });
  await td.requestChanges('TEST', changeRequests);
  return td;
}

