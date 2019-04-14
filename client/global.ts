
import { $, $new, Html, HtmlElementClass } from './dom.js';

// Types

// Exported functions

export function addBannerMessageToHeader(html: Html) { addMessageToHeader('banner', html); }
export function addErrorMessageToHeader(html: Html) { addMessageToHeader('error', html); }
export function addSuccessMessageToHeader(html: Html) { addMessageToHeader('success', html, true); }
export function addWarningMessageToHeader(html: Html) { addMessageToHeader('warning', html); }


// Event handlers

function onDomReady(_event: Event) {
  try {
    $('#fixedHeader').addEventListener('click', onFixedHeaderClick);
  } catch(err) {
    addErrorMessageToHeader("Error in global page initialization.");
  }
}

// Event handlers

function onFixedHeaderClick(event: Event): void {
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

function addMessageToHeader(type: HtmlElementClass, html: Html, autoDismiss?: boolean): void {
  const $elt = $new('div', undefined, [type], html);
  const $button = $new('button', undefined, ['close'], "&#x2715;");
  $elt.appendChild($button);
  const $header = $('#fixedHeader');
  $header.appendChild($elt);
  if (autoDismiss) {
    setTimeout(function(){ try { $header.removeChild($elt); } catch(err){} }, 3000);
  }
}

// Entry point

function main(){
  window.addEventListener('DOMContentLoaded', onDomReady);
}

main();
