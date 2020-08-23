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

import { assert } from './shared/common';
import { SyncListener, addSyncEventListener, addAsyncEventListener, AsyncListener } from './error-handler';

// Types

type CssSelector = string;
type ElementId = string;
export type ElementClass = string;
export type Html = string;

interface Attributes {
  [name: string]: boolean|number|string,
}

interface AsyncListeners {
  click?: AsyncListener<MouseEvent>;
}

interface SyncListeners {
  // REVIEW: Can we populate this declaratively from the standard DOM types?
  blur?: SyncListener<FocusEvent>;
  click?: SyncListener<MouseEvent>;
  dblclick?: SyncListener<MouseEvent>;
  dragend?: SyncListener<DragEvent>;
  dragstart?: SyncListener<DragEvent>;
  dragover?: SyncListener<DragEvent>;
  dragenter?: SyncListener<DragEvent>;
  drop?: SyncListener<DragEvent>;
  focus?: SyncListener<FocusEvent>;
  input?: SyncListener<Event>; // REVIEW: More specific event type?
  keyup?: SyncListener<KeyboardEvent>;
  mousedown?: SyncListener<MouseEvent>;
  pointercancel?: SyncListener<PointerEvent>;
  pointerdown?: SyncListener<PointerEvent>;
  pointerenter?: SyncListener<PointerEvent>;
  pointerleave?: SyncListener<PointerEvent>;
  pointermove?: SyncListener<PointerEvent>;
  pointerout?: SyncListener<PointerEvent>;
  pointerover?: SyncListener<PointerEvent>;
  pointerup?: SyncListener<PointerEvent>;
}

interface NewCommonOptions {
  appendTo?: Element;
  asyncListeners?: AsyncListeners;
  attrs?: Attributes;
  class?: ElementClass;
  classes?: ElementClass[];
  id?: ElementId;
  hidden?: boolean;
  listeners?: SyncListeners;
  style?: string;
  title?: string; // TODO: Implement
}

interface NewHtmlOptions<K extends keyof HTMLElementTagNameMap> extends NewCommonOptions {
  tag: K;
  children?: NewHtmlOptions<any>[];
  html?: Html;
}

interface NewSvgOptions<K extends keyof SVGElementTagNameMap> extends NewCommonOptions {
  tag: K;
  children?: NewSvgOptions<any>[];
  html?: Html;
}

// Constants

const SVG_NS = 'http://www.w3.org/2000/svg';

const ENUMERATED_ATTRIBUTES = new Set<string>([ 'draggable']);

export const CLOSE_X_ENTITY = '&#x2715;'
export const RIGHT_TRIANGLE_ENTITY = '&#x25B6;';
export const RIGHT_ARROW_ENTITY = '&#x27A1;';

// Exported Functions

export function $<K extends keyof HTMLElementTagNameMap>(root: Element|Document, selector: string): HTMLElementTagNameMap[K] {
  const $elts = $all<K>(root, selector);
  assert($elts.length == 1, `Expected one element for selector '${selector}', got ${$elts.length}.`);
  return $elts[0];
}

export function $svg<K extends keyof SVGElementTagNameMap>(root: Element|Document, selector: string): SVGElementTagNameMap[K] {
  const $elts = $allSvg<K>(root, selector);
  assert($elts.length == 1, `Expected one element for selector '${selector}', got ${$elts.length}.`);
  return $elts[0];
}

export function $all<K extends keyof HTMLElementTagNameMap>(root: Element|Document, selector: string): NodeListOf<HTMLElementTagNameMap[K]> {
  return root.querySelectorAll<HTMLElementTagNameMap[K]>(selector);
}

export function $allSvg<K extends keyof SVGElementTagNameMap>(root: Element|Document, selector: string): NodeListOf<SVGElementTagNameMap[K]> {
  return root.querySelectorAll<SVGElementTagNameMap[K]>(selector);
}

export function $attach<K extends keyof HTMLElementTagNameMap>(
  root: Element|Document,
  selector: CssSelector,
  options: NewCommonOptions,
): HTMLElementTagNameMap[K] {
  const $elt = $<K>(root, selector);
  $configure($elt, options);
  return $elt;
}

export function $new<K extends keyof HTMLElementTagNameMap>(options: NewHtmlOptions<K>): HTMLElementTagNameMap[K] {
  const $elt = document.createElement(options.tag);
  $configure($elt, options);
  if (options.html) { $elt.innerHTML = options.html; }
  if (options.children) {
    for (const childOptions of options.children) {
      $new({ ...childOptions, appendTo: $elt});
    }
  }
  return $elt;
}

export function $newSvg<K extends keyof SVGElementTagNameMap>(options: NewSvgOptions<K>): SVGElementTagNameMap[K] {
  const $elt = document.createElementNS(SVG_NS, options.tag);
  $configure($elt, options);
  return $elt;
}

export function $configure($elt: HTMLElement|SVGElement, options: NewCommonOptions): void {
  if (options.id) { $elt.setAttribute('id', options.id); }
  if (options.class) { $elt.classList.add(options.class); }
  if (options.classes) {
    for (const cls of options.classes) { $elt.classList.add(cls); }
  }
  if (options.attrs) { attachAttributes($elt, options.attrs); }
  if (options.style) { $elt.setAttribute('style', options.style); }
  if (options.hidden) { $elt.style.display = 'none'; }
  if (options.appendTo) { options.appendTo.appendChild($elt); }
  if (options.listeners) { attachSyncListeners($elt, options.listeners); }
  if (options.asyncListeners) { attachAsyncListeners($elt, options.asyncListeners); }
}

export function $configureAll($elts: NodeListOf<HTMLElement|SVGElement>, options: NewCommonOptions): void {
  for (const $elt of $elts) { $configure($elt, options); }
}

// From: http://shebang.brandonmintern.com/foolproof-html-escaping-in-javascript/
export function escapeHtml(str: string): Html {
  var $div = document.createElement('div');
  $div.appendChild(document.createTextNode(str));
  return $div.innerHTML;
}

export function svgIconReference(id: string): string {
  return `<svg class="icon"><use xlink:href="#${id}"/></svg>`
}

// HELPER FUNCTIONS

function attachAttributes($elt: Element, attrs: Attributes): void {
  for (const key of Object.keys(attrs)) {
    const value = attrs[key];
    if (typeof value !== 'boolean') {
      $elt.setAttribute(key, value.toString());
    } else {
      // Boolean types are present if set to any value, and MDN documentation recommends the empty string,
      // unless they are "enumerated", in which case they should be explicitly "true" or "false".
      if (ENUMERATED_ATTRIBUTES.has(key)) {
        $elt.setAttribute(key, value.toString());
      } else {
        if (value) { $elt.setAttribute(key, ''); }
      }
    }
  }
}

function attachAsyncListeners($elt: Element, listeners: AsyncListeners): void {
  // REVIEW: Might be nice to pass a function to generate the error message to addSyncEventListener,
  //         so we don't have to do the work of generating the "specifier" unless an error actually occurs.
  const specifier = elementSpecifier($elt);
  for (const [ eventName, listener ] of Object.entries(listeners)) {
    addAsyncEventListener($elt, eventName, listener, `Internal error processing ${specifier} ${eventName} event.`);
  }
}

function attachSyncListeners($elt: Element, listeners: SyncListeners): void {
  // REVIEW: Might be nice to pass a function to generate the error message to addSyncEventListener,
  //         so we don't have to do the work of generating the "specifier" unless an error actually occurs.
  const specifier = elementSpecifier($elt);
  for (const [ eventName, listener ] of Object.entries(listeners)) {
    addSyncEventListener($elt, eventName, listener, `Internal error processing ${specifier} ${eventName} event.`);
  }
}

function elementSpecifier($elt: Element): string {
  // Returns a string that attempts to identify the element for debugging.
  // LATER: We could walk the parent chain concatenating specifiers.
  let specifier = $elt.tagName;
  if ($elt.id) { specifier += `#${$elt.id}` }
  for (let i = 0; i<$elt.classList.length; i++) {
    specifier += `.${$elt.classList.item(i)}`
  }
  return specifier;
}

