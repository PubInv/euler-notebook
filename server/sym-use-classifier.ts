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
const debug = debug1('server:sym-use-classifier');

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
    debug(`SymbolUseClassifier tDoc ${tDoc._path}/${change.type} change: `);
    break;
  case 'styleInserted':
    debug(`SymbolUseClassifier tDoc ${tDoc._path}/${change.type} change: `);
    symDefClassifierRule(tDoc, change.style);
    break;
  case 'thoughtDeleted':
    debug(`SymbolUseClassifier tDoc ${tDoc._path}/${change.type} change: `);
    break;
  case 'thoughtInserted':
    debug(`SymbolUseClassifier tDoc ${tDoc._path}/${change.type} change: `);
    break;
  default:
    debug(`SymbolUseClassifier tDoc unknown change: ${tDoc._path} ${(<any>change).type}`);
    break;
  }
}

function onClose(tDoc: TDoc): void {
  debug(`SymbolUseClassifier tDoc close: ${tDoc._path}`);
}

function onOpen(tDoc: TDoc): void {
  debug(`SymbolUseClassifier: tDoc open: ${tDoc._path}`);
}


// This needs to return a null if not a symbol definition,
// or, if it is, both the symbol name and the value.
async function symbolsUsed(expr : string) : Promise<string[]> {
  // const quadratic_function_script = `With[{v = Variables[#]},If[Exponent[#, v[[1]]] == 2 && Length[v] == 1, v[[1]], False]]`;
  // const script = quadratic_function_script+" &[" + expr + "]";
  // let result : string = await execute(script);
  // return (result == "False") ? null : result;
  // WARNING! TODO! DANGER! This would be better done
  // completely in Mathematica. However, we have not been able to
  // extract the "Set" symbol from the expression in Mathematica.
  // We are therefore doing this in TypeScript, hoping we eventually
  // figure it out in Mathematica.
  const script = `Variables[${expr}]`;
  debug("SCRIPT",script);
  const result : string = await execute(script);
  debug("RESULT (SYM USE): ",result);
  const trimmed = result.replace(/{|}/g,'');
  const vars = trimmed.split(',').filter( s => !!s);
  debug("VARS : ", vars);
  return vars;
}

// TODO: Move to a shared file, probably the math-tablet-api.ts
export interface SymbolData {
  name: string;
  value?: string;
}

export async function symDefClassifierRule(tdoc: TDoc, style: StyleObject): Promise<StyleObject[]> {
  if (style.type != 'WOLFRAM' || style.meaning != 'INPUT') { return []; }
  debug("INSIDE SYMDEF CLASSIFIER :",style);


  var symbols;
  try {
    symbols = await symbolsUsed(style.data);
    debug("SYMBOLIC USE CLASSIFIER SAYS:",symbols);
  } catch (e) {
    debug("MATHEMATICA EVALUATION FAILED :",e);
    return [];
  }

  var styles: StyleObject[] = [];
  symbols.forEach( s =>  {
    var use = tdoc.insertStyle(style, { type: 'SYMBOL',
                                        data: { name: s,
                                                value: null},
                                        meaning: 'SYMBOL-USE',
                                        source: 'MATHEMATICA' });

    styles.push(use);
  });
  return styles;
}
