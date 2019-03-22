// LICENSE TBD
// Copyright 2019, Robert L. Read

const VERSION = 0.1;


// I believe this should be replace with: https://www.npmjs.com/package/uuid
var n = 0;
function getNewId() {
    return n++;
}
function tdoc() {
    this.id = getNewId();
    this.thoughts = [];
    this.styles = [];
    this.semversion = VERSION;
}

function thought() {
    this.id = getNewId();    
}

function style(stylable,type,data) {
    this.id = getNewId();
    this.stylable = stylable.id;
    this.type = type;
    this.data = data;
}

function mathStyle(thought,data) {
    style.call(this,thought,"MATH",data);
}

function textStyle(thought,data) {
    style.call(this,thought,"TEXT",data);
}

function makeStylableIterator(td,start = 0, end = Infinity, step = 1) {
    let nextIndex = start;
    let iterationCount = 0;

    const stylableIterator = {
        next: function() {
            let result;
            let tl = td.thoughts.length;
            let sl = td.thoughts.length;                        
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

// PRETTY PRINTER

function prettyPrinter(td) {
    return JSON.stringify(td,null,' ');
}

// STYLE APPLIER
function applyStyle(td,rules) {
    // I would prefer to make a deep copy
    // here, but I don't want to insist
    // on that functionality yet.
    rules.forEach( r => {
          let si = makeStylableIterator(td);
          let result = si.next();
          while (!result.done) {
              console.log("result.value",result.value);
              let rv = r(result.value);
              if (rv) {
                  td.styles.push(rv);
              }
              result = si.next();
          }
    });
    return td;
}

// Attempt to apply a math simplification
// based on the mathjs library
const math = require('mathjs');
function mathSimplifyRule(style) {
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

module.exports = {
    tdoc: tdoc,
    makeStylableIterator:makeStylableIterator,
    thought: thought,
    style: style,
    textCompiler: textCompiler,
    prettyPrinter: prettyPrinter,
    mathStyle: mathStyle,
    textStyle: textStyle,
    applyStyle: applyStyle,
    mathSimplifyRule: mathSimplifyRule
}

