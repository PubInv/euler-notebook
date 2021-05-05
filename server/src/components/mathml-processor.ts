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

import { parseStringPromise } from 'xml2js';

import { execute as executeWolframScript } from "../adapters/wolframscript";
import { assert, assertFalse, JsonObject } from '../shared/common';
import { Apply, ContentMathMlMarkup, ContentMathMlTree, ContentMathMlNode, Ci, NumberType, Cn } from "../shared/content-mathml";
import { WolframExpression } from "../shared/formula";
import { PresentationMathMlTree, serializeTreeToMathMlMarkup } from "../shared/presentation-mathml";

// Types

interface XmlElement {
  '#name': string;    // element name
  '$'?: JsonObject;    // attributes
  '$$'?: XmlElement[]; // children
  '_'?: string;        // text content
}

// Exported functions

export async function convertPresentationMathMlToContentMathMl(presentationMathMlTree: PresentationMathMlTree): Promise<ContentMathMlTree> {

  // c-nsole.log("PRESENTATION MATHML:")
  // c-nsole.log(JSON.stringify(presentationMathMlTree, null, 2));

  // If we get an empty presentation math tree, then return an empty content math tree.
  // (Mathematica will convert an empty <math> element to <math><ci>Null</ci></math>.)
  let rval: ContentMathMlTree;

  if (presentationMathMlTree.children.length > 0) {

    // Convert the tree object to a MathML string to pass to WolframScript.
    const presentationMathMlMarkup = serializeTreeToMathMlMarkup(presentationMathMlTree);

    // Ask WolframScript to convert (Presentation) MathML to a Wolfram Expression,
    // then ask it to convert the expression into Content MathML.
    const script = <WolframExpression>`ExportString[ToExpression["${presentationMathMlMarkup}", MathMLForm, Hold], "MathML", "Content"->True, "Presentation"->False]`;
    const contentMathMlMarkup = <ContentMathMlMarkup>await executeWolframScript(script);

    // Parse the Content MathML to get a content tree object.
    // c-nsole.log("CONTENT MATHML MARKUP WITH HOLD: " + contentMathMlMarkup);
    const contentMathMlTree = await parseContentMathMlMarkup(contentMathMlMarkup);
    rval = unwrapHold(contentMathMlTree);

  } else {
    // Presentation MathML is empty <math> element. Return empty <math> node.
    rval = { tag: 'math' };
  }
  // c-nsole.log("CONTENT MATHML TREE:");
  // c-nsole.log(JSON.stringify(rval, null, 2));
  return rval;
}

function unwrapHold(tree: ContentMathMlTree): ContentMathMlTree {
  // We place a Hold[] around the expression so WolframScript doesn't automatically simplify it.
  // Otherwise, if we passed in the presentation expression "1+2" we would get back the content expression "3".
  // We need to unwrap the Hold[] from the expression.
  const applyNode = <Apply>tree.child;
  assert(applyNode && applyNode.tag == 'apply');
  const operator = <Ci>applyNode.operator;
  assert(operator.tag == 'ci' && operator.identifier == 'Hold');
  const operands = applyNode.operands;
  assert(operands.length==1);
  const operand = operands[0];
  tree.child = operand;
  return tree;
}

export async function parseContentMathMlMarkup(markup: ContentMathMlMarkup): Promise<ContentMathMlTree> {
  const xmlObject = await parseStringPromise(markup, { explicitChildren: true, explicitRoot: false, preserveChildrenOrder: true });
  // c-nsole.log("XML2JS OBJECT:");
  // c-nsole.dir(xmlObject, { depth: null });
  const rval = <ContentMathMlTree>parseTreeX(xmlObject);
  assert(rval.tag == 'math');
  return rval;
}

// Helper Functions

function parseTreeX(elt: XmlElement): ContentMathMlNode {
  let rval: ContentMathMlNode;
  switch (elt['#name']) {
    case 'apply':
      assert(elt['$$'] && elt['$$'].length>=2);
      const operator = parseTreeX(elt['$$']![0]);
      const operands = elt['$$']!.slice(1).map(parseTreeX);
      rval = {tag: 'apply', operator, operands };
      break;
    case 'ci':
      assert(elt['_']);
      rval = { tag: 'ci', identifier: elt['_']!};
      break;
    case 'cn': {
      // TODO: number type. 'integer', etc.
      assert(elt['_']);
      const type: NumberType|undefined = elt['$'] && <NumberType>elt['$'].type;
      const node: Cn = { tag: 'cn', value: parseFloat(elt['_']!) };
      if (type) { node.type = type; }
      rval = node;
      break;
    }
    case 'math':
      assert(elt['$$'] && elt['$$'].length==1);
      rval = { tag: 'math', child: parseTreeX(elt['$$']![0]) };
      break;

    case 'eq':
    case 'plus':
    case 'power':
    case 'times':
      rval = { tag: elt['#name'] };
      break;

    default:
      assertFalse(`${elt['#name']} content MathML tag not implemented.`);
  }
  return rval;
}
