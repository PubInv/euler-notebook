// LICENSE TBD
// Copyright 2019, Robert L. Read & David Jeschke

// External Globals

declare var math: /* TYPESCRIPT: mathjs types? */ any;

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
  // Call tDoc.createThought instead of calling this constructor directly.
  /* private */ constructor(id: StylableId) {
    this.id = id;
  }

  // Public Instance Properties
  public id: StylableId;
}

abstract class Style {
  constructor(id: StylableId, stylable: Stylable) {
    this.id = id;
    this.stylableId = stylable.id;
  }

  // Instance Properties
  id: number;
  stylableId: number;
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

class MathStyle extends Style {
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

// Attempt math.js-based simplification
// TODO: math.js works on ascii math, whereas the
export function mathSimplifyRule(tdoc: TDoc, style: Style): Style|undefined {
  if (!(style instanceof MathStyle)) { return undefined; }
  const simpler = math.simplify(style.data);
  if (!simpler) { return undefined; }
  // TODO: This creates math styles with mathjs node data,
  //       whereas math style data elsewhere is a LaTeX string.
  return tdoc.createMathStyle(style, simpler);
}
