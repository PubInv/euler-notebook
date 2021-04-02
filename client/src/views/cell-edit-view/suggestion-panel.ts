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

import { CellObject } from "../../shared/cell";
import { ElementId, Html, JsonObject } from "../../shared/common";
import { CssClass } from "../../shared/css";
import { SuggestionId, SuggestionUpdates } from "../../shared/server-responses";

import { $, $all, $new, HtmlElementSpecification } from "../../dom";
import { HtmlElement } from "../../html-element";
import { ClientCell } from "../../models/client-cell";

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
    });

    super({
      tag: 'div',
      class: <CssClass>'suggestionPanel',
      children: [ $noSuggestionsMsg ],
      hidden: true,
    });

    this.$noSuggestionsMsg = $noSuggestionsMsg;
    this.cell = cell;
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

  public onSuggestionsUpdate(suggestionUpdates: SuggestionUpdates, _ownRequest: boolean): void {

    // Remove any individual suggestions that are identified for removal.
    for (const suggestionId of suggestionUpdates.removeIds) {
      // TODO: Fail gracefully with warning if id is not found.
      $(this.$elt, `#${suggestionId}`).remove();
    }

    // Remove any classes of suggestions that are identified for removal.
    for (const suggestionClass of suggestionUpdates.removeClasses) {
      for (const $suggestionElt of $all(this.$elt, `.${suggestionClass}`)) {
        $suggestionElt.remove();
      }
    }

    // Add any new suggestions that are specified.
    for (const suggestion of suggestionUpdates.add) {
      const spec: HtmlElementSpecification<'div'> =  {
        tag: 'div',
        id: <ElementId>suggestion.id,
        classes: [ <CssClass>suggestion.class, <CssClass>'suggestion' ],
        asyncListeners: {
          click: e=>this.onSuggestionClicked(e, suggestion.id, suggestion.data),
        },
        html: suggestion.html,
      };
      const $suggestion = $new<'div'>(spec);
      //const $svg = $outerSvg<'svg'>(alternative.svg);
      this.$elt.append($suggestion);
    }

    // If the suggestions panel is now empty, then display a message to that effect in the panel.
    const panelIsEmpty = this.$elt.childElementCount < 2;
    this.$noSuggestionsMsg.style.display = (panelIsEmpty ? '' : 'none');

    // If suggestions were added, and we are hidden, then show ourself
    // to alert the user of the new suggestions.
    // If the update removes all suggestions, then hide ourself
    // as we no longer have anything to offer.
    const suggestionsAdded = suggestionUpdates.add && suggestionUpdates.add.length>0;
    if (suggestionsAdded) {
      this.showIfHidden();
    } else if (panelIsEmpty) {
      this.hideIfShown();
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

  // Private Instance Event Handlers

  private async onSuggestionClicked(_event: MouseEvent, suggestionId: SuggestionId, suggestionData: JsonObject): Promise<void> {
    // REVIEW: What do we do if error happens on the request?
    await this.cell.acceptSuggestion(suggestionId, suggestionData);
  }

}

