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

import { TDoc, Change as TDocChange } from './tdoc';

// Exports

export async function initialize(): Promise<void> {
  TDoc.on('open', (tDoc: TDoc)=>{
    tDoc.on('change', function(this: TDoc, change: TDocChange){ onChange(this, change); });
    tDoc.on('close', function(this: TDoc){ onClose(this); });
    onOpen(tDoc);
  });
}

// Private Functions

function onChange(tDoc: TDoc, change: TDocChange): void {
  switch (change.type) {
  case 'styleDeleted':
    console.log(`Mathematica tDoc ${tDoc._name}/${change.type} change: `);
    break;
  case 'styleInserted':
    console.log(`Mathematica tDoc ${tDoc._name}/${change.type} change: `);
    break;
  case 'thoughtDeleted':
    console.log(`Mathematica tDoc ${tDoc._name}/${change.type} change: `);
    break;
  case 'thoughtInserted':
    console.log(`Mathematica tDoc ${tDoc._name}/${change.type} change: `);
    break;
  default:
    console.log(`Mathematica tDoc unknown change: ${tDoc._name} ${(<any>change).type}`);
    break;
  }
}

function onClose(tDoc: TDoc): void {
  console.log(`Mathematica tDoc close: ${tDoc._name}`);
}

function onOpen(tDoc: TDoc): void {
  console.log(`Mathematica: tDoc open: ${tDoc._name}`);
}
