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

import { NotebookChange, StyleInserted, StyleMeaning, StyleObject, StyleType } from '../../client/notebook';
import { StylePropertiesWithSubprops, StyleInsertRequest } from '../../client/math-tablet-api';


import { ServerNotebook } from '../server-notebook';
import { MathJsObserver } from '../observers/mathjs-cas';

// Constants

const EQUA1 = "x^2 + y^2 == r";
const EXPR1 = "2+2";

// Tests

describe("mathjs-cas", function(){

  let notebook: ServerNotebook;

  before(async function(): Promise<void>{
    await MathJsObserver.initialize({});
    await ServerNotebook.registerObserver('MATHJS', MathJsObserver);
    notebook = await ServerNotebook.createAnonymous();
  });


  it(`Adds appropriate substyles to MATHJS INPUT for ${EXPR1}`, async function(){

    // Insert a MATHJS INPUT style "2+2"
    const styleProps: StylePropertiesWithSubprops = { type: 'MATHJS', meaning: 'INPUT', data: EXPR1 };
    const changeRequest: StyleInsertRequest = { type: 'insertStyle', styleProps };
    const changes: NotebookChange[] = await notebook.requestChanges('USER', [changeRequest]);
    assert.equal(changes.length, 5);

    // The notebook has the INPUT style
    const insertedStyles = changes.filter(c=> c && c.type=='styleInserted').map(c=>(<StyleInserted>c).style);
    const inputStyle = assertHasStyle(insertedStyles, 'MATHJS', 'INPUT', EXPR1);

    // MathJS has attached the appropriate substyles
    const childStyles = insertedStyles.filter(s=>s.parentId==inputStyle!.id);
    // console.dir(childStyles);
    assertHasStyle(childStyles, 'LATEX', 'INPUT-ALT', '2+2');
    assertHasStyle(childStyles, 'MATHJS', 'EVALUATION', '4');
    assertHasStyle(childStyles, 'MATHJS', 'SIMPLIFICATION', '4');

    // Note: there is also a LATEX FORMULA-ALT style attached to the SIMPLIFICATION style.
  });

  it(`Adds appropriate substyles to MATHJS INPUT for ${EQUA1}`, async function(){

    const styleProps: StylePropertiesWithSubprops = { type: 'MATHJS', meaning: 'INPUT', data: EQUA1 };
    const changeRequest: StyleInsertRequest = { type: 'insertStyle', styleProps };
    const changes: NotebookChange[] = await notebook.requestChanges('USER', [changeRequest]);
    assert.equal(changes.length, 8);

    // The notebook has the INPUT style
    const insertedStyles = changes.filter(c=>c && c.type=='styleInserted').map(c=>(<StyleInserted>c).style);
    const inputStyle = assertHasStyle(insertedStyles, 'MATHJS', 'INPUT', EQUA1);

    // MathJS has attached the appropriate substyles
    const childStyles = insertedStyles.filter(s=>s.parentId==inputStyle!.id);
    // console.dir(childStyles);
    assertHasStyle(childStyles, 'LATEX', 'INPUT-ALT', "{ x}^{2}+{ y}^{2}= r");
    assertHasStyle(childStyles, 'TEXT', 'EVALUATION-ERROR', "Undefined symbol x");
    assertHasStyle(childStyles, 'MATHJS', 'SIMPLIFICATION', "x ^ 2 + y ^ 2 == r");
    assertHasStyle(childStyles, 'MATHJS', 'SYMBOL', "x");
    assertHasStyle(childStyles, 'MATHJS', 'SYMBOL', "y");
    assertHasStyle(childStyles, 'MATHJS', 'SYMBOL', "r");
  });
});

// Helper Functions

function assertHasStyle(styles: StyleObject[], type: StyleType, meaning: StyleMeaning, data: any): StyleObject {
  const style = styles.find(s=>s.type==type && s.meaning==meaning && s.data==data);
  assert.exists(style);
  return style!;
}
