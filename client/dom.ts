

type CssSelector = string;
type HtmlElementTag = string;
export type HtmlElementClass = string;
export type Html = string;

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
