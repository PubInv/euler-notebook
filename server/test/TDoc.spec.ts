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
// const MODULE = __filename.split('/').slice(-1)[0].slice(0,-3);
// const debug = debug1(`server:${MODULE}`);

import { TDoc }  from '../tdoc';

import { assert } from 'chai';
import 'mocha';

describe('tdoc', function() {
  describe('tdoc Structure', function() {
    it('Can create a tdoc', function() {
      let td = TDoc.createAnonymous();
      assert.ok(td);
    });
    it('tdocs have the same version', function() {
      let td0 = TDoc.createAnonymous();
      let td1 = TDoc.createAnonymous();
      assert.equal(td0.version, td1.version);
    });
    it('tdocs can add and retrieve a thought', function() {
      let td0 = TDoc.createAnonymous();
      let th = td0.insertThought({}, -1);
      assert.equal(td0.allThoughts().length, 1);
      assert.equal(td0.allThoughts()[0].id, th.id);
    });
    it('a thought can add and retrieve a style', function() {
      let td0 = TDoc.createAnonymous();
      let th = td0.insertThought({}, -1);
      let st = td0.insertStyle(th, { type: 'TEXT', data: "spud boy", meaning: 'INPUT', source: 'TEST' });
      assert.equal(td0.allThoughts().length, 1);
      assert.equal(td0.allThoughts()[0].id, th.id);
      assert.equal(td0.allStyles().length, 1);
      assert.equal(td0.allStyles()[0].id, st.id);
    });
    it('a style with a source can be added', function() {
      let td0 = TDoc.createAnonymous();
      let th = td0.insertThought({}, -1);
      let st = td0.insertStyle(th, { type: 'TEXT', data: "spud boy", meaning: 'INPUT', source: 'TEST' });
      assert.equal(td0.allThoughts().length, 1);
      assert.equal(td0.allThoughts()[0].id, th.id);
      assert.equal(td0.allStyles().length, 1);
      assert.equal(td0.allStyles()[0].id, st.id);
      assert.equal(td0.allStyles()[0].source, 'TEST');
    });

  });
});

describe('tdoc', function() {
  describe('tdoc Structure', function() {
    it('we can generate a tdoc with a compiler', function() {
      let td = createTDocFromText('TEXT', "x = 4; y = 5; x + y = 3");
      assert.equal(td.allThoughts().length, 3);
    });
  });
});

describe('renderer', function() {
  describe('jsonPrinter', function() {
    it('we can jsonPrint a tdoc', function() {
      let td = createTDocFromText('TEXT',"x = 4; y = 5; x + y = 3");
      let jp = td.jsonPrinter();
      assert.ok(jp);
    });
  });
});

describe('tdoctextcompiler', function() {
  it('we can create a tdoc from a csv', function() {
    let td = createTDocFromText('TEXT', "x = 4; y = 5; x + y = 3");
    let s0s = td.allStyles();
    assert.equal(td.numStyles('TEXT'), 3);
    assert.equal(s0s.length, 3);
    assert.ok(td);
  });
});

describe('utility computations', function() {
  it('we can create a tdoc from a csv (case 2)', function() {
    let td = createTDocFromText('TEXT', "x = 4; y = 5; x + y = 3");
    let s0 = td.allStyles()[0];
    td.insertStyle(s0, { type: 'TEXT', data: "this is a style on a style", meaning: 'EVALUATION', source: 'TEST' })
    assert.ok(td.stylableHasChildOfType(s0, 'TEXT'));
    assert.ok(!td.stylableHasChildOfType(s0, 'LATEX'));
  });
});

// Helper Functions

function createTDocFromText(type: 'MATHJS'|'TEXT', text: string): TDoc {
  const td =  TDoc.createAnonymous();
  const ths = text.split(";").map(s=>s.trim());
  for (text of ths) {
    const th = td.insertThought({}, -1);
    switch(type){
    case 'TEXT':
      td.insertStyle(th, { type: 'TEXT', data: text, meaning: 'INPUT', source: 'TEST' });
      break;
    case 'MATHJS':
      td.insertStyle(th, { type: 'MATHJS', data: text, meaning: 'INPUT', source: 'TEST' });
      break;
    }
  }
  return td;
}

