/*
Euler Notebook
Copyright (C) 2019-21 Public Invention
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

// TODO: Why can't we scroll the search results?
// LATER: Keyboard shortcut to open/close search panel.
// LATER: Spinner to show search in progress.
// LATER: Click/tap on content, sidebar, or header should dismiss search panel.
// LATER: Offer recent searches.
// LATER: Search query autocompletion.
// LATER: Start querying after typing first complete work.
// LATER: Stylus input of search text.

// Requirements

import { CssClass, escapeHtml, Html, PlainText } from "../../shared/common";
import { $, $new, svgIconReferenceMarkup } from "../../dom";

import { HtmlElement } from "../../html-element";

import { NotebookEditScreen } from "./index";
import { apiSearch } from "../../api";
import { SearchParams, SearchResult } from "../../shared/api-calls";

// Types

// Constants

// Global Variables

// Exported Class

export class SearchPanel extends HtmlElement<'div'> {

  // Public Class Methods

  // Public Constructor

  public constructor(screen: NotebookEditScreen) {

    const $queryInput = $new({
      tag: 'input',
      attrs: {
        type: 'text',
        placeholder: "Search for...",
      },
    });

    super({
      tag: 'div',
      class: <CssClass>'searchPanel',
      children: [
        {
          tag: 'form',
          class: <CssClass>'searchForm',
          children: [
            $queryInput,
            {
              tag: 'button',
              class: <CssClass>'smallIconButton',
              type: 'submit',
              title: "Search",
              html: svgIconReferenceMarkup('iconMonstrMagnifier6'),
            }
          ],
          asyncListeners: {
            submit: (e: Event) => this.onSubmit(e),
          },
        }, {
          tag: 'div',
          class: <CssClass>'searchResults',
        }
      ],
      hidden: true,
    });

    this.$queryInput = $queryInput;
    this.screen = screen;
  }

  // Public Instance Properties

  // Public Instance Methods

  public setFocus(): void {
    this.$queryInput.focus();
  }

  // -- PRIVATE --

  // Private Instance Properties

  private $queryInput: HTMLInputElement;
  private screen: NotebookEditScreen;

  // Private Instance Methods

  private async onSubmit(e: /* TYPESCRIPT: Why not SubmitEvent? */Event): Promise<void> {
    e.preventDefault(); // Don't perform form submit navigation.
    const notebookPath = this.screen.notebook.path;
    const query = <PlainText>this.$queryInput.value;
    const params: SearchParams = { notebookPath, query }
    const results = await apiSearch(params);
    const html = <Html>`<h1>Wolfram Alpha</h1>\n${formatSearchResults(results.wolframAlpha)}\n<h1>OEIS</h1>\n${formatSearchResults(results.oeis)}\n`;
    $(this.$elt, '.searchResults').innerHTML = html;
  }

  // Private Event Handlers

}

// Helper Function

function formatSearchResults(results: SearchResult[]): Html {
  return <Html>`<ul>${results.map(formatSearchResult).join('\n')}</ul>`
}

function formatSearchResult(r: SearchResult): Html {
  let rval = '<div>';

  // LATER: Style with CSS, not <b>, <tt>, etc. elements.
  if (r.title) {
    rval += `<div><b>${escapeHtml(r.title)}</b></div>`;
  }

  if (r.html) {
    rval += `<div>${r.html}</div>`;
  }

  if (r.text) {
    rval += `<div>${escapeHtml(r.text)}</div>`;
  }

  if (r.formula) {
    rval += `<div><tt>${escapeHtml(r.formula)}</tt></div>`;
  }

  if (r.knownConstant) {
    rval += `<div><tt>${escapeHtml(r.knownConstant)}</tt></div>`;
  }

  if (r.wolframExpr) {
    rval += `<div><tt>${escapeHtml(r.wolframExpr)}</tt></div>`;
  }

  // TODO: Format TeX expression!
  if (r.texExpr) {
    rval += `<div><tt>${escapeHtml(r.texExpr)}</tt></div>`;
  }

  rval += '</div>';
  return <Html>rval;
}
