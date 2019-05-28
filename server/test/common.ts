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

// import * as debug1 from 'debug';
// const MODULE = __filename.split('/').slice(-1)[0].slice(0,-3);
// const debug = debug1(`server:${MODULE}`);

import { assert } from 'chai';

import { StyleObject, StyleType, StyleMeaning, StyleSource, StyleProperties, ToolMenu } from "../../client/math-tablet-api";
import { TDoc } from "../tdoc";

// Exported Functions

export function assertHasStyles(
  styles: StyleObject[],
  type: StyleType,
  meaning: StyleMeaning,
  source: StyleSource,
  datas: string[]
): void {
  const styles2 = findStyles(styles, type, meaning, source);
  assert(styles2);
  assert.equal(styles2!.length, datas.length);
  for (const data of datas) {
    assert(styles2!.find(s=>(s.data==data)));
  }
}

// IMPORTANT: This will not work for observers that add styles and thoughts asynchronously.
export function getSubstylesGeneratedForStyle(styleProps: StyleProperties): StyleObject[] {
  const tDoc = TDoc.createAnonymous();
  const thought = tDoc.insertThought({});
  const style = tDoc.insertStyle(thought, styleProps);
  const substyles = tDoc.getStyles(style.id);
  return substyles;
}

// IMPORTANT: This will not work for observers that add styles and thoughts asynchronously.
export function getToolMenusGeneratedForStyle(styleProps: StyleProperties): ToolMenu[] {
  const tDoc = TDoc.createAnonymous();
  const thought = tDoc.insertThought({});
  tDoc.insertStyle(thought, styleProps);
  const styles = tDoc.getStyles(thought.id).filter(s=>s.type=='TOOL-MENU');
  return styles.map(s=>s.data);
}

// Helper Functions

function findStyles(
  styles: StyleObject[],
  type: StyleType,
  meaning: StyleMeaning,
  source: StyleSource
): StyleObject[]|undefined {
  return styles.filter(s=>(s.type==type && s.meaning==meaning && s.source==source))
}

