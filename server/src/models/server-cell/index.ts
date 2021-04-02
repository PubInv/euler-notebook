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

// import * as debug1 from "debug";
// const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
// const debug = debug1(`server:${MODULE}`);

import { assert, deepCopy, escapeHtml, Html, Milliseconds, SvgMarkup } from "../../shared/common";
import { CssLength, CssSize, cssSizeInPixels, LengthInPixels, pixelsFromCssLength } from "../../shared/css";
import { CellId, CellObject, CellSource, CellType } from "../../shared/cell";
import { convertStrokeToPath, strokePathId } from "../../shared/stylus";

import { ServerNotebook } from "../server-notebook";
import { CellResized, DisplayUpdate, NotebookSuggestionsUpdated, NotebookUpdated, StrokeDeleted, StrokeInserted, SuggestionClass, SuggestionId, SuggestionObject, SuggestionUpdates } from "../../shared/server-responses";
import { cellSynopsis } from "../../shared/debug-synopsis";
import { SuggestionData } from "../suggestion";
import { AcceptSuggestion, DeleteStroke, InsertStroke, NotebookChangeRequest, ResizeCell } from "../../shared/client-requests";
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

  public get heightInPx(): LengthInPixels {
    return pixelsFromCssLength(this.obj.cssSize.height);
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

  public get widthInPx(): LengthInPixels {
    return pixelsFromCssLength(this.obj.cssSize.width);
  }

  // Public Instance Methods

  // Public Instance Event Handlers

  public /* overridable */ onChangeRequest(
    source: CellSource,
    changeRequest: NotebookChangeRequest,
    /* out */ response: NotebookUpdated,
  ): void {
    switch(changeRequest.type) {
      case 'acceptSuggestion': this.onAcceptSuggestionRequest(source, changeRequest, response); break;
      case 'deleteStroke':     this.onDeleteStrokeRequest(source, changeRequest, response); break;
      case 'insertStroke':     this.onInsertStrokeRequest(source, changeRequest, response); break;
      case 'resizeCell':       this.onResizeCellRequest(source, changeRequest, response); break;
    }
  }

  // --- PRIVATE ---

  // Private Class Methods

  protected static initialCellSize(notebook: ServerNotebook, cssHeight: CssLength): CssSize {
    const pageWidth = pixelsFromCssLength(notebook.obj.pageSize.width);
    const leftMargin = pixelsFromCssLength(notebook.obj.margins.left);
    const rightMargin = pixelsFromCssLength(notebook.obj.margins.right);
    const width = pageWidth - leftMargin - rightMargin;
    const height = pixelsFromCssLength(cssHeight);
    return cssSizeInPixels(width, height, 'px');
  }

  protected updateSuggestions(
    add: SuggestionObject[],
    removeIds: SuggestionId[],
    removeClasses: SuggestionClass[],
  ): void {

    // TODO: update persistent suggestions

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
  }

  // Private Instance Properties

  protected notebook: ServerNotebook;
  protected strokeInactivityTimeout: InactivityTimeout;

  // Private Instance Property Functions

  // Private Instance Methods

  protected /* overridable */ redrawDisplaySvg(embeddedMarkup?: SvgMarkup): void {
    // REVIEW: Cache the displaySvg until the content changes?
    embeddedMarkup = embeddedMarkup || <SvgMarkup>'';
    const strokesMarkup = this.obj.strokeData.strokes.map(stroke=>convertStrokeToPath(this.id, stroke)).join('\n');
    this.obj.displaySvg = <SvgMarkup>(embeddedMarkup + strokesMarkup);
  }

  // Private Instance Event Handlers

  protected /* overridable */ onAcceptSuggestionRequest(
    _source: CellSource,
    request: AcceptSuggestion,
    /* out */ _response: NotebookUpdated,
    handled?: boolean,
  ): void {
    const suggestionData = <SuggestionData>request.suggestionData;

    // LATER: Handle suggestions common to all cell types.
    // switch(_suggestionData.type) {
    //   case '':  {
    //     ...
    //     handled = true;
    // }

    if (!handled) {
      // REVIEW: Use proper logging system.
      console.warn(`'${suggestionData.type}' AcceptSuggestionRequest not handled.`)
    }

  }

  protected /* overridable */ onDeleteStrokeRequest(
    _source: CellSource,
    request: DeleteStroke,
    /* out */ response: NotebookUpdated,
  ): void {
    const { strokeId } = request;

    const strokes = this.obj.strokeData.strokes;
    const strokeIndex = strokes.findIndex(stroke=>stroke.id===strokeId);
    assert(strokeIndex>=0, `Cannot find stroke c${this.id}s${strokeId}`);
    const removedStroke = strokes.splice(strokeIndex, 1)[0];
    // TODO: It is expensive to recompute the entire displaySvg
    //       after every stroke change. How can we do it incrementally?
    this.redrawDisplaySvg();

    // Construct the response
    const pathId = strokePathId(this.id, strokeId);
    const update: StrokeDeleted = {
      type: 'strokeDeleted',
      cellId: this.id,
      displayUpdate: { delete: [ pathId ]},
      strokeId,
    };
    response.updates.push(update);

    const undoChangeRequest: InsertStroke = {
      type: 'insertStroke',
      cellId: this.id,
      stroke: removedStroke,
    }
    response.undoChangeRequests.unshift(undoChangeRequest);

    // Strokes have changed, so wait for a few seconds of inactivity
    // before attempting to recognize the modified strokes.
    this.strokeInactivityTimeout.startOrPostpone();
  }

  protected /* overridable */ onInsertStrokeRequest(
    _source: CellSource,
    request: InsertStroke,
    /* out */ response: NotebookUpdated,
  ): void {
    const { stroke } = request;

    // Add the stroke to the list of strokes
    const strokeData = this.obj.strokeData;
    stroke.id = strokeData.nextId++;
    strokeData.strokes.push(stroke);
    // TODO: It is expensive to recompute the entire displaySvg
    //       after every stroke change. How can we do it incrementally?
    this.redrawDisplaySvg();
    // Construct display update
    const newPath = convertStrokeToPath(this.id, stroke);
    const displayUpdate: DisplayUpdate = { append: [ newPath ] };

    // Construct the response
    const update: StrokeInserted = {
      type: 'strokeInserted',
      cellId: this.id,
      displayUpdate,
      stroke: request.stroke,
    };
    response.updates.push(update);

    const undoChangeRequest: DeleteStroke = { type: 'deleteStroke', cellId: this.id, strokeId: stroke.id };
    response.undoChangeRequests.unshift(undoChangeRequest);

    // Strokes have changed, so wait for a few seconds of inactivity
    // before attempting to recognize the modified strokes.
    this.strokeInactivityTimeout.startOrPostpone();
  }

  protected /* overridable */ onResizeCellRequest(
    _source: CellSource,
    request: ResizeCell,
    /* out */ response: NotebookUpdated,
  ): void {
    const { cssSize: newCssSize } = request;
    assert(newCssSize.height.endsWith('px'));
    assert(newCssSize.width.endsWith('px'));
    const oldCssSize = deepCopy(this.cssSize);

    this.obj.cssSize.height = newCssSize.height;
    this.obj.cssSize.width = newCssSize.width;

    const update: CellResized = { type: 'cellResized', cellId: this.id, cssSize: newCssSize };
    response.updates.push(update);

    const undoChangeRequest: ResizeCell = { type: 'resizeCell', cellId: this.id, cssSize: oldCssSize };
    response.undoChangeRequests.unshift(undoChangeRequest);
  }

  // Inherited classes will trigger recognizing their strokes appropriate for their cell type.
  protected abstract onStrokeInactivityTimeout(): Promise<void>;
}

