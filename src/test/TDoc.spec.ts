// import { hello } from './hello-world';
import { TDoc }  from '../tdoc/tdoc-class';
import { mathSimplifyRule }  from '../tdoc/simplify-math';
import { mathExtractVariablesRule }  from '../tdoc/simplify-math';
import { TDocTextCompiler } from '../tdoc/tdoc-text-comp';

// import { TDocTextCompiler } from '../tdoc/tdoc-text-comp';

// import { expect } from 'chai';
import { assert } from 'chai';
import 'mocha';

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
describe('tdoctextcompiler', function() {
     it('we can create a tdoc from a csv', function() {
       let tdtc = TDocTextCompiler.create();
       assert(tdtc);
       let td = tdtc.createTDocFromText("x = 4, y = 5, x + y = 3");
       assert.equal(td.numStyles("TEXT"),3);
       assert.ok(td);
     });
});


describe('utility computations', function() {
     it('we can create a tdoc from a csv', function() {
       let tdtc = TDocTextCompiler.create();
       let td = tdtc.createTDocFromText("x = 4, y = 5, x + y = 3");
       let s0 = td.getStyles()[0];
       td.createTextStyle(s0,"this is a style on a style");
       assert.ok(td.stylableHasChildOfType(s0,"TEXT"));
       assert.ok(!td.stylableHasChildOfType(s0,"MATH"));
     });
});


describe('style applier', function() {
  describe('math js rule', function() {
    it('we can add a style with a mathjs rule', function() {
      // TODO: Simplify with the text compiler
      let td0 = TDoc.create();
      let th = td0.createThought();
      td0.createMathStyle(th,"2+9");
      td0.createMathStyle(th,"4+5");
      let newStyles = td0.applyRules([mathSimplifyRule,
                                      mathExtractVariablesRule]);
      assert.equal(newStyles.length,2);
      assert.equal(td0.numStyles("MATH"),2);
      assert.equal(td0.numStyles("MATHJSSIMPLIFICATION"),2);
    });
    it('simplifying is idempotent.', function() {
      // TODO: Simplify with the text compiler
      let td0 = TDoc.create();
      let th = td0.createThought();
      td0.createMathStyle(th,"2+9");
      td0.createMathStyle(th,"4+5");
      let firstStyles = td0.applyRules([mathSimplifyRule,
                                        mathExtractVariablesRule]);
      assert.equal(firstStyles.length,2);
      assert.equal(td0.numStyles("MATHJSSIMPLIFICATION"),2);

      let secondStyles = td0.applyRules([mathSimplifyRule,
                                         mathExtractVariablesRule]);
      assert.equal(secondStyles.length,0,"no new styles");
      assert.equal(td0.numStyles("MATHJSSIMPLIFICATION"),2,"simplifcations");
    });
    it('we can do two rules', function() {
      // TODO: Simplify with the text compiler
      let td0 = TDoc.create();
      let th0 = td0.createThought();
      let th1 = td0.createThought();
      let th2 = td0.createThought();
      td0.createMathStyle(th0,"x = 2");
      td0.createMathStyle(th1,"y = 4");
      td0.createMathStyle(th2,"z = x + y");
      let newStyles = td0.applyRules(
        [mathSimplifyRule,
         mathExtractVariablesRule]);
      assert.equal(newStyles.length,5);
      assert.equal(td0.numStyles("MATH"),3);
      assert.equal(td0.numStyles("SYMBOL"),5);
    });
  });
});


describe('variable extraction', function() {
  it('we can extract single variables', function() {
    let td = TDoc.create();
    let th = td.createThought();
    td.createMathStyle(th,"x = 4");
    td.createMathStyle(th,"y = 5");
    let newStyles = td.applyRules([mathExtractVariablesRule]);
    assert.equal(newStyles.length,2);
    assert.equal(td.numStyles("SYMBOL"),2);
  });
});

describe('variable extraction', function() {
  it('we extract multiple variables', function() {
        let td = TDoc.create();
    let th0 = td.createThought();
    let th1 = td.createThought();
    let th2 = td.createThought();
    td.createMathStyle(th0,"x = 4");
    td.createMathStyle(th1,"y = 5");
    td.createMathStyle(th2,"z = x + y");
    // at present, we will be extracting all of these symbols,
    // without regard to the face that some of theme should
    // be treated as the same.
    let newStyles = td.applyRules([mathExtractVariablesRule]);
    assert.equal(newStyles.length,5);
    assert.equal(td.numStyles("SYMBOL"),5);
    });
});
