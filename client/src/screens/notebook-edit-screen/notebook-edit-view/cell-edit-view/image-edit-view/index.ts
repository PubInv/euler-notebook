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

import { ImageCellObject, ImageInfo, PositionInfo as ImagePositionInfo, transformationMatrixValue } from "../../../../../shared/image-cell";
import { CssClass } from "../../../../../shared/css";
import { notebookUpdateSynopsis } from "../../../../../shared/debug-synopsis";
import { NotebookUpdate } from "../../../../../shared/server-responses";

import { ImageCell } from "../../../../../models/client-cell/image-cell";

import { NotebookEditView } from "../..";

import { CellEditView } from "../index";
import { ImageAcquisitionPanel } from "./image-acquisition-panel";
import { $, $new, $newSvg } from "../../../../../dom";
import { convertStrokeToPath, renderStrokesToSvg, strokePathId } from "../../../../../shared/stylus";
import { assert } from "../../../../../shared/common";

// Types

// Constants

// Exported Class

export class ImageEditView extends CellEditView<ImageCellObject> {

  // Public Class Methods

  // Public Constructor

  public  constructor(notebookEditView: NotebookEditView, cell: ImageCell) {

    const $content = $new<'div'>({
      tag: 'div',
      classes: [ <CssClass>'content', <CssClass>'imageCell' ],
      styles: {
        width: cell.obj.cssSize.width,
        height: cell.obj.cssSize.height,
      },
    });

    super(notebookEditView, cell, $content);

    console.dir(cell.obj);
    const { imageInfo, positionInfo } = cell.obj;
    this.updateImage(imageInfo);
    this.updatePosition(positionInfo);
  }

  // CellView Methods

  public onUpdate(update: NotebookUpdate, ownRequest: boolean): void {
    debug(`onUpdate C${this.id} ${notebookUpdateSynopsis(update)}`);
    super.onUpdate(update, ownRequest);
    switch (update.type) {
      case 'imageChanged': {
        const { imageInfo, positionInfo } = update;
        this.updateImage(imageInfo);
        this.updatePosition(positionInfo);
        break;
      }
      case 'imagePositionChanged': {
        const { positionInfo } = update;
        this.updatePosition(positionInfo);
        break;
      }
      case 'strokeDeleted': {
        const { strokeId } = update;
        const elementId = strokePathId(this.id, strokeId);
        $(this.$strokeSvg!, `#${elementId}`).remove();
        break;
      }
      case 'strokeInserted': {
        const { stroke } = update;
        const svgMarkup = convertStrokeToPath(this.id, stroke);
        const $svg = $newSvg<'svg'>({ tag: 'svg', html: svgMarkup });
        while ($svg.childNodes.length > 0) {
          this.$strokeSvg!.appendChild($svg.childNodes[0]);
        }
        break;
      }
    }
  }

  // -- PRIVATE --

  // Private Instance Properties

  private $cropBox?: HTMLDivElement;
  private $imageElt?: HTMLImageElement;
  private $strokeSvg?: SVGSVGElement;
  private acquisitionPanel?: ImageAcquisitionPanel;

  // Private Instance Property Functions

  private get imageCell(): ImageCell { return <ImageCell>this.cell; }

  // Private Instance Methods

  private updateImage(imageInfo?: ImageInfo): void {
    if (imageInfo) {
      // Adding image to empty image cell, or replacing image in nonempty image cell.
      if (this.$imageElt) {
        this.$imageElt.src = imageInfo.url;
      } else {
        this.$imageElt = $new<'img'>({ tag: 'img', src: imageInfo.url, styles: { 'transform-origin': 'top left' } });
        this.$cropBox = $new<'div'>({ tag: 'div', class: <CssClass>'cropBox', children: [ this.$imageElt ] });
        this.$strokeSvg = $newSvg<'svg'>({
          tag: 'svg',
          class: <CssClass>'displaySvg',
          attrs: { height: "100%", width: "100%" },
          html: renderStrokesToSvg(this.cell.obj.strokeData, this.cell.id),
        });

        if (this.acquisitionPanel) {
          this.acquisitionPanel.remove();
          delete this.acquisitionPanel;
        }
        this.$content.append(this.$cropBox, this.$strokeSvg);
      }
    } else {
      // Removing image from cell. (e.g. undo of add image operation)
      if (this.$cropBox && this.$strokeSvg) {
        this.$cropBox!.remove();
        this.$strokeSvg!.remove();
      }

      assert(!this.acquisitionPanel);
      this.acquisitionPanel = new ImageAcquisitionPanel(async (imageInfo, resizeCell)=>{
        await this.imageCell.acquireImage(imageInfo, resizeCell)
      });
      this.$content.append(this.acquisitionPanel.$elt);
    }
  }

  private updatePosition(positionInfo?: ImagePositionInfo): void {
    if (!positionInfo) { return; }
    this.$cropBox!.style.width = `${positionInfo.cropBox.width}px`;
    this.$cropBox!.style.height = `${positionInfo.cropBox.height}px`;
    this.$imageElt!.style.transform = transformationMatrixValue(positionInfo.transformationMatrix);
  }

  // Private Instance Event Handlers

}
