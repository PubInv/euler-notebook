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
const debug = debug1('client:client-cell');

import { CellId, CellObject, CellType } from "../../shared/cell";
import { assert, ElementId, escapeHtml, Html, JsonObject } from "../../shared/common";
import { CssClass, CssSelector, CssSize } from "../../shared/css";
import { cellBriefSynopsis, cellSynopsis, notebookUpdateSynopsis } from "../../shared/debug-synopsis";
import { CellDeleted, DisplayUpdate, NotebookUpdate, SuggestionId, SuggestionUpdates } from "../../shared/server-responses";
import { Stroke, StrokeId } from "../../shared/stylus";

import { $, $newSvg } from "../../dom";

import { ClientNotebook } from "../client-notebook";

// Types

export interface CellView {
  onSuggestionsUpdate(update: SuggestionUpdates, ownRequest: boolean): void;
  onUpdate(update: NotebookUpdate, ownRequest: boolean): void;
}


const CELL_SYMBOL_CLASS = new Map<CellType,CssClass>([
  [ CellType.Figure, <CssClass>'figureCell' ],
  [ CellType.Formula, <CssClass>'formulaCell' ],
  [ CellType.Plot, <CssClass>'plotCell' ],
  [ CellType.Text, <CssClass>'textCell' ],
]);

// Exported Class

export abstract class ClientCell<O extends CellObject> {

  // Public Constructor

  public constructor(notebook: ClientNotebook, obj: O) {
    this.notebook = notebook;
    this.obj = obj;
    this.views = new Set();

    // TODO: Delete SVG symbol from parent when cell is removed.
    const $svgSymbol = $newSvg({
      tag: 'symbol',
      id: <ElementId>`n${notebook.id}c${obj.id}`,
      class: CELL_SYMBOL_CLASS.get(obj.type),
      html: obj.displaySvg,
    });
    $(document, <CssSelector>'#svgContent>defs').append($svgSymbol);
    this.$svgSymbol = $svgSymbol;
  }

  // Public Instance Properties

  public obj: O;  // REVIEW: Maybe should be private?
  public notebook: ClientNotebook;

  // Public Instance Property Functions

  public get id(): CellId { return this.obj.id; }
  public get type(): CellType { return this.obj.type; }

  public toDebugHtml(): Html {
    return <Html>`<div>
<span class="collapsed">${escapeHtml(cellBriefSynopsis(this.obj))}</span>
<div class="nested" style="display:none">
  <tt>${escapeHtml(cellSynopsis(this.obj))}</tt>
</div>
</div>`;
  }

  // Public Instance Methods

  public async acceptSuggestion(suggestionId: SuggestionId, suggestionData: JsonObject): Promise<void> {
    await this.notebook.acceptSuggestionRequest(this.id, suggestionId, suggestionData);
  }

  public addView(view: CellView): void {
    this.views.add(view);
  }

  public onSuggestionsUpdate(update: SuggestionUpdates, ownRequest: boolean): void {
    for (const view of this.views) {
      view.onSuggestionsUpdate(update, ownRequest);
    }
  }

  public onUpdate(update: NotebookUpdate, ownRequest: boolean): void {
    debug(`onUpdate C${this.id} ${notebookUpdateSynopsis(update)}`);

    switch(update.type) {
      case 'cellResized': {
        this.obj.cssSize.width = update.cssSize.width;
        this.obj.cssSize.height = update.cssSize.height;
        break;
      }
      case 'strokeDeleted': {
        const strokes = this.obj.strokeData.strokes;
        const strokeIndex = strokes.findIndex(stroke=>stroke.id==update.strokeId);
        assert(strokeIndex>=0);
        strokes.splice(strokeIndex, 1);
        this.updateDisplay(update.displayUpdate);
        break;
      }
      case 'strokeInserted': {
        this.obj.strokeData.strokes.push(update.stroke);
        this.updateDisplay(update.displayUpdate);
        break;
      }
    }

    for (const view of this.views) {
      view.onUpdate(update, ownRequest);
    }
  };

  public async deleteRequest(): Promise<void> {
    // Called when the 'X' button has been pressed in a cell.
    // Ask the notebook to delete us.
    await this.notebook.deleteCellRequest(this.id);
  }

  public async deleteStroke(strokeId: StrokeId): Promise<void> {
    await this.notebook.deleteStrokeFromCellRequest(this.id, strokeId);
  }

  public async insertStroke(stroke: Stroke): Promise<void> {
    await this.notebook.insertStrokeIntoCellRequest(this.id, stroke);
  }

  public async resize(cssSize: CssSize): Promise<void> {
    // Called when user finishes resizing a cell.
    // Ask the notebook to resize us.
    await this.notebook.resizeCellRequest(this.id, cssSize);
  }

  // Public Event Handlers

  public onCellDeleted(_update: CellDeleted): void {
    this.$svgSymbol.remove();
  }

  // --- PRIVATE ---

  // Private Instance Properties

  protected views: Set<CellView>;
  protected $svgSymbol: SVGSymbolElement;

  // Private Instance Methods

  protected updateDisplay(displayUpdate: DisplayUpdate): void {
    if (displayUpdate.delete) {
      for (const elementId of displayUpdate.delete) {
        $(this.$svgSymbol, `#${elementId}`).remove();
      }
    }

    if (displayUpdate.append) {
      for (const markup of displayUpdate.append) {
        // Create an SVG element with the markup inside of it.
        const $svg = $newSvg<'svg'>({ tag: 'svg', html: markup });
        // Move all the nodes from the new SVG element our symbol definition.
        while ($svg.childNodes.length > 0) {
          this.$svgSymbol.appendChild($svg.childNodes[0]);
        }
      }
    }
  }
}

