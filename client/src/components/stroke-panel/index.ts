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
const debug = debug1('client:stroke-panel');

import { CssClass, assertFalse } from "../../shared/common";
import { Stroke, StrokeId } from "../../shared/stylus";


import { HtmlElement } from "../../html-element";
import { NotebookUpdate } from "../../shared/server-responses";
import { notebookUpdateSynopsis } from "../../shared/debug-synopsis";
import { CellObject } from "../../shared/cell";

import { StrokeDrawingPanel } from "./stroke-drawing-panel";
import { StrokeSelectionPanel } from "./stroke-selection-panel";

// TODO: Rename stylus panel.

// Types

export type StrokeCallbackFn = (stroke: Stroke)=>Promise<void>;

export interface StrokePanelCallbacks {
  drawStroke: (stroke: Stroke)=>Promise<void>;
  eraseStroke: (strokeId: StrokeId)=>Promise<void>;
}

export enum StylusMode {
  Draw,
  Erase,
}

// Constants

// Exported Class

export class StrokePanel extends HtmlElement<'div'> {

  // Public Class Methods

  // Public Constructor

  public constructor(
    cellObject: CellObject,
    callbacks: StrokePanelCallbacks,
    stylusMode: StylusMode,
  ) {
    const { strokeData } = cellObject;
    const strokeDrawingPanel = new StrokeDrawingPanel((stroke)=>callbacks.drawStroke(stroke.data));
    const strokeSelectionPanel = new StrokeSelectionPanel(strokeData, (strokeId)=>callbacks.eraseStroke(strokeId));
    super({
      tag: 'div',
      classes: [ <CssClass>'strokePanel'],
      children: [
        strokeDrawingPanel.$elt,
        strokeSelectionPanel.$elt,
      ]
    });

    this.strokeDrawingPanel = strokeDrawingPanel;
    this.strokeSelectionPanel = strokeSelectionPanel;
    // REVIEW: Is stylusInput updated in-place?

    this.stylusMode = stylusMode;
  }

  // Public Instance Properties

  // Public Instance Property Functions

  public set stylusMode(value: StylusMode) {
    switch(value) {
      case StylusMode.Draw:
        this.strokeDrawingPanel.show();
        this.strokeSelectionPanel.hide();
        break;
      case StylusMode.Erase:
        this.strokeDrawingPanel.hide();
        this.strokeSelectionPanel.show();
        break;
      default: assertFalse();
    }
  }

  // Public Instance Methods

  // Public Instance Event Handlers

  public onUpdate(update: NotebookUpdate, ownRequest: boolean): void {
    debug(`onUpdate ${notebookUpdateSynopsis(update)}`);
    this.strokeSelectionPanel.onUpdate(update, ownRequest);
    this.strokeDrawingPanel.onUpdate(update, ownRequest);
  };

  // -- PRIVATE --

  // Private Instance Properties

  private strokeDrawingPanel: StrokeDrawingPanel;
  private strokeSelectionPanel: StrokeSelectionPanel;

  // Private Instance Property Functions

  // Private Event Handlers

}

// HELPER FUNCTIONS
