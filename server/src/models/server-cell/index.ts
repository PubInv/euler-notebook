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

// Requirements

import * as debug1 from "debug";
// const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
// TODO: If file is index.ts then get name of module from enclosing directory.
// const debug = debug1(`server:${MODULE}`);
const debug = debug1(`server:server-cell`);

import { arrayFilterInPlace, escapeHtml, Html, Milliseconds } from "../../shared/common";
import { CssLength, CssSize, cssLengthInPixels, cssSizeFromPixels, LengthInPixels } from "../../shared/css";
import { CellId, CellObject, CellType } from "../../shared/cell";
import { SuggestionClass, SuggestionId, SuggestionObject } from "../../shared/suggestions";
import { SvgMarkup } from "../../shared/svg";

import { ServerNotebook } from "../server-notebook";
import { NotebookSuggestionsUpdated, NotebookUpdate, SuggestionUpdates } from "../../shared/server-responses";
import { cellIdentification, cellSynopsis } from "../../shared/debug-synopsis";
import { InactivityTimeout } from "../../shared/inactivity-timeout";

// Types

// Constants

const STROKE_INACTIVITY_INTERVAL: Milliseconds = 5000;

// Exported Class

export abstract class ServerCell<O extends CellObject> {

  // Public Constructor

  public constructor(
    notebook: ServerNotebook,
    obj: O, // IMPORTANT: We hold on to this object
            //            Caller must not modify object after passing to constructor.
  ) {
    this.notebook = notebook;
    this.obj = obj;
    this.strokeInactivityTimeout = new InactivityTimeout(STROKE_INACTIVITY_INTERVAL, ()=>{ return this.onStrokeInactivityTimeout(); });
  }

  // Public Instance Properties

  public obj: O;

  // Public Instance Property Functions

  public get heightInPixels(): LengthInPixels {
    return cssLengthInPixels(this.obj.cssSize.height);
  }

  public get id(): CellId { return this.obj.id; }
  public get type(): CellType { return this.obj.type; }

  public get cssSize(): CssSize { return this.obj.cssSize; }

  public abstract displaySvg(): SvgMarkup;

  public toHtml(): Html {
    return <Html>`<div>
<span class="collapsed">S${this.id} ${this.type} ${this.obj.source}</span>
<div class="nested" style="display:none">
  <tt>${escapeHtml(cellSynopsis(this.obj))}</tt>
</div>
</div>`;
  }

  // public get widthInPixels(): LengthInPixels {
  //   return pixelsFromCssLength(this.obj.cssSize.width);
  // }

  // Public Instance Methods

  // Public Instance Event Handlers

  public /* overridable */ onUpdate(update: NotebookUpdate): void {
    switch(update.type) {
      // case 'acceptSuggestion': this.onAcceptSuggestionRequest(source, changeRequest, response); break;

      case 'strokeDeleted':
      case 'strokeInserted': {
        // Strokes have changed, so wait for a few seconds of inactivity
        // before attempting to recognize the modified strokes.
        this.strokeInactivityTimeout.startOrPostpone();
        break;
      }
      // case 'resizeCell': { break; }
    }
  }

  // --- PRIVATE ---

  // Private Class Methods

  protected static initialCellSize(notebook: ServerNotebook, cssHeight: CssLength): CssSize {
    const pageWidth = cssLengthInPixels(notebook.pageSize.width);
    const leftMargin = cssLengthInPixels(notebook.margins.left);
    const rightMargin = cssLengthInPixels(notebook.margins.right);
    const width = pageWidth - leftMargin - rightMargin;
    const height = cssLengthInPixels(cssHeight);
    return cssSizeFromPixels(width, height);
  }

  protected updateSuggestions(
    add: SuggestionObject[],
    removeIds: SuggestionId[],
    removeClasses: SuggestionClass[],
  ): void {
    debug(`updateSuggestions for ${cellIdentification(this.obj)}: add ${add.length}, remove ${removeClasses.length} classes, remove ${removeIds.length}`);

    // Update suggestions attached to cell.
    const suggestions = this.obj.suggestions;
    const removed1 = arrayFilterInPlace(suggestions, s=>removeIds.indexOf(s.id)>=0);
    const removed2 = arrayFilterInPlace(suggestions, s=>s.hasOwnProperty('class') && removeClasses.indexOf(s.class!)>=0);
    for (const suggestionObject of add) {
      suggestions.push(suggestionObject);
    }

    // If the suggestions actually changed, then...
    const changed = add.length>0 || removed1.length>0 || removed2.length>0;
    if (changed) {
      debug(`  Suggestions changed so broadcasting and marking notebook dirty.`);

      // Broadcast a "suggestions updated" message to clients.
      const suggestionUpdates: SuggestionUpdates = {
        cellId: this.id,
        add,
        removeClasses,
        removeIds,
      };
      const response: NotebookSuggestionsUpdated = {
        type: 'notebook',
        path: this.notebook.path,
        operation: 'suggestionsUpdated',
        suggestionUpdates: [ suggestionUpdates ],
      };
      this.notebook.broadcastMessage(response);

      // Trigger a notebook save
      this.notebook.markDirty();
    } else {
      debug(`  Suggestions didn't change.`);
    }
  }

  // Private Instance Properties

  protected notebook: ServerNotebook;
  protected strokeInactivityTimeout: InactivityTimeout;

  // Private Instance Property Functions

  // Private Instance Methods

  // Private Instance Event Handlers

  // Inherited classes will trigger recognizing their strokes appropriate for their cell type.
  protected abstract onStrokeInactivityTimeout(): Promise<void>;
}

