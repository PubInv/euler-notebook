
// TODO: Success messages should self-dismiss.
// Exported functions

export function addBannerMessageToHeader(html) { addMessageToHeader('banner', html); }
export function addErrorMessageToHeader(html) { addMessageToHeader('error', html); }
export function addSuccessMessageToHeader(html) { addMessageToHeader('success', html, true); }
export function addWarningMessageToHeader(html) { addMessageToHeader('warning', html); }

// Event handlers

function onDomReady(_event){
  // TODO: try/catch and display error
  $('#fixedHeader').addEventListener('click', onFixedHeaderClick);
}

// Event handlers

function onFixedHeaderClick(event) {
  // If the user pressed a close button, then remove the entry from the header.
  // IMPORTANT: we assume the button is a direct child of the entry,
  //            and the entry is a direct child of the header.
  if (event.target.classList.contains('close')) {
    event.target.parentElement.parentElement.removeChild(event.target.parentElement);
  }
}

// Helper functions

function $(selector) {
  return document.querySelector(selector);
}

function $new(tag, classes, innerHTML) {
  const $elt = document.createElement(tag);
  for (const cls of classes) {
    $elt.classList.add(cls);
  }
  $elt.innerHTML = innerHTML;
  return $elt;
}

function addMessageToHeader(type, html, autoDismiss) {
  const $elt = $new('div', [type], html);
  const $button = $new('button', ['close'], "&#x2715;");
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
