// LICENSE TBD
// Copyright 2019, Robert L. Read
// var math = require('math');

const VERSION = 0.2; // DANGER! Version 0.1 still exists in a different directory

// I believe this should be replace with: https://www.npmjs.com/package/uuid
var n = 0;
function getNewId() {
    return n++;
}
export function tdoc() {
    this.id = getNewId();
    this.thoughts = [];
    this.styles = [];
    this.semversion = VERSION;
}

export function thought() {
    this.id = getNewId();    
}

function style(stylable,type,data) {
    this.id = getNewId();
    this.stylable = stylable.id;
    this.type = type;
    this.data = data;
}

export function mathStyle(thought,data) {
    style.call(this,thought,"MATH",data);
}

export function textStyle(thought,data) {
    style.call(this,thought,"TEXT",data);
}

export function jiixStyle(thought,data) {
    style.call(this,thought,"JIIX",data);
}

export function strokeGroupsStyle(thought,data) {
    style.call(this,thought,"STKG",data);
}

function makeStylableIterator(td,start = 0, end = Infinity, step = 1) {
    let nextIndex = start;
    let iterationCount = 0;

    const stylableIterator = {
        next: function() {
            let result;
            let tl = td.thoughts.length;
            let sl = td.styles.length;                        
            if (nextIndex < (tl+sl)) {
                var v;
                if (nextIndex < tl) {
                    v = td.thoughts[nextIndex];
                } else {
                    v = td.styles[nextIndex - tl];
                }
                result = { value: v, done: false }
                nextIndex += step;
                iterationCount++;
                return result;
            } else {
                return {value: null, done: true};
            }
        }
    };
    return stylableIterator;
}

// INITIAL COMPILER

// Take a comma separated string and produce a tdoc
function textCompiler(text) {
    let td = new tdoc();
    var array = text.split(',');
    array.forEach(txt => {
        let thot = new thought();
        td.thoughts.push(thot);
        td.styles.push(new textStyle(thot,txt));
    }
    );
    return td;
}

// PRETTY PRINTER AND INFORMATIONAL FUNCTIONS

export function prettyPrinter(td) {
    return JSON.stringify(td,null,' ');
}

export function numMathStyles(td) {
  return td.styles.reduce(
    function(total,x){return x.type=="MATH" ? total+1 : total},
    0);
}
export function numTextStyles(td) {
  return td.styles.reduce(
    function(total,x){return x.type=="TEXT" ? total+1 : total},
    0);
}


export function summaryPrinter(td) {
  var numMath = numMathStyles(td);
  var numText = numTextStyles(td);
  return `${td.thoughts.length} thoughts\n`
    + `${td.styles.length} styles\n`
    + `${numMath} math styles\n`
    + `${numText} text styles\n`
  ;
}

// STYLE APPLIER
export function applyStyle(td,rules) {
  // I would prefer to make a deep copy
  // here, but I don't want to insist
  // on that functionality yet.
  var new_styles = [];
  rules.forEach( r => {
    let si = makeStylableIterator(td);
    let result = si.next();
    while (!result.done) {
      console.log("result.value",result.value);
      let rv = r(result.value);
      if (rv) {
        new_styles.push(rv);
      }
      result = si.next();
    }
  });
  td.styles = td.styles.concat(new_styles);
  return td;
}

// Attempt to apply a math simplification
// based on the mathjs library
// const math = require('mathjs');
export function mathSimplifyRule(style) {
    console.log("style to simplify",style);
    if ((((typeof style.data) == 'undefined'))
        || (style.type != "MATH")) {
        return null;
    }
    console.log("Style.data",style.data);
    let simpler = math.simplify(style.data);
    // TBD--I have no idea what the failure mode here is.
    console.log(simpler);
    let SUCCESS = true;
    return (SUCCESS) ?
        new mathStyle(style,simpler)
        : null;
}

// This needs to be worked out as to what the best module
// system is.
// module.exports = {
//     tdoc: tdoc,
//     makeStylableIterator:makeStylableIterator,
//     thought: thought,
//     style: style,
//     textCompiler: textCompiler,
//     prettyPrinter: prettyPrinter,
//     mathStyle: mathStyle,
//     textStyle: textStyle,
//     applyStyle: applyStyle,
//     mathSimplifyRule: mathSimplifyRule
// }

