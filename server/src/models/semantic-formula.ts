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
import { ApplyOperators, Ci, ContentMathMlNode, ContentMathMlTree, Matrix } from "../shared/content-mathml";
import { FormulaSymbol, WolframExpression } from "../shared/formula";
import { PlotInfo } from "../shared/plot";

// Types

// Constants

// Constants

// Global Variables

let OPERATOR_TABLE = new Map<ApplyOperators, /* TYPESCRIPT: */any>();

// Exported Class

export abstract class SemanticFormula {

  // Public Class Properties
  // Public Class Property Functions

  // Public Class Methods

  public static createFromContentMathMlTree(tree: ContentMathMlTree): SemanticFormula {
    return tree.child ? this.createFromContentMathMlNode(tree.child) : new MissingExpressionNode();
  }

  // Public Class Event Handlers
  // Public Instance Properties

  // Public Instance Property Functions

  public /* overridable */ get isComplete(): boolean { return true; }
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
  public abstract plotInfo(): PlotInfo|false;
  public abstract wolframExpression(): WolframExpression;

  // Public Instance Methods
  // Public Instance Event Handlers

  // --- PRIVATE ---

  // Private Class Properties
  // Private Class Property Functions

  // Private Class Methods

  protected static createFromContentMathMlNode(node: ContentMathMlNode): SemanticFormula {
    let rval: SemanticFormula;
    switch(node.tag) {
      case 'ci':     rval = new IdentifierNode(node); break;
      case 'cn':     rval = new NumberNode(node.value); break;
      case 'matrix': rval = new MatrixNode(node); break;
      case 'apply': {
        const { operator, operands } = node;
        const cls = OPERATOR_TABLE.get(<ApplyOperators>operator.tag);
        if (!cls) {
          throw new Error(`Creating from applied '${operator.tag}' nodes not yet implemented.`)
        }
        const semOperands = operands.map(operand=>this.createFromContentMathMlNode(operand));
        rval = new cls(semOperands);
        break;
      }
      case 'cerror': {
        assert(node.code == 'MissingSubexpression');
        rval = new MissingExpressionNode();
        break;
      }

      case 'math':   assertFalse();
      default: throw new Error(`Creating from '${node.tag}' nodes not yet implemented.`);
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
  public /* override */ get isComplete(): boolean {
    return this.children().every(c=>c.isComplete);
  }
  public /* override */ plotInfo(): PlotInfo|false {
    const children = this.children();
    if (children.length == 0) { return false; }
    else {
      const child0 = children[0];
      const plotInfo = child0.plotInfo();
      if (children.length == 1) { return plotInfo; }
      else {
        return children.slice(1).reduce((plotInfo1: PlotInfo|false, child2: ExpressionNode): PlotInfo|false=>{
          const plotInfo2 = child2.plotInfo();
          if (!plotInfo1 || !plotInfo2) { return false; }
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
                    return false; // Expression is trivariate. Cannot plot.
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
                    return false; // Expression is trivariate. Cannot plot.
                  }
                }
                case 'bivariate': {
                  if ((plotInfo1.xAxisIdentifier == plotInfo2.xAxisIdentifier && plotInfo1.zAxisIdentifier == plotInfo2.zAxisIdentifier) ||
                      (plotInfo1.xAxisIdentifier == plotInfo2.zAxisIdentifier && plotInfo1.zAxisIdentifier == plotInfo2.xAxisIdentifier)) {
                    return plotInfo1;
                  } else {
                    return false; // Expression is trivariate+. Cannot plot.
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

abstract class FunctionNode extends InteriorExpressionNode {
  public operands: ExpressionNode[];
  public abstract get wolframSymbol(): string;
  public /* override */ children(): ExpressionNode[] { return this.operands };
  public /* override */ wolframExpression(): WolframExpression {
    // REVIEW: Maybe need parens?
    return <WolframExpression>`${this.wolframSymbol}[${this.operands.map(o=>o.wolframExpression()).join(',')}]`;
  }
  public constructor(operands: SemanticFormula[]) {
    super();
    assert(operands.every(o=>o instanceof ExpressionNode));
    this.operands = operands;
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
  public constructor(operands: SemanticFormula[]) {
    super();
    assert(operands.every(o=>o instanceof ExpressionNode));
    this.operands = operands;
  }
}

abstract class RelationNode extends SemanticFormula {
  public lhs: ExpressionNode;
  public rhs: ExpressionNode;
  public abstract get wolframSymbol(): string;
  public /* override */ get isComplete(): boolean {
    return this.lhs.isComplete && this.rhs.isComplete;
  }
  public /* override */ get isRelation(): boolean { return true; }
  public /* override */ get isExpression(): boolean { return false; }
  public /* override */ plotExpression(): ExpressionNode { return this.rhs; }
  public /* override */ plotInfo(): PlotInfo|false {
    let rval: PlotInfo|false = false;
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

  public constructor(operands: SemanticFormula[]) {
    assert(operands.length == 2);
    assert(operands.every(o=>o instanceof ExpressionNode));
    super();
    this.lhs = operands[0];
    this.rhs = operands[1];
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
  public /* override */ plotInfo(): PlotInfo|false {
    return { type: 'univariate', xAxisIdentifier: this.identifier };
  }
  public /* override */ wolframExpression(): WolframExpression { return <WolframExpression>this.identifier; }
  public constructor(node: Ci) {
    super();
    this.identifier = <FormulaSymbol>node.identifier;
  }
}

class MatrixNode extends ExpressionNode {
  public rows: ExpressionNode[][];
  public /* override */ plotInfo(): PlotInfo|false { return false; }
  public /* override */ wolframExpression(): WolframExpression {
    return <WolframExpression>`List[${this.rows.map(r=><WolframExpression>`List[${r.map(c=>c.wolframExpression()).join(',')}]`).join(',')}]`;
  }
  public constructor(node: Matrix) {
    super();
    const rows = node.rows.map(r=>r.cells.map(c=>SemanticFormula.createFromContentMathMlNode(c)));
    this.rows = rows;
  }
}

class MinusNode extends OperatorNode {
  public get wolframSymbol(): string {
    if (this.operands.length == 1) { return 'Minus'; }
    else if (this.operands.length == 2) { return 'Subtract'; }
    else { assertFalse(); }
  };
}

class MissingExpressionNode extends ExpressionNode {
  // This class is used at the top level for the "empty" formula.
  // It can also be used to indicate an incomplete formula, e.g. a missing operand.
  public /* override */ get isComplete(): boolean { return false; }
  public /* override */ plotInfo(): PlotInfo|false { return false };
  public /* override */ wolframExpression(): WolframExpression {
    // REVIEW: Is this the appropriate Wolfram expression to return?
    return <WolframExpression>"Missing[]";
  }
}

class NumberNode extends ExpressionNode {
  public value: number;
  public /* override */ plotInfo(): PlotInfo|false {
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

class PowerNode extends OperatorNode {
  public get wolframSymbol(): string { return 'Power' };
}

class FactorialNode extends InteriorExpressionNode {
  public operand: ExpressionNode;
  public /* override */ children(): ExpressionNode[] { return [ this.operand ] };
  public /* override */ wolframExpression(): WolframExpression {
    return <WolframExpression>`Factorial[${this.operand.wolframExpression()}]`;
  }
  public constructor(operands: SemanticFormula[]) {
    assert(operands.length==1);
    assert(operands[0] instanceof ExpressionNode);
    super();
    this.operand = operands[0];
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
  public constructor(operands: SemanticFormula[]) {
    assert(operands.length==1);
    assert(operands[0] instanceof ExpressionNode);
    super();
    this.operand = operands[0];
  }
}

class QuotientNode extends OperatorNode {
  public get wolframSymbol(): string { return 'Divide' };
}

class TimesNode extends OperatorNode {
  public get wolframSymbol(): string { return 'Times' };
}

class SinNode extends FunctionNode {
  public get wolframSymbol(): string { return 'Sin' };
}

class CosNode extends FunctionNode {
  public get wolframSymbol(): string { return 'Cos' };
}

class TanNode extends FunctionNode {
  public get wolframSymbol(): string { return 'Tan' };
}

class LnNode extends FunctionNode {
  public get wolframSymbol(): string { return 'Log' };
}

class LogNode extends FunctionNode {
  // TODO: Alternative base.
  public get wolframSymbol(): string { return 'Log10' };
}

OPERATOR_TABLE.set('cos', CosNode);
OPERATOR_TABLE.set('eq', EqualsNode);
OPERATOR_TABLE.set('eq', EqualsNode);
OPERATOR_TABLE.set('factorial', FactorialNode);
OPERATOR_TABLE.set('geq', GreaterThanOrEqualToNode);
OPERATOR_TABLE.set('gt', GreaterThanNode);
OPERATOR_TABLE.set('leq', LessThanOrEqualToNode);
OPERATOR_TABLE.set('ln', LnNode);
OPERATOR_TABLE.set('log', LogNode);
OPERATOR_TABLE.set('lt', LessThanNode);
OPERATOR_TABLE.set('minus', MinusNode);
OPERATOR_TABLE.set('neq', NotEqualsNode);
OPERATOR_TABLE.set('plus', PlusNode);
OPERATOR_TABLE.set('power', PowerNode);
OPERATOR_TABLE.set('quotient', QuotientNode);
OPERATOR_TABLE.set('root', RootNode);
OPERATOR_TABLE.set('sin', SinNode);
OPERATOR_TABLE.set('tan', TanNode);
OPERATOR_TABLE.set('times', TimesNode);
