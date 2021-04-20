/*
Euler Notebook
Copyright (C) 2021 Public Invention
https://pubinv.github.io/PubInv/

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

// IMPORTANT: Formulas should be treated as immutable objects.
//            Do not modify formulas in place.
//            Instead, create a new formula.

// Requirements

// import * as debug1 from "debug";
// const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
// const debug = debug1(`server:${MODULE}`);

import { FormulaObject, TypesettingResults } from "../shared/formula";
import { MathMlMarkup, MathMlTree, serializeTreeToMathMlMarkup } from "../shared/mathml";

// import { convertMmltoWolfram } from "../adapters/wolframscript";
import { MathJaxTypesetter } from "../adapters/mathjax-typesetter";
import { LengthInPixels } from "../shared/css";
// import { Jiix } from "../adapters/myscript";

// Types

// Constants

// Global Variables

// Exported Class

export class ServerFormula {

  // Public Class Properties
  // Public Class Property Functions
  // Public Class Methods

  public static createFromObject(obj: FormulaObject): ServerFormula {
    return new this(obj);
  }

  public static createFromMathMlTree(mathMlTree: MathMlTree): ServerFormula {
    // const wolfram = await convertMmltoWolfram(mml);
    return new this({ mathMlTree });
  }

  // Public Class Event Handlers

  // Public Instance Properties

  public obj: FormulaObject;

  // Public Instance Property Functions

  // public get wolfram(): WolframExpression { return this.obj.wolfram; }

  public get mathMlTree(): MathMlTree { return this.obj.mathMlTree;}

  public mathMl(): MathMlMarkup { return serializeTreeToMathMlMarkup(this.obj.mathMlTree); }

  public svg(containerWidth: LengthInPixels): TypesettingResults {
    // REVIEW: Any reason to cache this representations?
    return MathJaxTypesetter.singleton.mathMlTreeToSvg(this.obj.mathMlTree, containerWidth);
  }

  // Public Instance Methods

  // Public Instance Event Handlers

  // --- PRIVATE ---

  // Private Class Properties
  // Private Class Property Functions
  // Private Class Methods
  // Private Class Event Handlers

  // Private Constructor

  private constructor(obj: FormulaObject) {
    // IMPORTANT: We hold on to the object.
    //            Caller must not modify object after passing to constructor.
    this.obj = obj;
  }

  // Private Instance Properties
  // Private Instance Property Functions
  // Private Instance Methods
  // Private Instance Event Handlers

}
