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

import { DebugParams, DebugResults, SearchParams, SearchResults } from "./shared/api-calls";
import { assert } from "./shared/common";

// Requirements

// Exported Functions

export async function apiDebug(params: DebugParams): Promise<DebugResults> {
  return await apiCall<DebugParams, DebugResults>('/api/debug', params);
}

export async function apiSearch(params: SearchParams): Promise<SearchResults> {
  return await apiCall<SearchParams, SearchResults>('/api/search', params);
}

// Helper Functions

export async function apiCall<P,R>(path: string, params: P): Promise<R> {
  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  const body = JSON.stringify(params);
  const response = await fetch(path, { method: 'POST', headers, body });
  assert(response.status == 200, `Error ${response.status} returned from ${path}`);
  // REVIEW: Check results headers for content type?
  const results = <R>await response.json();
  return results;
}
