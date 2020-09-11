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

// NOTE: This is not a complete set of types for the library.
//       Just the stuff that we have used.

// TYPESCRIPT: Can we get this from the katex library?

import { LatexData } from "./shared/math-tablet-api";

// Types

interface KatexGlobal {
  render(latex: LatexData, $elt: HTMLElement, options: KatexOptions): void;
  renderToString(latex: LatexData, options: KatexOptions): /* TYPESCRIPT: Html */ string;
}

interface KatexOptions {
  throwOnError?: boolean;
}

// Exported functions

export function getKatex(): KatexGlobal {
  return (<any>window).katex;
}
