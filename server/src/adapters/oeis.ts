/*
Euler Notebook
Copyright (C) 2019-21 Public Invention
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

/*
Note: this is an early version of a file to access the
Online Encycopedia of Integer Sequences. It relies heavily on
this article from Stack Exchange, expecially the answer by Alexander Cragg:

https://stackoverflow.com/questions/5991756/programmatic-access-to-on-line-encyclopedia-of-integer-sequences

In sum, there is no API, it simply uses JSON --- but it is highly comprehensible.

Here is an example:

https://oeis.org/search?fmt=json&q=fibonacci&start=0

The resulting object has keys of "formula", "reference", etc.,
but highly relevant to us is "mathematica". These formulae appear
to be in the Wolfram language, which makes it quite tractable to us.
There does not appear to be a "LaTeX" formula available.

Note for many terms a very rich and interesting set of data which
is way too big for us to return is presented!

*/
import * as debug1 from "debug";

import { PlainText  } from "../shared/common";
import { SearchResult } from "../shared/api-calls";
import { WolframExpression } from "../shared/formula";

import fetch, { Response } from "node-fetch";

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// Requirements
// const WolframAlphaAPI = require('wolfram-alpha-node');

const OEIS_URL_PREFIX = "https://oeis.org/search?fmt=json&q=";

// Types

// Exported Functions

// This is mostly a starting point for our WolframAPI work...
// we expect the "full" results to be more useful
export async function search(_text: PlainText): Promise<SearchResult[]> {

  var url = `${OEIS_URL_PREFIX}${_text}`;
  try {
    const response: Response = await fetch(url, { method: 'get' });
    const json = await response.json();
    debug(json);
    const srs : SearchResult[] = [];

    for(const r of json.results) {
      if (r.mathematica) {
        for(const m of r.mathematica) {
          const sr : SearchResult =  { title: r.name,
                                       wolframExpr: <WolframExpression>m
                                   };
          srs.push(sr);
        }
      } else {
        const sr : SearchResult =  { title: _text,
                                     text: r.name,
                                   };
        srs.push(sr);
      }
    }
    return <SearchResult[]> srs;
  } catch (error) {
    console.dir(error);
    return <SearchResult[]>[];
  }
   return <SearchResult[]>["internal error"];
}

// The question arises, should we attempt to return much
// more here when one does a "full" search. There is much to return
// from the OEIS.
export async function search_full(_text: PlainText): Promise<SearchResult[]> {
  return search(_text);
}
