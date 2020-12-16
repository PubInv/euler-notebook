/*
Math Tablet
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

// TODO: Version the client/server API so if they get out of sync the user gets an error
//       message instead of a server or client crash.

// Requirements

import { CellId } from "./cell";
import { Html, PlainText } from "./common";
import { NotebookPath } from "./folder";

// Types

// API Calls

export interface DebugParams {
  // /api/debug post JSON params
  notebookPath: NotebookPath;
  cellId?: CellId;
}

export interface DebugResults {
  // /api/debug JSON return value
  html: string;
}

export interface SearchParams {
  query: PlainText;
  notebookPath: NotebookPath;
}

export interface SearchResults {
  results: SearchResult[];
}

// Other

export interface NameValuePair {
  name: string;
  value: string;
}

export interface SearchResult {
  title?: PlainText;
  text?: PlainText; // a short summary
  html?: Html;
  raw?: object;
  formula?: PlainText; // if present, this is would a syntactically correct wolfram language expression
  knownConstant?: PlainText;
}
