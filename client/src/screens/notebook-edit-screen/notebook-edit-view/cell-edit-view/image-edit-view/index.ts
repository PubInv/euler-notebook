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
const debug = debug1('client:formula-cell');

import { ImageCellObject } from "../../../../../shared/image-cell";
import { CssClass } from "../../../../../shared/css";
import { notebookUpdateSynopsis } from "../../../../../shared/debug-synopsis";
import { NotebookUpdate } from "../../../../../shared/server-responses";

import { ImageCell } from "../../../../../models/client-cell/image-cell";

import { NotebookEditView } from "../..";

import { CellEditView } from "../index";
import { AcquisitionOptionsPanel } from "./acquisition-options-panel";
import { $new } from "../../../../../dom";
import { CameraPanel } from "./camera-panel";
import { ImagePanel } from "./image-panel";

// Types

// Constants

// Exported Class

export class ImageEditView extends CellEditView<ImageCellObject> {

  // Public Class Methods

  // Public Constructor

  public  constructor(notebookEditView: NotebookEditView, cell: ImageCell) {
    const hasImage = !!cell.obj.imageInfo;

    const imagePanel = new ImagePanel(cell, hasImage);
    const optionsPanel = new AcquisitionOptionsPanel(cell, !hasImage, ()=>this.switchToCamera());
    const cameraPanel = new CameraPanel(cell, false);

    const $content = $new<'div'>({
      tag: 'div',
      classes: [ <CssClass>'content', <CssClass>'imageCell' ],
      styles: {
        width: cell.obj.cssSize.width,
        height: cell.obj.cssSize.height,
      },
      children: [ imagePanel.$elt, optionsPanel.$elt, cameraPanel.$elt ],
    });
    super(notebookEditView, cell, $content, false);

    this.imagePanel = imagePanel;
    this.optionsPanel = optionsPanel;
    this.cameraPanel = cameraPanel;
  }

  // CellView Methods

  public onUpdate(update: NotebookUpdate, ownRequest: boolean): void {
    debug(`onUpdate C${this.id} ${notebookUpdateSynopsis(update)}`);
    super.onUpdate(update, ownRequest);
    this.imagePanel.onUpdate(update, ownRequest);

    switch(update.type) {
      case 'imageChanged': {
        if (update.imageInfo) {
          // image added for first time or changed.
          if (this.optionsPanel.isShown) {
            this.imagePanel.show();
            this.optionsPanel.hide();
          } else if (this.cameraPanel.isShown) {
            this.imagePanel.show();
            this.cameraPanel.hide();
          } else { /* Image panel shown. Nothing to do. */ }
        } else {
          // image removed.
          this.imagePanel.hide();
          this.optionsPanel.show();
        }
        break;
      }
    }
  }

  // -- PRIVATE --

  // Private Instance Properties

  private optionsPanel: AcquisitionOptionsPanel;
  private cameraPanel: CameraPanel;
  private imagePanel: ImagePanel;

  // Private Instance Property Functions

  // private get imageCell(): ImageCell { return <ImageCell>this.cell; }

  // Private Instance Methods

  private switchToCamera(): void {
    this.optionsPanel.hide();
    this.cameraPanel.show();
  }

  // Private Instance Event Handlers
}
