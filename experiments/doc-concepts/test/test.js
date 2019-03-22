// LICENSE TBD
// Copyright 2019, Robert L. Read

var tdoc = require('../tdoc');

var assert = require('assert');

describe('tdoc', function() {
  describe('tdoc Structure', function() {
      it('Can create a tdoc', function() {
          let td = new tdoc.tdoc();
          assert.ok(td);
    });
      it('tdocs have same version but different ids', function() {
          let td0 = new tdoc.tdoc();
          let td1 = new tdoc.tdoc();          
          assert.equal(td0.semversion,td1.semversion);
          assert.notEqual(td0.id,td1.id);          
    });
      it('can iterate', function() {
          let s0 ="spud,4+5";
          let td = tdoc.textCompiler(s0);
          let si = tdoc.makeStylableIterator(td);
          let result = si.next();
          while (!result.done) {
              assert.ok(result.value);
              result = si.next();
          }
    });
  });
});


describe('compiler', function() {
  describe('initial experiment text thought compiler', function() {
      it('can create a tdoc', function() {
          let s0 ="spud,4+5";
          let td = tdoc.textCompiler(s0);
          assert.ok(td);
          assert.equal(td.thoughts.length,2);          
    });
      it('text style match', function() {
          let s = [];
          s[0] = "spud";
          s[1] = "4+5";
          let sj = s.join();
          
          let td = tdoc.textCompiler(sj);
          assert.equal(td.styles[0].data,s[0]);
          assert.equal(td.styles[1].data,s[1]);                    
    });
  });
});

describe('renderer', function() {
  describe('prettyprinter', function() {
      it('we can prettyprint a tdoc', function() {
          let s0 ="spud,4+5";
          let td = tdoc.textCompiler(s0);
          let pp = tdoc.prettyPrinter(td);
          assert.ok(pp);
    });
  });
});


describe('style applier', function() {
  describe('math js rule', function() {
      it('we can add a style with a mathjs rule', function() {
          let td = new tdoc.tdoc();
          let th = new tdoc.thought();
          td.thoughts.push(th);
          let s0 = new tdoc.mathStyle(th,"2+9");
          let s1 = new tdoc.mathStyle(th,"4+5");
          td.styles.push(s0);
          td.styles.push(s1);          
          let r = tdoc.mathSimplifyRule;
          let tdx = tdoc.applyStyle(td,[r]);
          assert.equal(tdx.styles.length,3);
          let pp = tdoc.prettyPrinter(td);
          assert.ok(pp);
    });
  });
});
