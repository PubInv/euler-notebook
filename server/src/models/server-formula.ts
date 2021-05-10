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

import { LengthInPixels } from "../shared/css";
import { FormulaObject, renderFormula, TypesettingResults } from "../shared/formula";
import { PlotInfo } from "../shared/plot";
import { PresentationMathMlMarkup, PresentationMathMlTree, serializeTreeToMathMlMarkup } from "../shared/presentation-mathml";

import { ExpressionNode, SemanticFormula } from "./semantic-formula";
import { ContentMathMlTree } from "../shared/content-mathml";
import { assert } from "../shared/common";

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

  public static async createFromMathMl(
    presentationMathMlTree: PresentationMathMlTree,
    contentMathMlTree: ContentMathMlTree,
  ): Promise<ServerFormula> {
    return new this({ contentMathMlTree, presentationMathMlTree });
  }

  // Public Class Event Handlers

  // Public Instance Properties

  public obj: FormulaObject;

  // Public Instance Property Functions

  public plotExpression(): ExpressionNode {
    assert(this.plotInfo());
    return this.semanticFormula!.plotExpression();
  }

  public plotInfo(): PlotInfo|false {
    return !!this.semanticFormula &&
           this.semanticFormula.isComplete &&
           this.semanticFormula.plotInfo();
  }

  // public get wolfram(): WolframExpression { return this.obj.wolfram; }

  public get mathMlTree(): PresentationMathMlTree { return this.obj.presentationMathMlTree;}

  public mathMl(): PresentationMathMlMarkup { return serializeTreeToMathMlMarkup(this.obj.presentationMathMlTree); }

  public svg(containerWidth: LengthInPixels): TypesettingResults {
    // REVIEW: Any reason to cache this representations?
    return renderFormula(this.obj, containerWidth);
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

    if (this.obj.contentMathMlTree) {
      this.semanticFormula = SemanticFormula.createFromContentMathMlTree(this.obj.contentMathMlTree);
    }
  }

  // Private Instance Properties

  private semanticFormula?: SemanticFormula;

  // Private Instance Property Functions
  // Private Instance Methods
  // Private Instance Event Handlers

}
