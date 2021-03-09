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

import { assert, CssLength, CssSize, cssSizeInPixels, escapeHtml, Html, pixelsFromCssLength, SvgMarkup } from "../../shared/common";
import { CellId, CellObject, CellType } from "../../shared/cell";
import { convertStrokeToPath, Stroke, StrokeId } from "../../shared/stylus";

import { ServerNotebook } from "../server-notebook";
import { DisplayUpdate } from "../../shared/server-responses";
import { cellSynopsis } from "../../shared/debug-synopsis";

// Types

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
  }

  // Public Instance Properties

  public obj: O;

  // Public Instance Property Functions

  public get id(): CellId { return this.obj.id; }
  public get type(): CellType { return this.obj.type; }

  public get cssSize(): CssSize { return this.obj.cssSize; }

  public setCssSize(value: CssSize): void {
    this.obj.cssSize.height = value.height;
    this.obj.cssSize.width = value.width;
  }

  public persistentObject(): O {
    return this.obj;
  }

  public toHtml(): Html {
    return <Html>`<div>
<span class="collapsed">S${this.id} ${this.type} ${this.obj.source}</span>
<div class="nested" style="display:none">
  <tt>${escapeHtml(cellSynopsis(this.obj))}</tt>
</div>
</div>`;
  }

  // Public Instance Methods

  public deleteStroke(strokeId: StrokeId): Stroke {
    const strokes = this.obj.strokeData.strokes;
    const strokeIndex = strokes.findIndex(stroke=>stroke.id===strokeId);
    assert(strokeIndex>=0, `Cannot find stroke c${this.id}s${strokeId}`);
    return strokes.splice(strokeIndex, 1)[0];
  }

  public insertStroke(stroke: Stroke): DisplayUpdate {
    // Add the stroke to the list of strokes
    const strokeData = this.obj.strokeData;
    stroke.id = strokeData.nextId++;
    strokeData.strokes.push(stroke);

    // Construct display update
    const newPath = convertStrokeToPath(this.id, stroke);
    const displayUpdate: DisplayUpdate = { append: [ newPath ] };
    return displayUpdate;
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

  // Private Instance Properties

  protected notebook: ServerNotebook;

  // Private Instance Property Functions

  // Private Instance Methods

  /* overridable */ protected updateDisplaySvg(embeddedMarkup?: SvgMarkup): void {
    // REVIEW: Cache the displaySvg until the content changes?
    embeddedMarkup = embeddedMarkup || <SvgMarkup>'';
    const strokesMarkup = this.obj.strokeData.strokes.map(stroke=>convertStrokeToPath(this.id, stroke)).join('\n');
    this.obj.displaySvg = <SvgMarkup>(embeddedMarkup + strokesMarkup);
  }


}

