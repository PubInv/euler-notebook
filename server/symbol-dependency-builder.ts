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

import { NotebookChange, StyleInserted } from '../client/math-tablet-api';
import { TDoc } from './tdoc';

// Types

// Exports

export async function initialize(): Promise<void> {
  TDoc.on('open', (tDoc: TDoc)=>{
    tDoc.on('change', function(this: TDoc, change: NotebookChange){ onChange(this, change); });
    tDoc.on('close', function(this: TDoc){ onClose(this); });
    onOpen(tDoc);
  });
}

// Event Handlers

function onChange(tDoc: TDoc, change: NotebookChange): void {
  switch (change.type) {
  case 'styleInserted': onChStyleInserted(tDoc, change); break;
  default: break;
  }
}

function onClose(_tDoc: TDoc): void {
  // console.log(`QuadClassifier tDoc close: ${tDoc._path}`);
}

function onOpen(_tDoc: TDoc): void {
  // console.log(`QuadClassifier: tDoc open: ${tDoc._path}`);
}

// Change Event Handlers

function onChStyleInserted(tDoc: TDoc, change: StyleInserted): void {
  const style = change.style;
  if (style.type == 'SYMBOL' && style.meaning == 'SYMBOL-DEFINITION') {
    for (const style2 of tDoc.getStyles()) {
      if (style2.type == 'SYMBOL' &&
          style2.meaning == 'SYMBOL-USE' &&
          style2.data.name == style.data.name) {
        tDoc.insertRelationship(style, style2, { meaning: 'SYMBOL-DEPENDENCY' });
      }
    }
  } else if (style.type == 'SYMBOL' && style.meaning == 'SYMBOL-USE') {
    for (const style2 of tDoc.getStyles()) {
      if (style2.type == 'SYMBOL' &&
          style2.meaning == 'SYMBOL-DEFINITION' &&
          style2.data.name == style.data.name) {
        tDoc.insertRelationship(style2, style, { meaning: 'SYMBOL-DEPENDENCY' });
      }
    }
  }
}