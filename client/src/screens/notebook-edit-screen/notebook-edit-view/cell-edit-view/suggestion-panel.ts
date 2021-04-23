/*
Euler Notebook
Copyright (C) 2021 Public Invention
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

import { assertFalse, ElementId, Html } from "../../../../shared/common";
import { CellObject } from "../../../../shared/cell";
import { NotebookChangeRequest } from "../../../../shared/client-requests";
import { CssClass } from "../../../../shared/css";
import { renderFormula } from "../../../../shared/formula";
import { SuggestionAdded, SuggestionRemoved } from "../../../../shared/server-responses";
import { SuggestionObject, Suggestions } from "../../../../shared/suggestions";
import { SvgMarkup } from "../../../../shared/svg";

import { $all, $new, HtmlElementSpecification } from "../../../../dom";
import { HtmlElement } from "../../../../html-element";
import { ClientCell } from "../../../../models/client-cell";

// Requirements

// Types

// Constants

// Global Variables

// Exported Class

export class SuggestionPanel<O extends CellObject> extends HtmlElement<'div'> {

  // Public Class Properties
  // Public Class Property Functions
  // Public Class Methods
  // Public Class Event Handlers

  // Public Constructor

  public constructor(cell: ClientCell<O>) {

    const $noSuggestionsMsg = $new<'div'>({
      tag: 'div',
      html: <Html>"<i>No suggestions.</i>",
      hidden: cell.obj.suggestions.length>0,
    });

    super({
      tag: 'div',
      class: <CssClass>'suggestionPanel',
      children: [ $noSuggestionsMsg ],
      hidden: true,
    });

    this.$noSuggestionsMsg = $noSuggestionsMsg;
    this.cell = cell;

    this.addSuggestions(cell.obj.suggestions);
  }

  // Public Instance Properties
  // Public Instance Property Functions

  // Public Instance Methods

  public /* override */ show(): void {
    // We override show in order to position ourselves immediately above our parent element.
    const $parent = this.$elt.parentElement!;
    const domRect = $parent.getBoundingClientRect();
    const parentHeight = domRect.height;
    this.$elt.style.bottom = `${parentHeight}px`;
    super.show();
  }

  // Public Instance Event Handlers

  public onUpdate(update: SuggestionAdded|SuggestionRemoved, _ownRequest: boolean): void {

    switch (update.type) {
      case 'suggestionAdded': {
        this.addSuggestion(update.suggestionObject);
        this.$noSuggestionsMsg.style.display = 'none';
        this.showIfHidden();
        break;
      }
      case 'suggestionRemoved': {
        const { suggestionId } = update;
        const $suggestions = $all(this.$elt, `#${suggestionId}`);
        if ($suggestions.length>1) {
          console.warn(`More than one suggestion on cell ${this.cell.id} with ID ${suggestionId}`)
        }
        for (const $suggestion of $suggestions) { $suggestion.remove(); }
        const panelIsEmpty = (this.cell.obj.suggestions.length == 0);
        if (panelIsEmpty) {
          this.$noSuggestionsMsg.style.display = '';
          this.hideIfShown();
        }
        break;
      }
    }
  }

  // --- PRIVATE ---

  // Private Class Properties
  // Private Class Property Functions
  // Private Class Methods
  // Private Class Event Handlers

  // Private Instance Properties

  private $noSuggestionsMsg: HTMLDivElement;
  private cell: ClientCell<O>;

  // Private Instance Property Functions

  // Private Instance Methods

  private addSuggestion(suggestionObject: SuggestionObject): void {
    const spec: HtmlElementSpecification<'div'> =  {
      tag: 'div',
      id: <ElementId>suggestionObject.id,
      class: <CssClass>'suggestion',
      asyncListeners: {
        click: e=>this.onSuggestionClicked(e, suggestionObject.changeRequests),
      },
    };
    const display = suggestionObject.display;
    if (display.formula) {
      // REVIEW: Is .clientWidth the right attribute?
      const { svgMarkup } = renderFormula(display.formula, this.$elt.clientWidth);
      spec.html = <SvgMarkup>`<svg>${svgMarkup}</svg>`;
    } else if (display.html) {
      spec.html = display.html!;
    } else if (display.svg) {
      spec.html = display.svg;
    } else {
      assertFalse();
    }
    const $suggestion = $new<'div'>(spec);
    //const $svg = $outerSvg<'svg'>(alternative.svg);
    this.$elt.append($suggestion);
  }

  private addSuggestions(suggestions: Suggestions): void {
    for (const suggestionObject of suggestions) {
      this.addSuggestion(suggestionObject);
    }
  }

  // Private Instance Event Handlers

  private async onSuggestionClicked(_event: MouseEvent, changeRequests: NotebookChangeRequest[]): Promise<void> {
    // REVIEW: What do we do if error happens on the request?
    await this.cell.requestChanges(changeRequests);
  }

}

