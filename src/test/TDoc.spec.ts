import { hello } from './hello-world';
import { TDoc}  from '../public/javascripts/tdoc-class';
import { mathSimplifyRule }  from '../public/javascripts/tdoc-math';

// import { TDocTextCompiler } from '../public/javascripts/tdoc-text-comp';

// import { expect } from 'chai';
import { assert } from 'chai';
import 'mocha';

describe('helloworld', function() {
  it('returns a value', function() {
    assert(hello());
  });
});

describe('tdoc', function() {
  describe('tdoc Structure', function() {
    it('Can create a tdoc', function() {
      let td = TDoc.create();
      assert.ok(td);
    });
    it('tdocs have the same version', function() {
      let td0 = TDoc.create();
      let td1 = TDoc.create();          
      assert.equal(td0.version,td1.version);
    });
    it('tdocs can add and retrieve a thought', function() {
      let td0 = TDoc.create();
      let th = td0.createThought();          
      assert.equal(td0.getThoughts().length,1);
      assert.equal(td0.getThoughts()[0].id,th.id);      
    });
    it('a thought can add and retrieve a style', function() {
      let td0 = TDoc.create();
      let th = td0.createThought();
      let st = td0.createTextStyle(th,"spud boy");
      assert.equal(td0.getThoughts().length,1);
      assert.equal(td0.getThoughts()[0].id,th.id);
      assert.equal(td0.getStyles().length,1);      
      assert.equal(td0.getStyles()[0].id,st.id);            
    });
  });
});

describe('tdoc', function() {
  describe('tdoc Structure', function() {
    it('we can generate a tdoc with a compiler', function() {
      let td0 = TDoc.create();            
      let td = td0.addFromText("x = 4, y = 5, x + y = 3");
      assert.equal(td.getThoughts().length,3);
    });
  });
});

// describe('renderer', function() {
//   describe('jsonPrinter', function() {
//     it('we can jsonPrint a tdoc', function() {
//       let tdtc = TDocTextCompiler.create();
//       assert(tdtc);
//       let td = tdtc.createTDocFromText("x = 4, y = 5, x + y = 3");
//       let jp = td.jsonPrinter();
//       assert.ok(jp);
//     });
//   });
//   describe('summaryPrinter', function() {
//     it('we can summaryPrint a tdoc', function() {
//       let tdtc = TDocTextCompiler.create();
      
//       assert(tdtc);
//       let td = tdtc.createTDocFromText("x = 4, y = 5, x + y = 3");
//       let jp = td.summaryPrinter();
//       assert.ok(jp);
//     });
//   });
// });


describe('style applier', function() {
  describe('math js rule', function() {
    it('we can add a style with a mathjs rule', function() {
      let td0 = TDoc.create();      
      let th = td0.createThought();
      td0.createMathStyle(th,"2+9");
      td0.createMathStyle(th,"4+5");      
      let newStyles = td0.applyRules([mathSimplifyRule]);
      console.log(newStyles);
      assert.equal(newStyles.length,2);
      assert.equal(td0.numStyles("MATH"),4);
    });
  });
});
