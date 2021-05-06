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

// At one point we decided to try using WolframScript to convert Presentation MathML generated
// from MyScript output to Content MathML in order to have a semantic formula.
// Since then, we decided to generate Content MathML directly from MyScript output
// to avoid dealing with artifacts introduced in a round-trip through WolframScript.

// For now, we keep this functionality to compare the Content MathML that we are
// generating versus what WolframScript would generate.

// In the future we may want a robust converter to up-convert formulas that are pasted
// or imported from other sources.

// Requirements

// import { parseStringPromise } from 'xml2js';

import { execute as executeWolframScript } from "../adapters/wolframscript";
import { ContentMathMlMarkup } from "../shared/content-mathml";
import { WolframExpression } from "../shared/formula";
import { PresentationMathMlMarkup } from "../shared/presentation-mathml";

// Types

// interface XmlElement {
//   '#name': string;    // element name
//   '$'?: JsonObject;    // attributes
//   '$$'?: XmlElement[]; // children
//   '_'?: string;        // text content
// }

// Exported functions

export async function convertPresentationMathMlMarkupToContentMathMlMarkup(
  presentationMathMlMarkup: PresentationMathMlMarkup
): Promise<ContentMathMlMarkup> {
  // Ask WolframScript to convert (Presentation) MathML to a Wolfram Expression,
  // then ask it to convert the expression into Content MathML.
  const script = <WolframExpression>`ExportString[ToExpression["${presentationMathMlMarkup}", MathMLForm, Hold], "MathML", "Content"->True, "Presentation"->False]`;
  const rval = <ContentMathMlMarkup>await executeWolframScript(script);
  return rval;
}

// export async function convertPresentationMathMlTreeToContentMathMlTree(
//   presentationMathMlTree: PresentationMathMlTree
// ): Promise<ContentMathMlTree> {

//   // If the tree is nonempty...
//   let rval: ContentMathMlTree;
//   if (presentationMathMlTree.children.length > 0) {

//     // Convert the tree to presentation markup.
//     const presentationMathMlMarkup = serializeTreeToMathMlMarkup(presentationMathMlTree);

//     // Use WolframScript to convert presentation markup to content markup.
//     const contentMathMlMarkup = await convertPresentationMathMlMarkupToContentMathMlMarkup(presentationMathMlMarkup);

//     // Parse the content markup into a tree.
//     const contentMathMlTree = await parseContentMathMlMarkup(contentMathMlMarkup);

//     // The content formula includes a Hold[...] wrapper to prevent WolframScript from evaluating the expression.
//     // Otherwise, if we pass in <PMML>"1+1" we will get back <CMML>"2" instead of <CMML>"1+1"
//     // Remove the Hold[] wrapper from the tree before returning it.
//     rval = unwrapHold(contentMathMlTree);
//   } else {
//     // Presentation MathML is empty <math> element. Return empty <math> node.
//     // (Mathematica will convert an empty <math> element to <math><ci>Null</ci></math>.)
//     rval = { tag: 'math' };
//   }
//   return rval;
// }

// export async function parseContentMathMlMarkup(markup: ContentMathMlMarkup): Promise<ContentMathMlTree> {
//   const xmlObject = await parseStringPromise(markup, { explicitChildren: true, explicitRoot: false, preserveChildrenOrder: true });
//   // c-nsole.log("XML2JS OBJECT:");
//   // c-nsole.dir(xmlObject, { depth: null });
//   const rval = <ContentMathMlTree>parseTreeX(xmlObject);
//   assert(rval.tag == 'math');
//   return rval;
// }

// // Helper Functions

// function parseTreeX(elt: XmlElement): ContentMathMlNode {
//   let rval: ContentMathMlNode;
//   switch (elt['#name']) {
//     case 'apply':
//       assert(elt['$$'] && elt['$$'].length>=2);
//       const operator = parseTreeX(elt['$$']![0]);
//       const operands = elt['$$']!.slice(1).map(parseTreeX);
//       rval = {tag: 'apply', operator, operands };
//       break;
//     case 'ci':
//       assert(elt['_']);
//       rval = { tag: 'ci', identifier: elt['_']!};
//       break;
//     case 'cn': {
//       // LATER: Deal with various number types and the possible <sep/> tag.
//       assert(elt['_']);
//       const node: Cn = { tag: 'cn', value: parseFloat(elt['_']!) };
//       // LATER: const type: NumberType|undefined = elt['$'] && <NumberType>elt['$'].type;
//       //        if (type) { node.type = type; }
//       rval = node;
//       break;
//     }
//     case 'math':
//       assert(elt['$$'] && elt['$$'].length==1);
//       rval = { tag: 'math', child: parseTreeX(elt['$$']![0]) };
//       break;

//     case 'eq':
//     case 'plus':
//     case 'power':
//     case 'times':
//       rval = { tag: elt['#name'] };
//       break;

//     default:
//       assertFalse(`${elt['#name']} content MathML tag not implemented.`);
//   }
//   return rval;
// }

// function unwrapHold(tree: ContentMathMlTree): ContentMathMlTree {
//   // We place a Hold[] around the expression so WolframScript doesn't automatically simplify it.
//   // Otherwise, if we passed in the presentation expression "1+2" we would get back the content expression "3".
//   // We need to unwrap the Hold[] from the expression.
//   const applyNode = <Apply>tree.child;
//   assert(applyNode && applyNode.tag == 'apply');
//   const operator = <Ci>applyNode.operator;
//   assert(operator.tag == 'ci' && operator.identifier == 'Hold');
//   const operands = applyNode.operands;
//   assert(operands.length==1);
//   const operand = operands[0];
//   tree.child = operand;
//   return tree;
// }

