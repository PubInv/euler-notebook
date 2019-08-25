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

// TODO: Disable home button when we are on the home page.

// Requirements

import { $, $new, Html, ElementClass } from './dom.js';

// Types

// Exported functions

export function addBannerMessageToHeader(html: Html) { addMessageToHeader('banner', html); }
export function addErrorMessageToHeader(html: Html) { addMessageToHeader('error', html); }
export function addSuccessMessageToHeader(html: Html) { addMessageToHeader('success', html, true); }
export function addWarningMessageToHeader(html: Html) { addMessageToHeader('warning', html); }

export function showErrorMessage(html: Html, err?: Error): void {
  if (err) {
    html += `<br/><pre>${err.message}</pre>`;
  }
  addErrorMessageToHeader(html);
  throw err;
}

// export function showSuccessMessage(html: Html): void {
//   addSuccessMessageToHeader(html);
// }


// Event handlers

function onDomReady(_event: Event) {
  try {
    $('#banner').addEventListener('click', onBannerClick);
    $<HTMLButtonElement>('#homeButton').addEventListener<'click'>('click', _event=>{ window.location.href = '/' });
    $<HTMLButtonElement>('#userButton').addEventListener<'click'>('click', _event=>{ alert("User menu not yet implemented."); });
  } catch(err) {
    addErrorMessageToHeader(`Iinitialization error: ${err.message}`);
    throw err;
  }
}

// Event handlers

function onBannerClick(event: Event): void {
  // If the user pressed a close button, then remove the entry from the header.
  // IMPORTANT: we assume the button is a direct child of the entry,
  //            and the entry is a direct child of the header.
  const $target: Element = <Element>(event.target);
  const $parent = $target.parentElement;
  if (!$parent) { throw new Error(); }
  const $grandparent = $parent.parentElement;
  if (!$grandparent) { throw new Error(); }
  if ($target.classList.contains('close')) {
    $grandparent.removeChild($parent);
  }
}

// Helper functions

function addMessageToHeader(type: ElementClass, html: Html, autoDismiss?: boolean): void {
  const $elt = $new<HTMLDivElement>('div', { class: type, html});
  const $button = $new<HTMLButtonElement>('button', { class: 'close', html: "&#x2715;" });
  $elt.appendChild($button);
  const $banner = $('#banner');
  $banner.appendChild($elt);
  if (autoDismiss) {
    setTimeout(function(){ try { $banner.removeChild($elt); } catch(err){} }, 3000);
  }
}

// Entry point

function main(){
  window.addEventListener('DOMContentLoaded', onDomReady);
}

main();
