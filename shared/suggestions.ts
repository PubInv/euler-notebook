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

// Requirements

import { NotebookChangeRequest } from "./client-requests";
import { Html } from "./common";
import { MathMlTree } from "./mathml";
import { SvgMarkup } from "./svg";

// Types

export type SuggestionId = '{SuggestionId}';
export type SuggestionClass = '{SuggestionClass}';
export type Suggestions = SuggestionObject[];

interface SuggestionDisplay {
  formulaMathMlTree?: MathMlTree;
  html?: Html;
  svg?: SvgMarkup;
}

export interface SuggestionObject {
  id: SuggestionId;
  class?: SuggestionClass;
  changeRequests: NotebookChangeRequest[];
  display: SuggestionDisplay;
}
