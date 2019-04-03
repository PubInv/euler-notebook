// LICENSE TBD
// Copyright 2019, Robert L. Read & David Jeschke

// External Globals
// var math = require("./math-5.8.0.js");


// declare var math: /* TYPESCRIPT: mathjs types? */ any;

// Types

type MathData = string;
type StrokeData = string;
type Stylable = Thought|Style;
type StylableId = number;
type StyleRule = (tdoc: TDoc, style: Style)=>Style|undefined;
type TextData = string;
type JiixData = string;

// Constants

const VERSION = "0.3.0";

export class TDoc {

  // Public Class Methods

  public static create(): TDoc {
    return new this();
  }

  public static fromJsonObject(obj): TDoc {
    // Validate the object
    if (!obj.nextId) { throw new Error("Invalid TDoc object JSON."); }
    if (obj.version != VERSION) { throw new Error("TDoc in unexpected version."); }

    // Reanimate the thoughts and styles
    const thoughts: Thought[] = obj.thoughts.map(Thought.fromJsonObject);
    const styles: Style[] = obj.styles.map(Style.fromJsonObject);

    // Create the TDoc object from its properties and reanimated thoughts and styles.
    const tDoc = Object.assign(Object.create(TDoc.prototype), { ...obj, styles, thoughts });
    return tDoc;
  }

  // Public Instance Properties

  public version: string;

  // Public Instance Methods

  // Applies each rule to each style of the TDoc
  // and returns an array of any new styles that were generated.
  public applyRules(rules: StyleRule[]): Style[] {
    const rval: Style[] = [];
    // IMPORTANT: The rules may add new styles. So capture the current
    //            length of the styles array, and only iterate over
    //            the existing styles. Otherwise, we could get into
    //            an infinite loop.
    const len = this.styles.length;
    for (let i=0; i<len; i++) {
      const style = this.styles[i];
      for (const rule of rules) {
        const newStyle = rule(this, style);
        if (newStyle) { rval.push(newStyle); }
      }
    }
    return rval;
  }

  public createJiixStyle(stylable: Stylable, data: JiixData): JiixStyle {
    return this.addStyle(new JiixStyle(this.nextId++, stylable, data));
  }

  public createMathStyle(stylable: Stylable, data: MathData): MathStyle {
    return this.addStyle(new MathStyle(this.nextId++, stylable, data));
  }

  public createStrokeStyle(stylable: Stylable, data: StrokeData): StrokeStyle {
    return this.addStyle(new StrokeStyle(this.nextId++, stylable, data));
  }

  public createTextStyle(stylable: Stylable, data: TextData): TextStyle {
    return this.addStyle(new TextStyle(this.nextId++, stylable, data));
  }

  public createThought(): Thought {
    const rval = new Thought(this.nextId++);
    this.thoughts.push(rval);
    return rval;
  }


  // ENUMERATION AND INTERROGATION
  // We need a way to interrogate a TDoc. There are lots of
  // approaches here; I expect this to be constantly evolving.
  // In particular, dej has suggested accessing styles via
  // the thoughts they annotate; this seems like a good idea. -rlr
  public getThoughts(): Thought[] {
    return this.thoughts;
  }

  public getStyles(): Style[] {
    return this.styles;
  }

  public jsonPrinter(): string {
    return JSON.stringify(this,null,' ');
  }


  public numStyles(tname: string) : number {
    return this.styles.reduce(
      function(total,x){
        return (x.type == tname)
          ?
          total+1 : total},
      0);
  }

  public summaryPrinter(): string {
    var numMath = this.numStyles("MATH");
    var numText = this.numStyles("TEXT");
    return `${this.thoughts.length} thoughts\n`
      + `${this.styles.length} styles\n`
      + `${numMath} math styles\n`
      + `${numText} text styles\n`
    ;
  }
  // COMPILERS

    // take a set of comma-separated-values and
  // produce a tdoc full of thoughts; this is
  // useful mostly for testing.
  public addFromText(text: string): TDoc {
    let ths = text.split(",");
    ths.forEach(text => { let th = this.createThought();
                          this.createTextStyle(th,text);
                        });
    return this;
  }

  // --- PRIVATE ---

  // Private Constructor

  private constructor() {
    this.nextId = 1;
    this.styles = [];
    this.thoughts = [];
    this.version = VERSION;
  }

  // Private Instance Properties

  private nextId: StylableId;
  private styles: Style[];
  private thoughts: Thought[];

  // Private Instance Methods

  // Helper method for tDoc.create*Style.
  private addStyle<T extends Style>(style: T): T {
    this.styles.push(style);
    return style;
  }

}

class Thought {

  public static fromJsonObject(obj): Thought {
    // NOTE: This will throw for id === 0.
    if (!obj.id) { throw new Error("Invalid Thought object JSON"); }
    return Object.assign(Object.create(Thought.prototype), obj);
  }

  // Call tDoc.createThought instead of calling this constructor directly.
  /* private */ constructor(id: StylableId) {
    this.id = id;
  }

  // Public Instance Properties
  public id: StylableId;
}

export abstract class Style {

  public static fromJsonObject(obj): Style {
    if (!obj.type) { throw new Error("Invalid Style object JSON"); }
    const cl = STYLE_CLASSES[obj.type];
    return Object.assign(Object.create(cl.prototype), obj);
  }

  constructor(id: StylableId, stylable: Stylable) {
    this.id = id;
    this.stylableId = stylable.id;
    this.type = 'abstract';
  }

  // Instance Properties
  id: number;
  stylableId: number;
  type: string;
}

class JiixStyle extends Style {
  // Call tDoc.createJiixStyle instead of calling this constructor directly.
  /* private */ constructor(id: StylableId, stylable: Stylable, data: JiixData) {
    super(id, stylable);
    this.type = 'JIIX';
    this.data = data;
  }

  // Instance Properties
  type: 'JIIX';
  data: JiixData;
}

export class MathStyle extends Style {
  // Call tDoc.createMathStyle instead of calling this constructor directly.
  /* private */ constructor(id: StylableId, stylable: Stylable, data: MathData) {
    super(id, stylable);
    this.type = 'MATH';
    this.data = data;
  }

  // Instance Properties
  type: 'MATH';
  data: MathData;
}

class StrokeStyle extends Style {
  // Call tDoc.createStrokeStyle instead of calling this constructor directly.
  /* private */ constructor(id: StylableId, stylable: Stylable, data: StrokeData) {
    super(id, stylable);
    this.type = 'STROKE';
    this.data = data;
  }

  // Instance Properties
  type: 'STROKE';
  data: StrokeData;
}

class TextStyle extends Style {
  // Call tDoc.createTextStyle instead of calling this constructor directly.
  /* private */ constructor(id: StylableId, stylable: Stylable, data: TextData) {
    super(id, stylable);
    this.type = 'TEXT';
    this.data = data;
  }

  // Instance Properties
  type: 'TEXT';
  data: TextData;
}

const STYLE_CLASSES = {
  'JIIX': JiixStyle,
  'MATH': MathStyle,
  'STROKE': StrokeStyle,
  'TEXT': TextStyle,
}

// here we will place known client side rules;
// server side rules will be handled differently.
export function getKnownClientSideRules(): StyleRule[]  {
  return [];
}
