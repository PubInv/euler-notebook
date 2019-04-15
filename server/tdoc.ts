// LICENSE TBD
// Copyright 2019, Robert L. Read & David Jeschke

// Requirement

import { EventEmitter } from 'events';

import { Jiix, LatexMath, MathJsText, StrokeGroups, StyleObject, StyleMeaning, StyleType, TDocObject, ThoughtObject } from '../client/math-tablet-api';

// Types

type Stylable = Thought|Style;
type StylableId = number;
type StyleRule = (tdoc: TDoc, style: Style)=>Style[];
type TextData = string;

// Constants

// VERSION CHANGES:
// 0.0.1 - Initial version.
// 0.0.2 - Made meaning required on styles.
const VERSION = "0.0.2";

// See https://stackoverflow.com/questions/39142858/declaring-events-in-a-typescript-class-which-extends-eventemitter
export declare interface TDoc {
  on(event: 'styleInserted', listener: (style: Style) => void): this;
  on(event: 'thoughtInserted', listener: (thought: Thought) => void): this;
  on(event: string, listener: Function): this;
}

export class TDoc extends EventEmitter {

  // Public Class Methods

  public static create(): TDoc {
    return new this();
  }

  public static fromJsonObject(obj: TDocObject): TDoc {
    // Validate the object
    if (!obj.nextId) { throw new Error("Invalid TDoc object JSON."); }
    if (obj.version != VERSION) { throw new Error("TDoc in unexpected version."); }

    // Reanimate the thoughts and styles
    const thoughts: Thought[] = obj.thoughts.map(Thought.fromJsonObject);
    const styles: Style[] = obj.styles.map(Style.fromJsonObject);

    // Create the TDoc object from its properties and reanimated thoughts and styles.
    const tDoc = Object.assign(Object.create(TDoc.prototype), { ...obj, styles, thoughts });

    // WARNING: This was not David's original code---I don't know if this is correct or not.
    // TODO: nextId should be restored from the JSON object. Doubt this is the correct fix.
    tDoc.nextId = (tDoc.getStyles().length + tDoc.getThoughts().length) + 1;
    return tDoc;
  }

  // Public Instance Properties

  public version: string;

  public nextId: StylableId;

  // To be used for providing dynamic TDoc scope. Any client may
  // attach data to this object, which is considered volatile (not part
  // of permanent state.
  public clientData: any;

  // Public Instance Methods

  // Applies each rule to each style of the TDoc
  // and returns an array of any new styles that were generated.
  public applyRules(rules: StyleRule[]): Style[] {
    let rval: Style[] = [];
    // IMPORTANT: The rules may add new styles. So capture the current
    //            length of the styles array, and only iterate over
    //            the existing styles. Otherwise, we could get into
    //            an infinite loop.
    for (const style of this.styles) {
      for (const rule of rules) {
        const newStyles = rule(this, style);
        rval = rval.concat(newStyles);
      }
    }
    return rval;
  }

  // This can be asymptotically improved later.
  public stylableHasChildOfType(style: Style, tname: StyleType, meaning?: StyleMeaning): boolean {
    const id = style.id;
    // ROB REVIEW: How about "return !!this.styles.find(s=>...)"
    return this.styles.reduce(
      function(hasOne: boolean, style: Style){
        return hasOne ||
          ((style.stylableId == id) &&
           (style.type == tname) &&
           (!meaning || style.meaning == meaning)
          );
      }, false);
  }

  public insertJiixStyle(stylable: Stylable, data: Jiix, meaning: StyleMeaning): JiixStyle {
    return this.insertStyle(new JiixStyle(this.nextId++, stylable, data, meaning));
  }

  public insertLatexStyle(stylable: Stylable, data: LatexMath, meaning: StyleMeaning): LatexStyle {
    return this.insertStyle(new LatexStyle(this.nextId++, stylable, data, meaning));
  }

  public insertMathJsStyle(stylable: Stylable, data: MathJsText, meaning: StyleMeaning): MathJsStyle {
    return this.insertStyle(new MathJsStyle(this.nextId++, stylable, data, meaning));
  }

  public insertStrokeStyle(stylable: Stylable, data: StrokeGroups, meaning: StyleMeaning): StrokeStyle {
    return this.insertStyle(new StrokeStyle(this.nextId++, stylable, data, meaning));
  }

  public insertTextStyle(stylable: Stylable, data: TextData, meaning: StyleMeaning): TextStyle {
    return this.insertStyle(new TextStyle(this.nextId++, stylable, data, meaning));
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

  public insertThought(): Thought {
    const thought = new Thought(this.nextId++);
    this.thoughts.push(thought);
    this.emit('thoughtInserted', thought);''
    return thought;
  }

  public jsonPrinter(): string {
    return JSON.stringify(this,null,' ');
  }


  public numStyles(tname: StyleType, meaning?: StyleMeaning) : number {
    return this.styles.reduce(
      function(total,x){
        return (x.type == tname && (!meaning || x.meaning == meaning))
          ?
          total+1 : total},
      0);
  }

  public summaryPrinter(): string {
    var numLatex = this.numStyles('LATEX');
    var numMath = this.numStyles('MATHJS');
    var numText = this.numStyles('TEXT');
    return `${this.thoughts.length} thoughts\n`
      + `${this.styles.length} styles\n`
      + `${numLatex} latex styles\n`
      + `${numMath} math styles\n`
      + `${numText} text styles\n`
    ;
  }

  public toObject(): TDocObject {
    // TYPESCRIPT: We are counting on the fact that a StyleObject that has
    // been stringified and then parsed is a StyleObject.
    return <any>this;
  }

  // COMPILERS

  // take a set of comma-separated-values and
  // produce a tdoc full of thoughts; this is
  // useful mostly for testing.
  public addFromText(type: string, text: string): TDoc {
    let ths = text.split(";").map(s=>s.trim());
    // @ts-ignore
    let styleType = STYLE_CLASSES[type];
    ths.forEach(text => {
      let th = this.insertThought();

      // REVIEW: I believe there should be a more elegant way to do this.
      let newst = Object.create(styleType.prototype);
      newst.type = type;
      newst.data = text;
      newst.meaning = 'INPUT';
      newst.stylableId = th.id;
      newst.id = this.nextId++;
      return this.insertStyle(newst);
    });
    return this;
  }

  // --- PRIVATE ---

  // Private Constructor

  private constructor() {
    super();

    this.nextId = 1;
    this.styles = [];
    this.thoughts = [];
    this.version = VERSION;
    this.clientData = [];
  }

  // Private Instance Properties

  private styles: Style[];
  private thoughts: Thought[];

  // Private Instance Methods

  // Helper method for tDoc.create*Style.
  private insertStyle<T extends Style>(style: T): T {
    this.styles.push(style);
    this.emit('styleInserted', style)
    return style;
  }

}

export class Thought {

  public static fromJsonObject(obj: ThoughtObject): Thought {
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

  // Public Instance Methods
  public toObject(): ThoughtObject {
    // TYPESCRIPT: We are counting on the fact that a Thought that has
    // been stringified and then parsed is a ThoughtObject.
    return <any>this;
  }
}

export abstract class Style {

  public static fromJsonObject(obj: StyleObject): Style {
    if (!obj.type) { throw new Error("Invalid Style object JSON"); }
    // @ts-ignore // TYPESCRIPT:
    const cl = STYLE_CLASSES[obj.type];
    if (!cl) { throw new Error(`Style class not found in STYLE_CLASSES: ${obj.type}`); }
    return Object.assign(Object.create(cl.prototype), obj);
  }

  constructor(id: StylableId, stylable: Stylable) {
    this.id = id;
    this.stylableId = stylable.id;
  }

  // Instance Properties
  public id: number;
  public stylableId: number;
  public abstract type: StyleType;
  public abstract data: any;
  public abstract meaning: StyleMeaning;

  // Instance Methods

  public toObject(): StyleObject {
    // TYPESCRIPT: We are counting on the fact that a Style that has
    // been stringified and then parsed is a StyleObject.
    return <any>this;
  }
}

class JiixStyle extends Style {
  // Call tDoc.insertJiixStyle instead of calling this constructor directly.
  /* private */ constructor(id: StylableId, stylable: Stylable, data: Jiix, meaning: StyleMeaning) {
    super(id, stylable);
    this.type = 'JIIX';
    this.data = data;
    this.meaning = meaning;
  }

  // Instance Properties
  type: 'JIIX';
  data: Jiix;
  meaning: StyleMeaning;
}

export class LatexStyle extends Style {
  // Call tDoc.insertLatexStyle instead of calling this constructor directly.
  /* private */ constructor(id: StylableId, stylable: Stylable, data: LatexMath, meaning: StyleMeaning) {
    super(id, stylable);
    this.type = 'LATEX';
    this.data = data;
    this.meaning = meaning;
  }

  // Instance Properties
  type: 'LATEX';
  data: LatexMath;
  meaning: StyleMeaning;
}

export class MathJsStyle extends Style {
  // Call tDoc.insertMathJsPlainStyle instead of calling this constructor directly.
  /* private */ constructor(id: StylableId, stylable: Stylable, data: MathJsText, meaning: StyleMeaning) {
    super(id, stylable);
    this.type = 'MATHJS';
    this.data = data;
    this.meaning = meaning;
  }

  // Instance Properties
  type: 'MATHJS';
  data: MathJsText;
  meaning: StyleMeaning;
}

class StrokeStyle extends Style {
  // Call tDoc.insertStrokeStyle instead of calling this constructor directly.
  /* private */ constructor(id: StylableId, stylable: Stylable, data: StrokeGroups, meaning: StyleMeaning) {
    super(id, stylable);
    this.type = 'STROKE';
    this.data = data;
    this.meaning = meaning;
  }

  // Instance Properties
  type: 'STROKE';
  data: StrokeGroups;
  meaning: StyleMeaning;
}

class TextStyle extends Style {
  // Call tDoc.insertTextStyle instead of calling this constructor directly.
  /* private */ constructor(id: StylableId, stylable: Stylable, data: TextData, meaning: StyleMeaning) {
    super(id, stylable);
    this.type = 'TEXT';
    this.data = data;
    this.meaning = meaning;
  }

  // Instance Properties
  type: 'TEXT';
  data: TextData;
  meaning: StyleMeaning;
}

const STYLE_CLASSES /* : { [type: string]: } */ = {
  'JIIX': JiixStyle,
  'LATEX': LatexStyle,
  'MATHJS': MathJsStyle,
  'STROKE': StrokeStyle,
  'TEXT': TextStyle,
}
