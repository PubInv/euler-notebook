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
const MODULE = __filename.split('/').slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

import { NotebookChange, StyleObject, StyleProperties, SymbolData, WolframData } from '../client/math-tablet-api';
import { TDoc } from './tdoc';
import { execute as executeWolframscript } from './wolframscript';
import { draftChangeContextName } from './wolframscript';
import { runAsync } from './common';

// Exports

export async function initialize(): Promise<void> {
  TDoc.on('open', (tDoc: TDoc)=>{
    tDoc.on('change', function(this: TDoc, change: NotebookChange){ onChange(this, change); });
    // tDoc.on('close', function(this: TDoc){ onClose(this); });
    // onOpen(tDoc);
  });
}

// Event Handlers

function onChange(tDoc: TDoc, change: NotebookChange): void {
  switch (change.type) {
  case 'styleInserted': {
    const style = change.style;
    if (style.type == 'WOLFRAM' && style.meaning == 'INPUT') {
      runAsync<void>(addSymbolUseStyles(tDoc, style), MODULE, 'addSymbolUseStyles');
      runAsync<void>(addSymbolDefStyles(tDoc, style), MODULE, 'addSymbolDefStyles');
    }
    break;
  }}
}

// Private Functios

async function execute(script: WolframData): Promise<WolframData|undefined> {
  let result: WolframData;
  try {
    // debug(`Executing: ${script}`)
    result = await executeWolframscript(script);
  } catch (err) {
    debug(`Wolfram '${script}' failed with '${err.message}'`);
    return;
  }
  debug(`Wolfram '${script}' returned '${result}'`);
  return result;
}

async function addSymbolDefStyles(tDoc: TDoc, style: StyleObject): Promise<void> {

  // TODO: This (inappropriately, IMHO) sets the variable in the kernel
  const script = `FullForm[Hold[${style.data}]]`;
  const result = await execute(script);
  if (!result) { return; }
  if (result.startsWith("Hold[Set[")) {
    // WARNING! TODO!  This may work but will not match
    // expressions which do not evaluate numerically.
    const name_matcher = /Hold\[Set\[(\w+),/g;
    const name_matches = name_matcher.exec(result);
    const value_matcher = /,\s+(.+)\]\]/g;
    const value_matches = value_matcher.exec(result);
    if (name_matches && value_matches) {
      // We have a symbol definition.

      // Add the symbol-definition style
      const data = { name: name_matches[1], value: value_matches[1] };
      const styleProps: StyleProperties = { type: 'SYMBOL', data, meaning: 'SYMBOL-DEFINITION', source: 'MATHEMATICA' }
      const newStyle = tDoc.insertStyle(style, styleProps);
      debug(`Inserting def style: ${JSON.stringify(newStyle)}`);

      // Add any symbol-dependency relationships as a result of the new symbol-def style
      for (const otherStyle of tDoc.getStyles()) {
        if (otherStyle.id == newStyle.id) { continue; }
        if (otherStyle.type == 'SYMBOL' &&
            otherStyle.meaning == 'SYMBOL-USE' &&
            otherStyle.data.name == newStyle.data.name) {
          const relationship = tDoc.insertRelationship(newStyle, otherStyle, { meaning: 'SYMBOL-DEPENDENCY' });
          debug(`Inserting relationship:: ${JSON.stringify(relationship)}`);
        }
      }
    }
  }
}

async function addSymbolUseStyles(tDoc: TDoc, style: StyleObject): Promise<void> {
  const script = `runPrivate[Variables[${style.data}]]`;
  const oresult = await execute(script);
  if (!oresult) { return; }
  debug("BEFORE: "+oresult);
  const result = draftChangeContextName(oresult);
  debug("CONTEXT REMOVED: "+result);

  // TODO: validate return value is in expected format with regex.
  const symbols = result.slice(1,-1).split(', ').filter( s => !!s)
  symbols.forEach(s => {

    // Add the symbol-use style
    const data: SymbolData = { name: s };
    const styleProps: StyleProperties = { type: 'SYMBOL', data, meaning: 'SYMBOL-USE', source: 'MATHEMATICA' }
    const newStyle = tDoc.insertStyle(style, styleProps);
    debug(`Inserting use style: ${JSON.stringify(newStyle)}`);

    // Add any symbol-dependency relationships as a result of the new symbol-use style
    for (const otherStyle of tDoc.getStyles()) {
      if (otherStyle.id == newStyle.id) { continue; }
      if (otherStyle.type == 'SYMBOL' &&
          otherStyle.meaning == 'SYMBOL-DEFINITION' &&
          otherStyle.data.name == newStyle.data.name) {
        const relationship = tDoc.insertRelationship(otherStyle, newStyle, { meaning: 'SYMBOL-DEPENDENCY' });
        debug(`Inserting relationship:: ${JSON.stringify(relationship)}`);
      }
    }
  });
}
