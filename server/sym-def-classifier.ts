 /*
Math Tablet
Copyright (C) 2019 Public Invention
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

import * as debug1 from 'debug';
const debug = debug1('server:sym-def-classifier');

import { NotebookChange, StyleObject } from '../client/math-tablet-api';
import { TDoc } from './tdoc';
import { execute } from './wolframscript';

// Exports

export async function initialize(): Promise<void> {
  TDoc.on('open', (tDoc: TDoc)=>{
    tDoc.on('change', function(this: TDoc, change: NotebookChange){ onChange(this, change); });
    tDoc.on('close', function(this: TDoc){ onClose(this); });
    onOpen(tDoc);
  });
}

// Private Functions

function onChange(tDoc: TDoc, change: NotebookChange): void {
  switch (change.type) {
  case 'styleDeleted':
    debug(`SymbolDefinitionClassifier tDoc ${tDoc._path}/${change.type} change: `);
    break;
  case 'styleInserted':
    debug(`SymbolDefinitionClassifier tDoc ${tDoc._path}/${change.type} change: `);
    symDefClassifierRule(tDoc, change.style);
    break;
  case 'thoughtDeleted':
    debug(`SymbolDefinitionClassifier tDoc ${tDoc._path}/${change.type} change: `);
    break;
  case 'thoughtInserted':
    debug(`SymbolDefinitionClassifier tDoc ${tDoc._path}/${change.type} change: `);
    break;
  default:
    debug(`SymbolDefinitionClassifier tDoc unknown change: ${tDoc._path} ${(<any>change).type}`);
    break;
  }
}

function onClose(tDoc: TDoc): void {
  debug(`SymbolDefinitionClassifier tDoc close: ${tDoc._path}`);
}

function onOpen(tDoc: TDoc): void {
  debug(`SymbolDefinitionClassifier: tDoc open: ${tDoc._path}`);
}

// TODO: Move to a shared file, probably the math-tablet-api.ts
export interface SymbolData {
  name: string;
  value?: string;
}

// This needs to return a null if not a symbol definition,
// or, if it is, both the symbol name and the value.
async function isSymbolDefinition(expr : string) : Promise<SymbolData|null> {
  // const quadratic_function_script = `With[{v = Variables[#]},If[Exponent[#, v[[1]]] == 2 && Length[v] == 1, v[[1]], False]]`;
  // const script = quadratic_function_script+" &[" + expr + "]";
  // let result : string = await execute(script);
  // return (result == "False") ? null : result;
  // WARNING! TODO! DANGER! This would be better done
  // completely in Mathematica. However, we have not been able to
  // extract the "Set" symbol from the expression in Mathematica.
  // We are therefore doing this in TypeScript, hoping we eventually
  // figure it out in Mathematica.
  const script = `FullForm[Hold[${expr}]]`;
  debug("SCRIPT",script);
  const result : string = await execute(script);
  debug("RESULT (SYM DEF): ",result);
  const preamble = "Hold[Set[";
  if (result.startsWith(preamble)) {
    // WARNING! TODO!  This may work but will not match
    // expressions which do not evaluate numerically.
    const name_matcher = /Hold\[Set\[(\w+),/g;
    const name_matches = name_matcher.exec(result);
    debug("NAME_MATCHES", name_matches);
    const value_matcher = /,\s+(.+)\]\]/g;
    const value_matches = value_matcher.exec(result);
    debug("VALUE_MATCHES", value_matches);
    if (name_matches && value_matches) {
      let sd = { name: name_matches[1],
                 value: value_matches[1]
               };
      return sd;
    } else {
      return null;
    }
  } else {
    return null;
  }
}

export async function symDefClassifierRule(tdoc: TDoc, style: StyleObject): Promise<StyleObject[]> {
  if (style.type != 'WOLFRAM' || style.meaning != 'INPUT') { return []; }
  debug("INSIDE SYMDEF CLASSIFIER :",style);


  var isDefinition;
  try {
    isDefinition = await isSymbolDefinition(style.data);
    debug("SYMBOLIC DEFINITION CLASSIFIER SAYS:",isDefinition);
  } catch (e) {
    debug("MATHEMATICA EVALUATION FAILED :",e);
    return [];
  }

  var styles = [];
  if (isDefinition) {
    var classification = tdoc.insertStyle(style, { type: 'SYMBOL',
                                           data: isDefinition,
                                           meaning: 'SYMBOL-DEFINITION',
                                           source: 'MATHEMATICA' });

    styles.push(classification);
  }
  return styles;
}
