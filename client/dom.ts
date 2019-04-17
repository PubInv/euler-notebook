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

// Types

type CssSelector = string;
type HtmlElementTag = string;
export type HtmlElementClass = string;
export type Html = string;

// Exported Functions

export function $<T extends HTMLElement>(selector: CssSelector): T {
  const $elt = document.querySelector(selector);
  if (!$elt) { throw new Error(`Element '${selector}' not found in DOM.`); }
  return <T>$elt;
}

export function $new(tag: HtmlElementTag, id?: string, classes?: HtmlElementClass[], html?: Html): HTMLElement {
  const $elt = document.createElement(tag);
  if (id) { $elt.setAttribute('id', id); }
  if (classes) {
    for (const cls of classes) { $elt.classList.add(cls); }
  }
  if (html) { $elt.innerHTML = html; }
  return $elt;
}
