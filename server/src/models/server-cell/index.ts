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

import { escapeHtml, Html, Milliseconds } from "../../shared/common";
import { CssLength, CssSize, cssLengthInPixels, LengthInPixels, cssLengthFromPixels } from "../../shared/css";
import { CellId, CellObject, CellType } from "../../shared/cell";

import { ServerNotebook } from "../server-notebook";
import { NotebookUpdate } from "../../shared/server-responses";
import { cellSynopsis, notebookUpdateSynopsis } from "../../shared/debug-synopsis";
import { InactivityTimeout } from "../../shared/inactivity-timeout";
import { AddSuggestion, NotebookChangeRequest, RemoveSuggestion } from "../../shared/client-requests";
import { SuggestionClass, SuggestionObject, TYPESETTING_SUGGESTION_CLASS } from "../../shared/suggestions";
import { logError } from "../../error-handler";

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
    debug(`onUpdate ${notebookUpdateSynopsis(update)}`);
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

  protected static initialCellSize(notebook: ServerNotebook, height: CssLength): CssSize {
    return {
      width: cssLengthFromPixels(notebook.defaultCellWidth()),
      height,
    };
  }

  // Private Instance Properties

  protected notebook: ServerNotebook;
  protected strokeInactivityTimeout: InactivityTimeout;

  // Private Instance Property Functions

  // Private Instance Methods

  protected /* overridable */ abstract generateInitialSuggestions(): Promise<SuggestionObject[]>;

  protected /* overridable */ abstract recognizeStrokes(
    // REVIEW: Why are we passing in width and height? Doesn't the cell know its own size?
    width: LengthInPixels,
    height: LengthInPixels,
  ): Promise<SuggestionObject[]>;

  protected requestSuggestions(suggestionObjects: SuggestionObject[], removeClass?: SuggestionClass): void {
    // Compile a list of change requests that update the suggestions for this cell,
    // then request the notebook make those changes.

    // If a class of suggestions is specified for removal, then add change requests
    // to removed them.
    const changeRequests: NotebookChangeRequest[] = [];
    if (removeClass) {
      // Remove existing typesetting suggestions.
      for (const suggestion of this.obj.suggestions.filter(s=>s.class==removeClass)) {
        const changeRequest: RemoveSuggestion = {
          type: 'removeSuggestion',
          cellId: this.id,
          suggestionId: suggestion.id,
        };
        changeRequests.push(changeRequest);
      }
    }

    // For each suggestion...
    for (const suggestionObject of suggestionObjects) {

      // Add change requests to remove any suggestions with the same ID
      // that were not removed by the class removal above.
      for (const suggestionObject2 of this.obj.suggestions.filter(s=>s.id==suggestionObject.id)) {
        if (!removeClass || suggestionObject2.class != removeClass) {
          const changeRequest: RemoveSuggestion = {
            type: 'removeSuggestion',
            cellId: this.id,
            suggestionId: suggestionObject2.id,
          };
          changeRequests.push(changeRequest);
        }
      }

      // Add a change request for the new suggestion.
      const changeRequest: AddSuggestion = {
        type: 'addSuggestion',
        cellId: this.id,
        suggestionObject,
      };
      changeRequests.push(changeRequest);
    };

    // Request the changes.
    if (changeRequests.length>0) {
      this.notebook.requestChanges("SYSTEM", changeRequests, {});
    }
  }

  // Private Instance Event Handlers

  public /* overridable */ onInserted(): void {
    // Public because it is called by instantiator.
    // Should not be called by anybody else.
    this.generateInitialSuggestions()
    .then(suggestionObjects=>{
      this.requestSuggestions(suggestionObjects, TYPESETTING_SUGGESTION_CLASS);
    }).catch(err=>{
      logError(err, "Error generating initial suggestions.");
    });
  };

  private async onStrokeInactivityTimeout(): Promise<void> {
    // LATER: Display recognition error to user if one occurs.
    //        Currently it will log the error, but fails silently from the user's perspective.
    debug(`Stroke inactivity timeout.`);
    const width = cssLengthInPixels(this.cssSize.width);
    const height = cssLengthInPixels(this.cssSize.height);
    const suggestionObjects = await this.recognizeStrokes(width, height)
    this.requestSuggestions(suggestionObjects, TYPESETTING_SUGGESTION_CLASS);
  }
}

