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

// REVIEW: We are currently not using this functionality.

// Requirements

import { parseStringPromise } from 'xml2js';
import { assert, assertFalse, JsonObject } from '../shared/common';
import { Cn, ContentMathMlMarkup, ContentMathMlNode, ContentMathMlTree } from '../shared/content-mathml';

// Types

interface XmlElement {
  '#name': string;    // element name
  '$'?: JsonObject;    // attributes
  '$$'?: XmlElement[]; // children
  '_'?: string;        // text content
}

// Exported Functions

export async function parseContentMathMlMarkup(markup: ContentMathMlMarkup): Promise<ContentMathMlTree> {
  // REVIEW: Can't this parsing be done synchronously?
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
      // LATER: Deal with various number types and the possible <sep/> tag.
      assert(elt['_']);
      const node: Cn = { tag: 'cn', value: parseFloat(elt['_']!) };
      // LATER: const type: NumberType|undefined = elt['$'] && <NumberType>elt['$'].type;
      //        if (type) { node.type = type; }
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
      assertFalse(`Content MathML tag '${elt['#name']}' not implemented.`);
  }
  return rval;
}


