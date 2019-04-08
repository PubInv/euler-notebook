// import { hello } from './hello-world';
import { TDoc }  from '../tdoc/tdoc-class';
import { mathSimplifyRule }  from '../tdoc/simplify-math';
import { mathExtractVariablesRule }  from '../tdoc/simplify-math';
import { TDocTextCompiler } from '../tdoc/tdoc-text-comp';
import * as math from 'mathjs';

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
       assert.ok(!td.stylableHasChildOfType(s0,"LATEX"));
     });
});


describe('style applier', function() {
  describe('math js rule', function() {
    it('we can add a style with a mathjs rule', function() {
      // TODO: Simplify with the text compiler
      let td0 = TDoc.create();
      let th = td0.createThought();
      td0.createLatexStyle(th,"2+9");
      td0.createLatexStyle(th,"4+5");
      let newStyles = td0.applyRules([mathSimplifyRule,
                                      mathExtractVariablesRule]);
      assert.equal(newStyles.length,2);
      assert.equal(td0.numStyles("LATEX"),2);
      assert.equal(td0.numStyles("MATHJSSIMPLIFICATION"),2);
    });
    it('simplifying is idempotent.', function() {
      // TODO: Simplify with the text compiler
      let td0 = TDoc.create();
      let th = td0.createThought();
      td0.createLatexStyle(th,"2+9");
      td0.createLatexStyle(th,"4+5");
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
      td0.createLatexStyle(th0,"x = 2");
      td0.createLatexStyle(th1,"y = 4");
      td0.createLatexStyle(th2,"z = x + y");
      let newStyles = td0.applyRules(
        [mathSimplifyRule,
         mathExtractVariablesRule]);
      assert.equal(newStyles.length,5);
      assert.equal(td0.numStyles("LATEX"),3);
      assert.equal(td0.numStyles("SYMBOL"),5);
    });
  });
});


describe('variable extraction', function() {
  it('we can extract single variables', function() {
    let td = TDoc.create();
    let th = td.createThought();
    td.createLatexStyle(th,"x = 4");
    td.createLatexStyle(th,"y = 5");
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
    td.createLatexStyle(th0,"x = 4");
    td.createLatexStyle(th1,"y = 5");
    td.createLatexStyle(th2,"z = x + y");
    // at present, we will be extracting all of these symbols,
    // without regard to the face that some of theme should
    // be treated as the same.
    let newStyles = td.applyRules([mathExtractVariablesRule]);
    assert.equal(newStyles.length,5);
    assert.equal(td.numStyles("SYMBOL"),5);
    });
});

describe('manipulate plain ascii styles', function() {
  // This is just to exercise the style createMathJsPlain
  it('we can create and simplify plain ascii styles', function() {
    let td = TDoc.create();
    let th0 = td.createThought();
    let th1 = td.createThought();
    // Here we create new styles
    td.createMathJsPlainStyle(th0,"3x + 4x");
    td.createMathJsPlainStyle(th1,"4 + 5");
    let newStyles = td.applyRules([mathSimplifyRule,
                                  ]);
    assert.equal(newStyles.length,2,"JsPlainStyle was not simplifiable");
  });
  it('the MathJsPlainStyle style produces the same reults as the LatexStyle', function() {
    let td0 = TDoc.create();
    let td1= TDoc.create();
    let th0 = td0.createThought();
    let th1 = td1.createThought();
    td0.createMathJsPlainStyle(th0,"3x+10x");
    td1.createLatexStyle(th1,"3x+10x");
    let newStylesMathJs = td0.applyRules([mathSimplifyRule,
                                         mathExtractVariablesRule]);
    let newStylesLatex = td1.applyRules([mathSimplifyRule,
                                        mathExtractVariablesRule]);
    assert.equal(newStylesMathJs.length,newStylesLatex.length);
  });
  it('we can do basic things with mathjs parser', function() {
    // create a parser
    const parser = math.parser()

    // evaluate expressions
    console.log(parser.eval('sqrt(3^2 + 4^2)'));          // 5
    console.log(parser.eval('sqrt(-4)'));                 // 2i
    console.log(parser.eval('2 inch to cm'));             // 5.08 cm
    console.log(parser.eval('cos(45 deg)'));              // 0.7071067811865476

  });
  it('we can operate on multiple expressions with mathjs parser', function() {
    // create a parser
    const parser = math.parser()

    // semicolons return last!
    let semi = parser.eval('sqrt(3^2 + 4^2);sqrt(-4);4'); // 5,2i
    console.log("semicolons:",semi.entries[0]);
    assert.equal(semi.entries[0],4);

    // commas fail!
    try {
      let multiple = parser.eval('sqrt(3^2 + 4^2),sqrt(-4),4');
      console.log(multiple);
      assert.fail();
    } catch {
      assert.ok(true);
    }

    // define variables and functions
    console.log('\ndefine variables and functions')
    console.log(parser.eval('x = 7 / 2')) // 3.5
    console.log(parser.eval('x + 3')) // 6.5
    console.log(parser.eval('f2(x, y) = x^y')) // f2(x, y)
    console.log(parser.eval('f2(2, 3)')) // 8

    assert.equal(parser.eval('f2(2, 3)'),8);


    // now let's try to leave some variables underdefined
    parser.clear();
    try {
      console.log('BEGUN A');
      console.log('Z = X + Y',parser.eval('z = x + y'));
      console.log('FINISHED A');
    } catch {
    }
    try {
      console.log('BEGUN B');
      console.log('Z = X + 4',parser.eval('z = x + 4'));
      console.log('FINISHED B');
    } catch {
    }
    console.log('X = 4',parser.eval('x = 4'));
    try {
      console.log('Z',parser.eval('z'));
    } catch {
      assert.ok(true);
    }

  });
});
