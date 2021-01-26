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

import * as debug1 from "debug";

import { PlainText } from "../shared/common";
import { SearchResult, SearchResults } from "../shared/api-calls";
import { loadCredentials } from "../config";
import {
  convertEvaluatedWolframToTeX,
  //  convertWolframToTeX,
  convertTeXtoWolfram,
  convertMTLToWolfram
} from "./wolframscript";
import {
  PlainTextFormula,
//  TexExpression,
  WolframExpression
} from "../shared/formula";


const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// Requirements
const WolframAlphaAPI = require('wolfram-alpha-node');

// Types

export interface ApiKeys {
  // This structure lives in ~/.euler-notebook/credentials.json under "wolframalpha" key.
  appid: string;
}

interface AlphaFullResult {
  pods: Pod[];
}

interface Pod {
  title: PlainText;
  subpods: Subpod[];
  id: string;
}

interface Subpod {
  plaintext?: PlainText;
  minput?: string;
}

// Constants

// Global Variables

let ApiKey: ApiKeys | null = null;
let APPID: string | null = null;

async function ensureWolframAlphaAPIKeysLoaded(){
    const credentials = await loadCredentials();
  ApiKey = credentials.wolframalpha;
  APPID = ApiKey.appid;
  };

// Exported Functions

// This is mostly a starting point for our WolframAPI work...
// we expect the "full" results to be more useful
export async function search(_text: PlainText): Promise<SearchResults> {
  if (!APPID) await ensureWolframAlphaAPIKeysLoaded();

  // This probably should not be done on every call;
  // it may be better to do an initialization
  const waApi = WolframAlphaAPI(APPID);
  const answer : PlainText = <PlainText>await waApi.getShort(_text);
  const sr : SearchResult = { text: answer };

  debug(sr);

  return <SearchResults>{results: [sr]};
}

// This is exported so that we can use unit tests on it.
// This is expected to be heuristic and highly dependent
// on Wolfram Alpha's internal style.
// The input is a string returned by Wolfram Alpha, typically like this:
//
export async function findEquationInAlphaResult(text: string) : Promise<string>
{
  const exprs = text.split(/[\|\n]/);
  const cand0 = exprs[0].trim();

  // a variety of unpredictable error cases force the use of a try-catch here...

  try {
    var cand1 = <PlainText>string_to_slug(<string>cand0);
    console.log("CC1:",cand1);
    var cand2 = convertMTLToWolfram(<PlainTextFormula>cand1);
    console.log("CC2:",cand2);
    var cand3 = await convertEvaluatedWolframToTeX(<WolframExpression>cand2);
    console.log("CC3:",cand3);
    var cand4 = await convertTeXtoWolfram(cand3);
    console.log("CC4:",cand4);
  } catch(e) {
    console.log("error finding equation in:"+text,e);
    return cand0;
  }
  return cand4;
}

// https://gist.github.com/kostasx/7516158
// Note: This is experimental. We don't really
// want to covert the greek letter alpha to a,
// because a may also appear in the formula.
function string_to_slug(strx: string):string {

  let str : string   = strx.replace(/^\s+|\s+$/g, '') // TRIM WHITESPACE AT BOTH ENDS.
  //          .toLowerCase();            // CONVERT TO LOWERCASE
  ;

let from = [ "ου", "ΟΥ", "Ού", "ού", "αυ", "ΑΥ", "Αύ", "αύ", "ευ", "ΕΥ", "Εύ", "εύ", "α", "Α", "ά", "Ά", "β", "Β", "γ", "Γ", "δ", "Δ", "ε", "Ε", "έ", "Έ", "ζ", "Ζ", "η", "Η", "ή", "Ή", "θ", "Θ", "ι", "Ι", "ί", "Ί", "ϊ", "ΐ", "Ϊ", "κ", "Κ", "λ", "Λ", "μ", "Μ", "ν", "Ν", "ξ", "Ξ", "ο", "Ο", "ό", "Ό", "π", "Π", "ρ", "Ρ", "σ", "Σ", "ς", "τ", "Τ", "υ", "Υ", "ύ", "Ύ", "ϋ", "ΰ", "Ϋ", "φ", "Φ", "χ", "Χ", "ψ", "Ψ", "ω", "Ω", "ώ", "Ώ" ];
let to   = [ "ou", "ou", "ou", "ou", "au", "au", "au", "au", "eu", "eu", "eu", "eu", "a", "a", "a", "a", "b", "b", "g", "g", "d", "d", "e", "e", "e", "e", "z", "z", "i", "i", "i", "i", "th", "th", "i", "i", "i", "i", "i", "i", "i", "k", "k", "l", "l", "m", "m", "n", "n", "ks", "ks", "o", "o", "o", "o", "p", "p", "r", "r", "s", "s", "s", "t", "t", "y", "y", "y", "y", "y", "y", "y", "f", "f", "x", "x", "ps", "ps", "o", "o", "o", "o" ];

for ( var i = 0; i < from.length; i++ ) {

    while( str.indexOf( from[i]) !== -1 ){

        str = str.replace( from[i], to[i] );    // CONVERT GREEK CHARACTERS TO LATIN LETTERS

    }

}

  // we need many of these symbols in our expression!
//str = str.replace(/[^a-z0-9 -]/g, '') // REMOVE INVALID CHARS
//         .replace(/\s+/g, '-')        // COLLAPSE WHITESPACE AND REPLACE BY DASH -
//         .replace(/-+/g, '-');        // COLLAPSE DASHES

return str;
}


export async function search_full(_text: PlainText): Promise<SearchResults> {
  if (!APPID) await ensureWolframAlphaAPIKeysLoaded();

  // This probably should not be done on every call;
  // it may be better to do an initialization
  const waApi = WolframAlphaAPI(APPID);
  const raw = <AlphaFullResult>(await waApi.getFull({input: _text, output:'json'}));

  // This code is Rob's attempt to find acceptable plaintext in what we get back...
  var sr : SearchResult[] = [];
  const pods = raw.pods;
//  console.dir(pods,{depth:null});
  // now filter the pods to extract titles and plaintext from the subpods


  function isIterable(obj : any) {
    if (obj == null) {
      return false;
    }
    return typeof obj[Symbol.iterator] === 'function';
  }
  if (isIterable(pods)) {
    for (const p of pods) {
      for (const s of p.subpods) {
        debug("s = ",s);
        // Note this is a bit odd; the title seems to mostly be empty in the subpod,
        // so we are using the title from the pod
        // NOTE: among other implicit assumption, this assumes there is only
        // one subpod per pod.

        // Note: there appears to be poor consistency to Alpha's results.
        // The complexity of cases below is driven by actual test cases.
        // NOTE: Currently, this is taking the "plaintext" version
        // of the equations. This is NOT closely related tot he Wolfram language.
        // We may be able to use the "minput" form instead, but that has
        // not been experimented with. That will be a high priority when we return to this.
        // It is not clear that the wolfram-alpha-node module we are using allows
        // you to specify the "format=minput" which is necessary for this.
        // That means we may have to slightly extand that module (it is open source
        // and quite small, easily extendable with a pull request.

        // This is just a set of heuristics that works pretty well...
        var formula = (p.id === "Associated Equation" ||
                         <string>p.title === "Associated equations" ||
                         <string>p.title === "Associated equation" ||
                         <string>p.title === "Equations" ||
                         p.id === "Equation") ?
          <PlainText>s.plaintext : undefined;

        // This likewise is just a set of heuristics, no doubt there are cases
        // which are not needed. There are many unit conversions returned which
        // we are not handling.
        const known = (<string>p.title === "Result" ||
                       <string>p.title === "Value" ||
                      <string>p.title === "Commodity price") ?
          <PlainText>s.plaintext : undefined;

        if (formula) {
          formula = <PlainText>string_to_slug(<string>formula);
//          console.log("formula",formula);
          formula = <PlainText>await findEquationInAlphaResult(
              <PlainText>formula);
        }

//        console.dir(formula);
//        console.dir(known);
        sr.push(
          { title: p.title,
            text: s.plaintext,
            formula: formula,
            knownConstant: known});
      }
    }
  }

  // Now we simply sort by whether or not we have found a formula to put the formulae first
  sr.sort((a,_b) => a.knownConstant ? -1 : 1);
  sr.sort((a,_b) => a.formula ? -1 : 1);

  debug(sr);

  return <SearchResults>{results: sr};
}
