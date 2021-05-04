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

import { parseString } from 'xml2js';

import { execute as executeWolframScript } from "../adapters/wolframscript";
import { ContentMathMlMarkup, ContentMathMlTree, ContentMathMlNode } from "../shared/content-mathml";
import { WolframExpression } from "../shared/formula";
import { PresentationMathMlMarkup, PresentationMathMlTree, serializeTreeToMathMlMarkup } from "../shared/presentation-mathml";

// Exported functions

export async function convertPresentationMathMlToContentMathMl(presentationMathMlTree: PresentationMathMlTree): Promise<ContentMathMlTree> {
  // If we get an empty presentation math tree, then return an empty content math tree.
  // (Mathematica will convert an empty <math> element to <math><ci>Null</ci></math>.)
  if (presentationMathMlTree.children.length==0) { return { type: 'math' }; }

  // Convert the tree object to a MathML string to pass to WolframScript.
  const presentationMathMlMarkup = serializeTreeToMathMlMarkup(presentationMathMlTree);

  // Ask WolframScript to convert (Presentation) MathML to a Wolfram Expression,
  // then ask it to convert the expression into Content MathML.
  // TODO: Convert in one execute call.
  const wolframExpression = await convertMathMlToWolfram(presentationMathMlMarkup);
  const contentMathMlMarkup = await convertWolframToContentMathMl(wolframExpression);

  // Parse the Content MathML to get a content tree object.
  const contentMathMlTree = parseContentMathMlMarkup(contentMathMlMarkup);
  return contentMathMlTree;
}

export function parseContentMathMlMarkup(markup: ContentMathMlMarkup): ContentMathMlTree {
  // This is an ugly side-effect ridden way of doing this.
  var cmMlJSON : any;
  parseString(markup, function (_err : any, result : any ) {
    cmMlJSON = result;
  });
  return {
    type: 'math',
    child: parseTreeX(cmMlJSON.math)
  }
}

// Helper Functions

async function convertMathMlToWolfram(presentationMml: PresentationMathMlMarkup) : Promise<WolframExpression> {
  const escaped = <WolframExpression>presentationMml.replace(/\\/g,"\\\\");
  const expression = <WolframExpression>`InputForm[ToExpression["${escaped}", MathMLForm]]`;
  return executeWolframScript(expression);
}

async function convertWolframToContentMathMl(wolframExpression: WolframExpression): Promise<ContentMathMlMarkup> {
  const script = <WolframExpression>`ExportString[Unevaluated[${wolframExpression}], "MathML", "Content" -> True, "Presentation" -> False]`;
  const contentMathMlMarkup = <ContentMathMlMarkup>(await executeWolframScript(script));
  return contentMathMlMarkup;
}

// Note: ContentMathMlMarkup comes in as a string in XML.
// There we convert it to JSON here before attempting to
// parse it into a tree.
// We are basically tranducing one JSON tree into another JSON tree.
// The input tree, however, is a representation of XML, and the output tree is
// SPECIFICALLY ContentMathMlMarkup. So, roughly speaking we can use a "typed visitor"
// pattern. At each node of the tree we recursiverly parse the arguments to the whatever
// the operator is, and then do a case split on the operator.
// I will use the suffix X to represent generic XML and the suffic C to represent
// ContentMathMlMarkup when the type system does not make this clear.


// Note: We could create a "marker type" for cmMLSON. This would be
// marginally type-stronger.

function deduceCMLNode(cmMlJSON: any) : string {
  const keys = Object.keys(cmMlJSON);
  return (keys[0] == '$') ?
    keys[1] : keys[0];
}

function deduceCMLValue(cmMlJSON: any) : number {
  const v_str = cmMlJSON[0]['_'];
  const v_num = parseFloat(v_str);
  return v_num;
}

function deduceCMLIdentifier(cmMlJSON: any) : string {
  const v_str = cmMlJSON[0];
  return v_str;
}

function parseTreeX(cmMlJSON: any) :  ContentMathMlNode {
  const cmlType = deduceCMLNode(cmMlJSON);
  switch (cmlType) {
    case 'eq':
      return  <ContentMathMlNode>{type: 'eq'};
      break;
    case 'plus':
      return  <ContentMathMlNode>{type: 'plus'};
      break;
    case 'ci':
      var id = deduceCMLIdentifier(cmMlJSON.ci);
      return  <ContentMathMlNode>{type: 'ci',
                                    identifier: id};
      break;
    case 'cn':
      var val = deduceCMLValue(cmMlJSON.cn);
      return  <ContentMathMlNode>{type: 'cn',
                                    value: val};
      break;
    case 'apply':
      var obj = cmMlJSON.apply[0];
      const keys = Object.keys(obj);

      var op = <ContentMathMlNode>{type: keys[0]};
      // I treat all keys after the first as operands...
      let ops : ContentMathMlNode[] = [];
      for(var i = 1; i < keys.length; i++) {
        let v = {};
        // @ts-ignore
        v[keys[i]] = obj[keys[i]];
        const nd : ContentMathMlNode = parseTreeX(v);
        ops[i-1] = nd;
      }
      return  <ContentMathMlNode>{type: 'apply',
                                    operator: op,
                                    operands: ops};
      break;
    default:
      console.log("COULD NOT PARSE");
      console.dir(cmMlJSON,{depth: null});
      throw "cmlType not implemented:"+cmlType;
      break;
  }
}
