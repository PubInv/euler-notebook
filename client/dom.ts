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

interface NewOptions {
  appendTo?: HTMLElement;
  class?: HtmlElementClass;
  classes?: HtmlElementClass[];
  html?: Html;
  id?: string;
}

// Exported Functions

export function $<T extends HTMLElement>(selector: CssSelector): T {
  const $elt = document.querySelector(selector);
  if (!$elt) { throw new Error(`Element '${selector}' not found in DOM.`); }
  return <T>$elt;
}

export function $new<T extends HTMLElement>(tag: HtmlElementTag, options?: NewOptions): T {
  const $elt = <T>document.createElement(tag);
  options = options || {};
  if (options.id) { $elt.setAttribute('id', options.id); }
  if (options.class) { $elt.classList.add(options.class); }
  if (options.classes) {
    for (const cls of options.classes) { $elt.classList.add(cls); }
  }
  if (options.html) { $elt.innerHTML = options.html; }
  if (options.appendTo) { options.appendTo.appendChild($elt); }
  return $elt;
}

// From: http://shebang.brandonmintern.com/foolproof-html-escaping-in-javascript/
export function escapeHtml(str: string): Html {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

