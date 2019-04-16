import { TDoc }  from '../tdoc';
import { mathSimplifyRule }  from '../mathjs-cas';
import { mathExtractVariablesRule }  from '../mathjs-cas';
import { mathEvaluateRule }  from '../mathjs-cas';
import { applyCasRules }  from '../mathjs-cas';
import { TDocTextCompiler } from '../tdoc-text-comp';
import * as math from 'mathjs';

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
      assert.equal(td0.version, td1.version);
    });
    it('tdocs can add and retrieve a thought', function() {
      let td0 = TDoc.create();
      let th = td0.insertThought();
      assert.equal(td0.getThoughts().length, 1);
      assert.equal(td0.getThoughts()[0].id, th.id);
    });
    it('a thought can add and retrieve a style', function() {
      let td0 = TDoc.create();
      let th = td0.insertThought();
      let st = td0.createTextStyle(th, "spud boy", 'INPUT');
      assert.equal(td0.getThoughts().length, 1);
      assert.equal(td0.getThoughts()[0].id, th.id);
      assert.equal(td0.getStyles().length, 1);
      assert.equal(td0.getStyles()[0].id, st.id);
    });
  });
});

describe('tdoc', function() {
  describe('tdoc Structure', function() {
    it('we can generate a tdoc with a compiler', function() {
      let td0 = TDoc.create();
      let td = td0.addFromText('TEXT', "x = 4; y = 5; x + y = 3");
      assert.equal(td.getThoughts().length, 3);
    });
  });
});

describe('renderer', function() {
  describe('jsonPrinter', function() {
    it('we can jsonPrint a tdoc', function() {
      let tdtc = TDocTextCompiler.create();
      assert(tdtc);
      let td = tdtc.createTDocFromText('TEXT',"x = 4; y = 5; x + y = 3");
      let jp = td.jsonPrinter();
      assert.ok(jp);
    });
  });
});

describe('tdoctextcompiler', function() {
     it('we can create a tdoc from a csv', function() {
       let tdtc = TDocTextCompiler.create();
       assert(tdtc);
       let td = tdtc.createTDocFromText('TEXT', "x = 4; y = 5; x + y = 3");
       let s0s = td.getStyles();
       assert.equal(td.numStyles('TEXT'), 3);
       assert.equal(s0s.length, 3);
       assert.ok(td);
     });
});

describe('utility computations', function() {
     it('we can create a tdoc from a csv (case 2)', function() {
       let tdtc = TDocTextCompiler.create();
       let td = tdtc.createTDocFromText('TEXT', "x = 4; y = 5; x + y = 3");
       let s0 = td.getStyles()[0];
       td.createTextStyle(s0, "this is a style on a style", 'EVALUATION');
       assert.ok(td.stylableHasChildOfType(s0, 'TEXT'));
       assert.ok(!td.stylableHasChildOfType(s0, 'LATEX'));
     });
});

describe('style applier', function() {
  describe('math js rule', function() {
    it('we can add a style with a mathjs rule', function() {
      // TODO: Simplify with the text compiler
      let td0 = TDoc.create();
      let th = td0.insertThought();
      td0.insertMathJsStyle(th, "2+9", 'INPUT');
      td0.insertMathJsStyle(th, "4+5", 'INPUT');
      let newStyles = applyCasRules(td0,[mathSimplifyRule, mathExtractVariablesRule]);
      assert.equal(newStyles.length, 4);
      assert.equal(td0.numStyles('MATHJS', 'INPUT'), 2);
      assert.equal(td0.numStyles('MATHJS', 'SIMPLIFICATION'), 2);
    });
    it('simplifying is idempotent.', function() {
      // TODO: Simplify with the text compiler
      let td0 = TDoc.create();
      let th = td0.insertThought();
      td0.insertMathJsStyle(th, "2+9", 'INPUT');
      td0.insertMathJsStyle(th, "4+5", 'INPUT');
      let firstStyles = applyCasRules(td0,[mathSimplifyRule,
                                        mathExtractVariablesRule]);
      assert.equal(firstStyles.length, 4);
      assert.equal(td0.numStyles('MATHJS', 'INPUT'), 2);
      assert.equal(td0.numStyles('MATHJS', 'SIMPLIFICATION'), 2);

      let secondStyles = applyCasRules(td0,[mathSimplifyRule,
                                         mathExtractVariablesRule]);
      assert.equal(secondStyles.length, 0, "no new styles");
      assert.equal(td0.numStyles('MATHJS', 'SIMPLIFICATION'), 2);
    });
    it('we can do two rules', function() {
      // TODO: Simplify with the text compiler
      let td0 = TDoc.create();
      let th0 = td0.insertThought();
      let th1 = td0.insertThought();
      let th2 = td0.insertThought();
      td0.insertMathJsStyle(th0, "x = 2", 'INPUT');
      td0.insertMathJsStyle(th1, "y = 4", 'INPUT');
      td0.insertMathJsStyle(th2, "z = x + y", 'INPUT');
      let newStyles = applyCasRules(td0,
        [mathSimplifyRule,
         mathExtractVariablesRule]);
      assert.equal(newStyles.length, 5);
      assert.equal(td0.numStyles('MATHJS', 'INPUT'), 3);
      assert.equal(td0.numStyles('MATHJS', 'SYMBOL'), 5);
    });
  });
});


describe('variable extraction', function() {
  it('we can extract single variables', function() {
    let td = TDoc.create();
    let th = td.insertThought();
    td.insertMathJsStyle(th, "x = 4", 'INPUT');
    td.insertMathJsStyle(th, "y = 5", 'INPUT');
    let newStyles = applyCasRules(td,[mathExtractVariablesRule]);
    assert.equal(newStyles.length, 2);
    assert.equal(td.numStyles('MATHJS', "SYMBOL"), 2);
  });
});

describe('variable extraction', function() {
  it('we extract multiple variables', function() {
        let td = TDoc.create();
    let th0 = td.insertThought();
    let th1 = td.insertThought();
    let th2 = td.insertThought();
    td.insertMathJsStyle(th0, "x = 4", 'INPUT');
    td.insertMathJsStyle(th1, "y = 5", 'INPUT');
    td.insertMathJsStyle(th2, "z = x + y", 'INPUT');
    // at present, we will be extracting all of these symbols,
    // without regard to the face that some of theme should
    // be treated as the same.
    let newStyles = applyCasRules(td,[mathExtractVariablesRule]);
    assert.equal(newStyles.length, 5);
    assert.equal(td.numStyles('MATHJS', "SYMBOL"), 5);
    });
});

describe('manipulate plain ascii styles', function() {
  // This is just to exercise the style createMathJsPlain
  it('we can create and simplify plain ascii styles', function() {
    let td = TDoc.create();
    let th0 = td.insertThought();
    let th1 = td.insertThought();
    // Here we create new styles
    td.insertMathJsStyle(th0, "3x + 4x", 'INPUT');
    td.insertMathJsStyle(th1, "4 + 5", 'INPUT');
    let newStyles = applyCasRules(td,[ mathSimplifyRule ]);
    assert.equal(newStyles.length, 4);
  });
  it('the MathJsPlainStyle style simplifies 3 + 7', function() {
    let td0 = TDoc.create();
    let th0 = td0.insertThought();
    td0.insertMathJsStyle(th0, "3+7", 'INPUT');
    let newStylesMathJs = applyCasRules(td0,[mathSimplifyRule]);
    assert.equal(newStylesMathJs.length, 2);
  });
  it('we can do basic things with mathjs parser', function() {
    // create a parser
    const parser = math.parser()

    // evaluate expressions
    assert.equal(parser.eval('sqrt(3^2 + 4^2)'),5);
    assert.equal(parser.eval('sqrt(-4)'),"2i");
    assert.equal(parser.eval('2 inch to cm'),"5.08 cm");
    assert.equal(parser.eval('cos(45 deg)'),"0.7071067811865476");

  });
  it('we can operate on multiple expressions with mathjs parser', function() {
    // create a parser
    const parser = math.parser()

    // semicolons return last!
    let semi = parser.eval('sqrt(3^2 + 4^2);sqrt(-4);4'); // 5, 2i

    assert.equal(semi.entries[0], 4);

    // commas fail!
    try {
      parser.eval('sqrt(3^2 + 4^2), sqrt(-4), 4');
      assert.fail();
    } catch {
      assert.ok(true);
    }

    // define variables and functions
    assert.equal(parser.eval('x = 7 / 2'), 3.5); // 3.5
    assert.equal(parser.eval('x + 3'), 6.5); // 6.5
    // This does in fact produce a return value, but it is
    // easier to test the result below...
    parser.eval('f2(x, y) = x^y');
    assert.equal(parser.eval('f2(2, 3)'),8); // 8

    // now let's try to leave some variables underdefined
    parser.clear();
    try {
      parser.eval('z = x + y');
    } catch {
      assert.ok(true);
    }
    try {
      console.log('Z = X + 4', parser.eval('z = x + 4'));
    } catch {
      assert.ok(true);
    }
    try {
      console.log('Z', parser.eval('z'));
    } catch {
      assert.ok(true);
    }

  });
  it('we can meaningly perform an evaluation against an entire tdoc', function() {
    {
      let tdtc = TDocTextCompiler.create();
      let td = tdtc.createTDocFromText("MATHJS", "x = 4; y = 5; z = x + y");
      let evaluations = applyCasRules(td,[mathEvaluateRule]);
      assert.equal(evaluations[2].data, 9);
    }
  });

  it.skip('we can meaningly perform an entire tdoc without any special order!', function() {
    {
      let tdtc = TDocTextCompiler.create();
      // NOTE THE ORDER HERE!!!
      let td = tdtc.createTDocFromText("MATHJS", "x = 4; z = x + y; y = 5");
      let evaluations = applyCasRules(td,[mathEvaluateRule]);
      assert.equal(evaluations[2].data, 9);
    }
  });
});
