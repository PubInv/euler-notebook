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

import { assert } from "./common.js";

// Types

type CssSelector = string;
type ElementId = string;
type ElementTag = string;
export type ElementClass = string;
type EventName = 'click'|'dblclick'; // TYPESCRIPT: Already defined somewhere?
export type Html = string;
type Listener<E extends Event> = (event: E)=>void;

interface Attributes {
  [name: string]: boolean|number|string,
}

interface Listeners {
  blur?: Listener<FocusEvent>;
  click?: Listener<MouseEvent>;
  dblclick?: Listener<MouseEvent>;
  focus?: Listener<FocusEvent>;
  input?: Listener<Event>; // REVIEW: More specific event type?
  keyup?: Listener<KeyboardEvent>;
  pointercancel?: Listener<PointerEvent>;
  pointerdown?: Listener<PointerEvent>;
  pointerenter?: Listener<PointerEvent>;
  pointerleave?: Listener<PointerEvent>;
  pointermove?: Listener<PointerEvent>;
  pointerout?: Listener<PointerEvent>;
  pointerover?: Listener<PointerEvent>;
  pointerup?: Listener<PointerEvent>;
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

export function $<T extends Element>(root: Element|Document, selector: CssSelector): T {
  const $elts = $all<T>(root, selector);
  assert($elts.length == 1, `Expected one element for selector '${selector}', got ${$elts.length}.`);
  return $elts[0];
}

export function $all<T extends Element>(root: Element|Document, selector: CssSelector): NodeListOf<T> {
  return root.querySelectorAll<T>(selector);
}

export function $attach<T extends Element>(root: Element|Document, selector: CssSelector, options: NewOptions): T {
  const $elt = $<T>(root, selector);
  configure<T>($elt, options);
  return $elt;
}

// REVIEW: $attachAll

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

export function configure<T extends Element>($elt: T, options: NewOptions): void {
  if (options.id) { $elt.setAttribute('id', options.id); }
  if (options.class) { $elt.classList.add(options.class); }
  if (options.classes) {
    for (const cls of options.classes) { $elt.classList.add(cls); }
  }
  if (options.attrs) {
    for (const key of Object.keys(options.attrs)) {
      const value = options.attrs[key];
      if (typeof value != 'boolean') {
        $elt.setAttribute(key, value.toString());
      } else {
        // Boolean types are present if set to any value, and MDN documentation recommends the empty string.
        if (value) { $elt.setAttribute(key, ''); }
      }
    }
  }
  if (options.html) { $elt.innerHTML = options.html; }
  if (options.style) { $elt.setAttribute('style', options.style); }
  if (options.appendTo) { options.appendTo.appendChild($elt); }
  if (options.listeners) { attachListeners($elt, options.listeners); }
}


// From: http://shebang.brandonmintern.com/foolproof-html-escaping-in-javascript/
export function escapeHtml(str: string): Html {
  var $div = document.createElement('div');
  $div.appendChild(document.createTextNode(str));
  return $div.innerHTML;
}

// HELPER FUNCTIONS

function attachListeners($elt: Element, listeners: Listeners) {
  const eventNames = <EventName[]>Object.keys(listeners);
  for (const eventName of eventNames) {
    const listener = listeners[eventName]!;
    $elt.addEventListener(eventName, listenerWrapper</* TYPESCRIPT: */any>($elt, eventName, listener))
  }
}

function listenerError(err: Error, $elt: Element, eventName: EventName): void {
  let specifier = $elt.tagName;
  if ($elt.id) { specifier += `#${$elt.id}` }
  for (let i = 0; i<$elt.classList.length; i++) {
    specifier += `.${$elt.classList.item(i)}`
  }
  console.log(`Error in ${specifier} ${eventName} listener: ${err.message}`);
  console.dir(err);

  // TODO: Throw???
  // TODO: Report error to the server.
  // TODO: Display error to the user.
}

export function listenerWrapper<E extends Event>($elt: Element, eventName: EventName, listener: Listener<E>): (event: E)=>void {
  return function(event: E): void {
    try {
      listener(event);
    } catch(err) {
      listenerError(err, $elt, eventName);
    }
  };
}
