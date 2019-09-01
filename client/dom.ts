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
type ElementId = string;
type ElementTag = string;
export type ElementClass = string;
type EventName = 'click'|'dblclick'; // TYPESCRIPT: Already defined somewhere?
export type Html = string;
type Listener<E extends Event> = (event: E)=>void;

interface Attributes {
  [name: string]: string|number,
}

interface Listeners {
  click?: Listener<MouseEvent>;
  dblclick?: Listener<MouseEvent>;
  input?: Listener<Event>; // REVIEW: More specific event type?
  keyup?: Listener<KeyboardEvent>;
}

interface NewOptions {
  appendTo?: Element;
  attrs?: Attributes;
  class?: ElementClass;
  classes?: ElementClass[];
  html?: Html;
  id?: ElementId;
  listeners?: Listeners;
  style?: string;
}

// Constants

const SVG_NS = 'http://www.w3.org/2000/svg';

// Exported Functions

export function $<T extends Element>(selector: CssSelector): T {
  const $elt = document.querySelector(selector);
  if (!$elt) { throw new Error(`Element '${selector}' not found in DOM.`); }
  return <T>$elt;
}

export function $all<T extends Element>(selector: CssSelector): NodeListOf<T> {
  return document.querySelectorAll(selector);
}

export function $new<T extends HTMLElement>(tag: ElementTag, options?: NewOptions): T {
  const $elt = <T>document.createElement(tag);
  if (options) { configure($elt, options); }
  options = options || {};
  return $elt;
}

export function $newSvg<T extends SVGElement>(tag: ElementTag, options?: NewOptions): T {
  const $elt = <T>document.createElementNS(SVG_NS, tag);
  if (options) { configure($elt, options); }
  options = options || {};
  return $elt;
}


// From: http://shebang.brandonmintern.com/foolproof-html-escaping-in-javascript/
export function escapeHtml(str: string): Html {
  var $div = document.createElement('div');
  $div.appendChild(document.createTextNode(str));
  return $div.innerHTML;
}

// HELPER FUNCTIONS

function configure($elt: Element, options: NewOptions): void {
  if (options.id) { $elt.setAttribute('id', options.id); }
  if (options.class) { $elt.classList.add(options.class); }
  if (options.classes) {
    for (const cls of options.classes) { $elt.classList.add(cls); }
  }
  if (options.attrs) {
    for (const key of Object.keys(options.attrs)) {
      const value = options.attrs[key];
      $elt.setAttribute(key, value.toString());
    }
  }
  if (options.html) { $elt.innerHTML = options.html; }
  if (options.style) { $elt.setAttribute('style', options.style); }

  if (options.appendTo) { options.appendTo.appendChild($elt); }

  if (options.listeners) {
    const eventNames = <EventName[]>Object.keys(options.listeners);
    for (const eventName of eventNames) {
      const listener = options.listeners[eventName]!;
      $elt.addEventListener(eventName, listenerWrapper</* TYPESCRIPT: */any>($elt, eventName, listener))
    }
  }
}

function listenerError(err: Error, $elt: Element, eventName: EventName): never {
  let specifier = $elt.tagName;
  if ($elt.id) { specifier += `#${$elt.id}` }
  for (let i = 0; i<$elt.classList.length; i++) {
    specifier += `.${$elt.classList.item(i)}`
  }
  console.error(`Error in ${specifier} ${eventName} listener: ${err.message}`);
  throw err;
}

function listenerWrapper<E extends Event>($elt: Element, eventName: EventName, listener: Listener<E>): (event: E)=>void {
  return function(event: E): void {
    try {
      listener(event);
    } catch(err) {
      listenerError(err, $elt, eventName);
    }
  };
}
