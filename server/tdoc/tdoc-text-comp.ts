// LICENSE: TBD
// Copyright 2019, Robert L. Read  & David Jeschke

// TDocTextCompiler - take a set of comma-separated-values and
// produce a tdoc full of thoughts; this is
// useful mostly for testing.

import { TDoc }  from './tdoc-class';

const VERSION = "0.1.0";

export class TDocTextCompiler {

  public static create(): TDocTextCompiler {
    return new this();
  }

  // take a set of comma-separated-values and
  // produce a tdoc full of thoughts; this is
  // useful mostly for testing.
  public createTDocFromText(styleTypeName: string, text: string): TDoc {
    let td0 =  TDoc.create();
    let td = td0.addFromText(styleTypeName, text);
    return td;
  }

  public version: string;

    // --- PRIVATE ---

  // Private Constructor

  private constructor() {
    this.version = VERSION;
  }

}
