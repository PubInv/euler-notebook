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

// Requirements

import { assert, assertFalse } from "../shared/common";
import { Apply, ContentMathMlNode, ContentMathMlTree } from "../shared/content-mathml";
import { FormulaSymbol, WolframExpression } from "../shared/formula";
import { PlotInfo } from "../shared/plot";

// Types

// Constants

// Global Variables

// Exported Class

export abstract class SemanticFormula {

  // Public Class Properties
  // Public Class Property Functions

  // Public Class Methods

  public static createFromContentMathMlTree(tree: ContentMathMlTree): SemanticFormula {
    return tree.child ? this.createFromContentMathMlNode(tree.child) : new MissingNode();
  }

  // Public Class Event Handlers
  // Public Instance Properties

  // Public Instance Property Functions

  public /* overridable */ get isEquation(): boolean { return false; }
  public /* overridable */ get isExpression(): boolean { return true; }
  public /* overridable */ get isIdentifier(): boolean { return false; }
  public /* overridable */ get isRelation(): boolean { return false; }

  public /* overridable */ identifiers(): FormulaSymbol[] {
    return [];
  }

  public numIdentifiers(): number {
    const identifiers = this.identifiers;
    return identifiers.length;
  }

  public abstract plotExpression(): ExpressionNode;
  public abstract plotInfo(): PlotInfo|undefined;
  public abstract wolframExpression(): WolframExpression;

  // Public Instance Methods
  // Public Instance Event Handlers

  // --- PRIVATE ---

  // Private Class Properties
  // Private Class Property Functions

  // Private Class Methods

  private static createFromApplyNode(node: Apply): SemanticFormula {
    let rval: SemanticFormula;
    const { operator, operands } = node;
    switch (operator.tag) {

      // One operand
      case 'factorial':
      case 'root': {
        assert(operands.length == 1);
        const op1 = this.createFromContentMathMlNode(operands[0]);
        let cls /* TYPESCRIPT: */;
        switch(operator.tag) {
          case 'factorial': cls = FactorialNode; break;
          case 'root': cls = RootNode; break;
        }
        rval = new cls(op1);
        break;
      }

      // Two operands
      case 'eq':
      case 'geq':
      case 'gt':
      case 'leq':
      case 'lt':
      case 'neq':
      case 'power':
      case 'quotient': {
        assert(operands.length == 2);
        const op1 = this.createFromContentMathMlNode(operands[0]);
        assert(op1 instanceof ExpressionNode);
        const op2 = this.createFromContentMathMlNode(operands[1]);
        assert(op2 instanceof ExpressionNode);
        let cls /* TYPESCRIPT: */;
        switch (operator.tag) {
          case 'eq': cls = EqualsNode; break;
          case 'geq': cls = GreaterThanOrEqualToNode; break;
          case 'gt': cls = GreaterThanNode; break;
          case 'leq': cls = LessThanOrEqualToNode; break;
          case 'lt': cls = LessThanNode; break;
          case 'neq': cls = NotEqualsNode; break;
          case 'power': cls = PowerNode; break;
          case 'quotient': cls = QuotientNode; break;
        }
        rval = new cls(op1, op2);
        break;
      }

      // Two or more operands
      case 'plus':
      case 'times': {
        assert(operands.length >= 2);
        const semOperands = operands.map(operand=>this.createFromContentMathMlNode(operand));
        let cls /* TYPESCRIPT: */;
        switch (operator.tag) {
          case 'plus': cls = PlusNode; break;
          case 'times': cls = TimesNode; break;
        }
        rval = new cls(semOperands);
        break;
      }

      // Other cases

      case 'minus':  {
        // Can be unary minus or binary minus.
        if (operands.length == 1) {
          const operand = this.createFromContentMathMlNode(operands[0]);
          rval = new UnaryMinusNode(operand);
        } else if (operands.length == 2) {
          const minuend = this.createFromContentMathMlNode(operands[0]);
          const subtrahend = this.createFromContentMathMlNode(operands[1]);
          rval = new MinusNode(minuend, subtrahend);
        } else {
          assertFalse();
        }
        break;
      }

      default:
       throw new Error(`Creating from applied '${operator.tag}' nodes not yet implemented.`)
    }
    return rval;
  }

  private static createFromContentMathMlNode(node: ContentMathMlNode): SemanticFormula {
    let rval: SemanticFormula;
    switch(node.tag) {
      case 'apply': rval = this.createFromApplyNode(node); break;
      case 'ci': rval = new IdentifierNode(<FormulaSymbol>node.identifier); break;
      case 'cn': rval = new NumberNode(node.value); break;
      case 'math': assertFalse();
      default:
        throw new Error(`Creating from '${node.tag}' nodes not yet implemented.`);
    }
    return rval;
  }

  // Private Class Event Handlers

  // Private Constructor

  // Private Instance Properties
  // Private Instance Property Functions
  // Private Instance Methods
  // Private Instance Event Handlers

}

// Additional Classes

export abstract class ExpressionNode extends SemanticFormula {
  public /* override */ plotExpression(): ExpressionNode { return this; }
}

abstract class InteriorExpressionNode extends ExpressionNode {
  public abstract children(): ExpressionNode[]; /* LATER: ExpressionNode Iterator instead? */
  public /* override */ plotInfo(): PlotInfo|undefined {
    const children = this.children();
    if (children.length == 0) { return undefined; }
    else {
      const child0 = children[0];
      const plotInfo = child0.plotInfo();
      if (children.length == 1) { return plotInfo; }
      else {
        return children.slice(1).reduce((plotInfo1: PlotInfo|undefined, child2: ExpressionNode): PlotInfo|undefined=>{
          const plotInfo2 = child2.plotInfo();
          if (!plotInfo1 || !plotInfo2) { return undefined; }
          switch(plotInfo1.type) {
            case 'constant': return plotInfo2;
            case 'univariate': {
              switch(plotInfo2.type) {
                case 'constant': return plotInfo1;
                case 'univariate': {
                  if (plotInfo1.xAxisIdentifier == plotInfo2.xAxisIdentifier) { return plotInfo1; }
                  else { return { type: 'bivariate', xAxisIdentifier: plotInfo1.xAxisIdentifier, zAxisIdentifier: plotInfo2.xAxisIdentifier }; }
                }
                case 'bivariate': {
                  if (plotInfo1.xAxisIdentifier == plotInfo2.xAxisIdentifier || plotInfo1.xAxisIdentifier == plotInfo2.zAxisIdentifier) {
                    return plotInfo2;
                  } else {
                    return undefined; // Expression is trivariate. Cannot plot.
                  }
                  break;
                }
              }
              break;
            }
            case 'bivariate': {
              switch(plotInfo2.type) {
                case 'constant': return plotInfo1;
                case 'univariate': {
                  if (plotInfo2.xAxisIdentifier == plotInfo1.xAxisIdentifier || plotInfo2.xAxisIdentifier == plotInfo1.zAxisIdentifier) {
                    return plotInfo1;
                  } else {
                    return undefined; // Expression is trivariate. Cannot plot.
                  }
                }
                case 'bivariate': {
                  if ((plotInfo1.xAxisIdentifier == plotInfo2.xAxisIdentifier && plotInfo1.zAxisIdentifier == plotInfo2.zAxisIdentifier) ||
                      (plotInfo1.xAxisIdentifier == plotInfo2.zAxisIdentifier && plotInfo1.zAxisIdentifier == plotInfo2.xAxisIdentifier)) {
                    return plotInfo1;
                  } else {
                    return undefined; // Expression is trivariate+. Cannot plot.
                  }
                  break;
                }
              }
              break;
            }
          }
        }, plotInfo);
      }
    }
  }
}

abstract class OperatorNode extends InteriorExpressionNode {
  public operands: ExpressionNode[];
  public abstract get wolframSymbol(): string;
  public /* override */ children(): ExpressionNode[] { return this.operands };
  public /* override */ wolframExpression(): WolframExpression {
    // REVIEW: Maybe need parens?
    return <WolframExpression>`${this.wolframSymbol}[${this.operands.map(o=>o.wolframExpression()).join(',')}]`;
  }
  public constructor(operands: ExpressionNode[]) {
    super();
    this.operands = operands;
  }
}

abstract class RelationNode extends SemanticFormula {
  public lhs: ExpressionNode;
  public rhs: ExpressionNode;
  public abstract get wolframSymbol(): string;
  public /* override */ get isRelation(): boolean { return true; }
  public /* override */ get isExpression(): boolean { return false; }
  public /* override */ plotExpression(): ExpressionNode { return this.rhs; }
  public /* override */ plotInfo(): PlotInfo|undefined {
    let rval: PlotInfo|undefined = undefined;
    if (this.lhs instanceof IdentifierNode) {
      const rhsPlotInfo = this.rhs.plotInfo();
      if (rhsPlotInfo) {
        assert(!rhsPlotInfo.yAxisIdentifier);
        return { ...rhsPlotInfo, yAxisIdentifier: this.lhs.identifier };
      }
    }
    return rval;
  }

  public /* override */ wolframExpression(): WolframExpression {
    return <WolframExpression>`${this.wolframSymbol}[${this.lhs.wolframExpression()},${this.rhs.wolframExpression()}]`;
  }

  public constructor(lhs: ExpressionNode, rhs: ExpressionNode) {
    super();
    this.lhs = lhs;
    this.rhs = rhs;
  }
}

class EqualsNode extends RelationNode {
  public /* override */ get isEquation(): boolean { return true; }
  public /* override */ get wolframSymbol(): string { return 'Equal'; };
}

class NotEqualsNode extends RelationNode {
  public /* override */ get wolframSymbol(): string { return 'Unequal'; };
}

class GreaterThanNode extends RelationNode {
  public /* override */ get wolframSymbol(): string { return 'Greater'; };
}

class GreaterThanOrEqualToNode extends RelationNode {
  public /* override */ get wolframSymbol(): string { return 'GreaterEqual'; };
}

class LessThanNode extends RelationNode {
  public /* override */ get wolframSymbol(): string { return 'Less'; };
}

class LessThanOrEqualToNode extends RelationNode {
  public /* override */ get wolframSymbol(): string { return 'LessEqual'; };
}

class IdentifierNode extends ExpressionNode {
  public identifier: FormulaSymbol;
  public /* override */ get isIdentifier(): boolean { return true; }
  public /* override */ plotInfo(): PlotInfo|undefined {
    return { type: 'univariate', xAxisIdentifier: this.identifier };
  }
  public /* override */ wolframExpression(): WolframExpression { return <WolframExpression>this.identifier; }
  public constructor(identifier: FormulaSymbol) {
    super();
    this.identifier = identifier;
  }
}

class MinusNode extends InteriorExpressionNode {
  public minuend: ExpressionNode;
  public subtrahend: ExpressionNode;
  public /* override */ children(): ExpressionNode[] { return [ this.minuend, this.subtrahend ] };
  public /* override */ wolframExpression(): WolframExpression {
    // REVIEW: Maybe need parens?
    return <WolframExpression>`Subtract[${this.minuend.wolframExpression()},${this.subtrahend.wolframExpression()}]`;
  }
  public constructor(minuend: SemanticFormula, subtrahend: SemanticFormula) {
    super();
    this.minuend = minuend;
    this.subtrahend = subtrahend;
  }
}

class MissingNode extends ExpressionNode {
  // This class is used at the top level for the "empty" formula.
  // It can also be used to indicate an incomplete formula, e.g. a missing operand.
  public /* override */ plotInfo(): PlotInfo|undefined { return undefined };
  public /* override */ wolframExpression(): WolframExpression {
    // REVIEW: Should it be the empty string or something else?
    return <WolframExpression>'TODO:';
  }
}

class NumberNode extends ExpressionNode {
  public value: number;
  public /* override */ plotInfo(): PlotInfo|undefined {
    return { type: 'constant' };
  }
  public /* override */ wolframExpression(): WolframExpression { return <WolframExpression>this.value.toString(); }
  public constructor(value: number) {
    super();
    this.value = value;
  }
}

class PlusNode extends OperatorNode {
  public get wolframSymbol(): string { return 'Plus' };
}

class PowerNode extends InteriorExpressionNode {
  public base: ExpressionNode;
  public exponent: ExpressionNode;
  public /* override */ children(): ExpressionNode[] { return [ this.base, this.exponent ] };
  public /* override */ wolframExpression(): WolframExpression {
    // REVIEW: Maybe need parens?
    return <WolframExpression>`Power[${this.base.wolframExpression()},${this.exponent.wolframExpression()}]`;
  }
  public constructor(base: SemanticFormula, exponent: SemanticFormula) {
    super();
    this.base = base;
    this.exponent = exponent;
  }
}

class FactorialNode extends InteriorExpressionNode {
  public operand: ExpressionNode;
  public /* override */ children(): ExpressionNode[] { return [ this.operand ] };
  public /* override */ wolframExpression(): WolframExpression {
    return <WolframExpression>`Factorial[${this.operand.wolframExpression()}]`;
  }
  public constructor(operand: SemanticFormula) {
    super();
    this.operand = operand;
  }
}

class RootNode extends InteriorExpressionNode {
  public operand: ExpressionNode;
  // LATER: public degree?: ExpressionNode;
  public /* override */ children(): ExpressionNode[] { return [ this.operand, /* LATER: this.degree */ ] };
  public /* override */ wolframExpression(): WolframExpression {
    // REVIEW: Maybe need parens?
    // LATER: CubeRoot or Surd
    return <WolframExpression>`Sqrt[${this.operand.wolframExpression()}]`;
  }
  public constructor(operand: SemanticFormula) {
    super();
    this.operand = operand;
  }
}

class QuotientNode extends InteriorExpressionNode {
  public dividend: ExpressionNode;
  public divisor: ExpressionNode;
  public /* override */ children(): ExpressionNode[] { return [ this.dividend, this.divisor ] };
  public /* override */ wolframExpression(): WolframExpression {
    // REVIEW: Maybe need parens?
    return <WolframExpression>`Divide[${this.dividend.wolframExpression()},${this.divisor.wolframExpression()}]`;
  }
  public constructor(dividend: SemanticFormula, divisor: SemanticFormula) {
    super();
    this.dividend = dividend;
    this.divisor = divisor;
  }
}

class TimesNode extends OperatorNode {
  public get wolframSymbol(): string { return 'Times' };
}

class UnaryMinusNode extends InteriorExpressionNode {
  public operand: ExpressionNode;
  public /* override */ children(): ExpressionNode[] { return [ this.operand ] };
  public /* override */ wolframExpression(): WolframExpression {
    // REVIEW: Maybe need parens?
    return <WolframExpression>`Minus[${this.operand.wolframExpression()}]`;
  }
  public constructor(operand: SemanticFormula) {
    super();
    this.operand = operand;
  }
}


