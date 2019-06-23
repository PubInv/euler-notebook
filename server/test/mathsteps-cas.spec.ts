
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

import { MathStepsObserver } from '../observers/mathsteps-cas';

import { ServerNotebook } from '../server-notebook';
import { StyleProperties, StyleInsertRequest, StylePropertiesWithSubprops, NotebookChange, StyleInserted, ToolName, StyleId, StyleObject } from '../../client/math-tablet-api';

// Constants

const EXPR1 = "x+x"
const EXPR1_SIMPLIFICATION = `<pre>
ADD_POLYNOMIAL_TERMS
FROM: x + x
  TO: 2 x
  ADD_COEFFICIENT_OF_ONE
  FROM: x + x
    TO: 1 x + 1 x
  GROUP_COEFFICIENTS
  FROM: 1 x + 1 x
    TO: (1 + 1) x
  SIMPLIFY_ARITHMETIC
  FROM: (1 + 1) x
    TO: 2 x
</pre>`;

const EQUA1 = "2(x+3)=5x";
const EQUA1_SOLUTION = `<pre>
DISTRIBUTE
FROM: 2 * (x + 3) = 5x
  TO: 2x + 6 = 5x
  DISTRIBUTE
  FROM: 2 * (x + 3) = 5x
    TO: 2x + 2 * 3 = 5x
  SIMPLIFY_TERMS
  FROM: 2x + 2 * 3 = 5x
    TO: 2x + 6 = 5x
    SIMPLIFY_ARITHMETIC
    FROM: 2x + 2 * 3 = 5x
      TO: 2x + 6 = 5x
SUBTRACT_FROM_BOTH_SIDES
FROM: 2x + 6 = 5x
  TO: (2x + 6) - 5x = (5x) - 5x
COLLECT_AND_COMBINE_LIKE_TERMS
FROM: 2x + 6 - 5x = (5x) - 5x
  TO: -3x + 6 = (5x) - 5x
  COLLECT_LIKE_TERMS
  FROM: 2x + 6 - 5x = (5x) - 5x
    TO: (2x - 5x) + 6 = (5x) - 5x
  ADD_POLYNOMIAL_TERMS
  FROM: 2x - 5x + 6 = (5x) - 5x
    TO: -3x + 6 = (5x) - 5x
    GROUP_COEFFICIENTS
    FROM: 2x - 5x + 6 = (5x) - 5x
      TO: (2 - 5) * x + 6 = (5x) - 5x
    SIMPLIFY_ARITHMETIC
    FROM: (2 - 5) * x + 6 = (5x) - 5x
      TO: -3x + 6 = (5x) - 5x
SIMPLIFY_RIGHT_SIDE
FROM: -3x + 6 = (5x) - 5x
  TO: -3x + 6 = 0
  ADD_POLYNOMIAL_TERMS
  FROM: -3x + 6 = 5x - 5x
    TO: -3x + 6 = 0x
    GROUP_COEFFICIENTS
    FROM: -3x + 6 = 5x - 5x
      TO: -3x + 6 = (5 - 5) * x
    SIMPLIFY_ARITHMETIC
    FROM: -3x + 6 = (5 - 5) * x
      TO: -3x + 6 = 0x
  MULTIPLY_BY_ZERO
  FROM: -3x + 6 = 0x
    TO: -3x + 6 = 0
SUBTRACT_FROM_BOTH_SIDES
FROM: -3x + 6 = 0
  TO: (-3x + 6) - 6 = 0 - 6
SIMPLIFY_LEFT_SIDE
FROM: (-3x + 6) - 6 = 0 - 6
  TO: -3x = 0 - 6
  COLLECT_AND_COMBINE_LIKE_TERMS
  FROM: -3x + 6 - 6 = 0 - 6
    TO: -3x + 0 = 0 - 6
    COLLECT_LIKE_TERMS
    FROM: -3x + 6 - 6 = 0 - 6
      TO: -3x + (6 - 6) = 0 - 6
    SIMPLIFY_ARITHMETIC
    FROM: -3x + 6 - 6 = 0 - 6
      TO: -3x + 0 = 0 - 6
  REMOVE_ADDING_ZERO
  FROM: -3x + 0 = 0 - 6
    TO: -3x = 0 - 6
REMOVE_ADDING_ZERO
FROM: -3x = 0 - 6
  TO: -3x = -6
DIVIDE_FROM_BOTH_SIDES
FROM: -3x = -6
  TO: (-3x) / -3 = -6/-3
SIMPLIFY_LEFT_SIDE
FROM: (-3x) / -3 = -6/-3
  TO: x = -6/-3
  CANCEL_MINUSES
  FROM: -3x / -3 = -6/-3
    TO: 3x / 3 = -6/-3
  SIMPLIFY_FRACTION
  FROM: 3x / 3 = -6/-3
    TO: x = -6/-3
SIMPLIFY_RIGHT_SIDE
FROM: x = -6/-3
  TO: x = 2
  CANCEL_MINUSES
  FROM: x = -6/-3
    TO: x = 6/3
  SIMPLIFY_FRACTION
  FROM: x = 6/3
    TO: x = 2
    FIND_GCD
    FROM: x = 6/3
      TO: x = (2 * 3) / (1 * 3)
    CANCEL_GCD
    FROM: x = (2 * 3) / (1 * 3)
      TO: x = 2
</pre>`;

// Tests

describe('mathsteps-cas', function(){

  before(async function(): Promise<void>{
    await MathStepsObserver.initialize({});
    await ServerNotebook.registerObserver('MATHSTEPS', MathStepsObserver);
  });

  it(`Adds a 'steps' tool to '${EXPR1}' that adds simplification steps`, async function(){

    const notebook = await ServerNotebook.createAnonymous();

    // Create a thought with a MathJS expression input style.
    const styleProps: StylePropertiesWithSubprops = { type: 'MATHJS', meaning: 'INPUT', data: EXPR1 };
    const changeRequest: StyleInsertRequest = { type: 'insertStyle', styleProps };
    const changes: NotebookChange[] = await notebook.requestChanges('USER', [changeRequest]);
    const firstChange = changes[0];
    assert(firstChange.type == 'styleInserted');
    const style = (<StyleInserted>firstChange).style;

    // Check that a tool menu was added to the thought.
    const toolStyle = findToolStyle(notebook, style.id, "steps");
    assert.exists(toolStyle);
    assert.deepEqual(toolStyle!.data.data, { expr: true });

    // Use the tool
    await notebook.useTool(toolStyle!.id);

    // Check an exposition style was added with the steps.
    const expoStyles = notebook.findChildStylesOfType(0, 'HTML', 'EXPOSITION');
    assert.equal(expoStyles.length, 1);
    assert.equal(expoStyles[0].data, EXPR1_SIMPLIFICATION);

    await notebook.close();
  });

  it(`Adds a 'steps' tool to '${EQUA1}' that adds solution steps`, async function(){

    const notebook = await ServerNotebook.createAnonymous();

    // Create a thought with a MathJS expression input style.
    const styleProps: StyleProperties = { type: 'MATHJS', meaning: 'INPUT', data: EQUA1 };
    const changeRequest: StyleInsertRequest = { type: 'insertStyle', styleProps };
    const changes: NotebookChange[] = await notebook.requestChanges('USER', [changeRequest]);
    const firstChange = changes[0];
    assert(firstChange.type == 'styleInserted');
    const style = (<StyleInserted>firstChange).style;

    // Check that a tool menu was added to the thought.
    const toolStyle = findToolStyle(notebook, style.id, "steps");
    assert.exists(toolStyle);
    assert.deepEqual(toolStyle!.data.data, { expr: false });

    // Use the tool
    await notebook.useTool(toolStyle!.id);

    // Check an exposition style was added with the steps.
    const expoStyles = notebook.findChildStylesOfType(0, 'HTML', 'EXPOSITION');
    assert.equal(expoStyles.length, 1);
    assert.equal(expoStyles[0].data, EQUA1_SOLUTION);

    await notebook.close();
  });

});

// Helper Functions

function findToolStyle(notebook: ServerNotebook, styleId: StyleId, name: ToolName): StyleObject|undefined {
  return notebook.findChildStylesOfType(styleId, 'TOOL').find(s=>s.data.name==name);
}
