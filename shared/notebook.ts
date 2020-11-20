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

import { CellObject } from "./cell";
import { CssLength, CssSize, POINTS_PER_INCH } from "./common";
import { CellInserted, NotebookUpdate } from "./server-responses";
import { Watcher } from "./watched-resource";

// Types

export interface NotebookObject {
  pages: PageObject[];
  formatVersion: string;
}

export interface NotebookWatcher extends Watcher {
  onChange(change: NotebookUpdate, ownRequest: boolean): void;
}

export interface PageObject {
  cells: CellObject[];
  margins: PageMargins;
  size: CssSize;
}

export interface PageMargins {
  bottom: CssLength;
  left: CssLength;
  right: CssLength;
  top: CssLength;
}

// Constants

export const FORMAT_VERSION = "0.0.18";

// Exported Class

// Helper Functions

export function cellInsertedFromNotebookChange(change: NotebookUpdate): CellInserted {
  // TODO: Rename this function so it doesn't start with a capital letter.
  if (change.type != 'cellInserted') { throw new Error("Not StyleInserted change."); }
  return change;
}

export function inchesInPoints(inches: number): CssLength {
  return <CssLength>`${Math.round(inches * POINTS_PER_INCH)}pt`;
}
