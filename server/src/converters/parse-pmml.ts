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
import { Mn, PresentationMathMlMarkup, PresentationMathMlNode, PresentationMathMlTree } from '../shared/presentation-mathml';

// Types

interface XmlElement {
  '#name': string;    // element name
  '$'?: JsonObject;    // attributes
  '$$'?: XmlElement[]; // children
  '_'?: string;        // text content
}

// Exported Functions

export async function parsePresentationMathMlMarkup(markup: PresentationMathMlMarkup): Promise<PresentationMathMlTree> {
  // REVIEW: Can't this parsing be done synchronously?
  const xmlObject = await parseStringPromise(markup, { explicitChildren: true, explicitRoot: false, preserveChildrenOrder: true });
  // c-nsole.log("XML2JS OBJECT:");
  // c-nsole.dir(xmlObject, { depth: null });
  const rval = <PresentationMathMlTree>parseTreeX(xmlObject);
  assert(rval.tag == 'math');
  return rval;
}

// Helper Functions

function parseTreeX(elt: XmlElement): PresentationMathMlNode {
  let rval: PresentationMathMlNode;
  switch (elt['#name']) {
    // case 'apply':
    //   assert(elt['$$'] && elt['$$'].length>=2);
    //   const operator = parseTreeX(elt['$$']![0]);
    //   const operands = elt['$$']!.slice(1).map(parseTreeX);
    //   rval = {tag: 'apply', operator, operands };
    //   break;
    case 'mi':
      assert(elt['_']);
      rval = { tag: 'mi', identifier: elt['_']!};
      break;
    case 'mn': {
      // LATER: Deal with various number types and the possible <sep/> tag.
      assert(elt['_']);
      const node: Mn = { tag: 'mn', value: parseFloat(elt['_']!) };
      // LATER: const type: NumberType|undefined = elt['$'] && <NumberType>elt['$'].type;
      //        if (type) { node.type = type; }
      rval = node;
      break;
    }
    case 'mo': {
      assert(elt['_']);
      rval = { tag: 'mo', symbol: elt['_']!};
      break;
    }
    case 'mrow': {
      const children = elt['$$'] ? elt['$$'].map(parseTreeX) : [];
      rval = { tag: 'mrow', children };
      break;
    }
    case 'msup': {
      assert(elt['$$'])
      assert(elt['$$']!.length==2);
      const base = parseTreeX(elt['$$']![0]);
      const superscript = parseTreeX(elt['$$']![1]);
      rval = { tag: 'msup', base, superscript };
      break;
    }
    case 'math': {
      const children = elt['$$'] ? elt['$$'].map(parseTreeX) : [];
      rval = { tag: 'math', children };
      break;
    }
    default:
      assertFalse(`Presentation MathML tag '${elt['#name']}' not implemented.`);
  }
  return rval;
}


