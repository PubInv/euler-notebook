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
import { ElementId, escapeHtml, Html, SvgMarkup } from "../../shared/common";
import { CssClass, CssSelector, CssSize } from "../../shared/css";
import { cellBriefSynopsis, cellSynopsis, notebookUpdateSynopsis } from "../../shared/debug-synopsis";
import { NotebookUpdate, SuggestionUpdates } from "../../shared/server-responses";
import { Stroke, StrokeId, convertStrokeToPath, strokePathId } from "../../shared/stylus";

import { $, $newSvg } from "../../dom";

import { ClientNotebook } from "../client-notebook";
import { NotebookChangeRequest } from "../../shared/client-requests";

// Types

export interface CellView {
  onSuggestionsUpdate(update: SuggestionUpdates, ownRequest: boolean): void;
  onUpdate(update: NotebookUpdate, ownRequest: boolean): void;
}

// Constants

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
    });
    $(document, <CssSelector>'#svgContent>defs').append($svgSymbol);
    this.$svgSymbol = $svgSymbol;
    this.refreshDisplay();
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

  public async requestChanges(changeRequests: NotebookChangeRequest[]): Promise<void> {
    await this.notebook.requestChanges(changeRequests);
  }

  public addView(view: CellView): void {
    this.views.add(view);
  }

  public async deleteRequest(): Promise<void> {
    // Called when the 'X' button has been pressed in a cell.
    // Ask the notebook to delete us.
    await this.notebook.deleteCellRequest(this.id);
  }

  public async deleteStrokeRequest(strokeId: StrokeId): Promise<void> {
    await this.notebook.deleteStrokeFromCellRequest(this.id, strokeId);
  }

  public async insertStrokeRequest(stroke: Stroke): Promise<void> {
    await this.notebook.insertStrokeIntoCellRequest(this.id, stroke);
  }

  public async resizeRequest(cssSize: CssSize): Promise<void> {
    // Called when user finishes resizing a cell.
    // Ask the notebook to resize us.
    await this.notebook.resizeCellRequest(this.id, cssSize);
  }

  // Public Event Handlers

  public onSuggestionsUpdate(update: SuggestionUpdates, ownRequest: boolean): void {
    for (const view of this.views) {
      view.onSuggestionsUpdate(update, ownRequest);
    }
  }

  public onUpdate(update: NotebookUpdate, ownRequest: boolean): void {
    debug(`onUpdate C${this.id} ${notebookUpdateSynopsis(update)}`);

    switch(update.type) {
      case 'cellDeleted': {
        this.$svgSymbol.remove();
        break;
      }
      case 'strokeDeleted': {
        const { strokeId } = update;
        const elementId = strokePathId(this.id, strokeId);
        $(this.$svgSymbol, `#${elementId}`).remove();
        break;
      }
      case 'strokeInserted': {
        const { stroke } = update;
        const svgMarkup = convertStrokeToPath(this.id, stroke);
        const $svg = $newSvg<'svg'>({ tag: 'svg', html: svgMarkup });
        while ($svg.childNodes.length > 0) {
          this.$svgSymbol.appendChild($svg.childNodes[0]);
        }
        break;
      }
    }

    for (const view of this.views) {
      view.onUpdate(update, ownRequest);
    }
  };

  // --- PRIVATE ---

  // Private Instance Properties

  protected views: Set<CellView>;
  protected $svgSymbol: SVGSymbolElement;

  // Private Instance Property Functions

  protected abstract render(): SvgMarkup;

  // Private Instance Methods

  protected refreshDisplay(): void {
    const svgMarkup = this.render();
    this.$svgSymbol.innerHTML = svgMarkup;
  }
}

