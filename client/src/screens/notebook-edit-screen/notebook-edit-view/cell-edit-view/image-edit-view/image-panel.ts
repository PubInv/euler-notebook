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

// TODO: Handle case where user disallows camera.

// Requirements


import { CssClass } from "../../../../../shared/css";

import { $, $new, $newSvg } from "../../../../../dom";
import { HtmlElement } from "../../../../../html-element";

import { ImageInfo, PositionInfo, transformationMatrixValue } from "../../../../../shared/image-cell";
import { ImageCell } from "../../../../../models/client-cell/image-cell";
import { convertStrokeToPath, renderStrokesToSvg, strokePathId } from "../../../../../shared/stylus";
import { NotebookUpdate } from "../../../../../shared/server-responses";

// Types

// Constants

// Global Variables

// Exported Class

export class ImagePanel extends HtmlElement<'div'> {

  // Public Class Methods

  // Public Constructor

  public constructor(cell: ImageCell, show: boolean) {

    const $imageElt = $new<'img'>({ tag: 'img' });
    const $cropBox = $new<'div'>({ tag: 'div', class: <CssClass>'cropBox', children: [ $imageElt ] });
    const $displaySvg = $newSvg<'svg'>({
      tag: 'svg',
      class: <CssClass>'displaySvg',
      attrs: { height: "100%", width: "100%" },
      html: renderStrokesToSvg(cell.obj.strokeData, cell.id),
    });

    super({
      tag: 'div',
      classes: [ <CssClass>'panel', <CssClass>'imagePanel' ],
      children: [ $cropBox, $displaySvg ],
      show,
    });

    this.$imageElt = $imageElt;
    this.$cropBox = $cropBox;
    this.$displaySvg = $displaySvg;

    this.cell = cell;

    const { imageInfo, positionInfo } = cell.obj;
    this.updateImage(imageInfo);
    this.updatePosition(positionInfo);
  }

  // Public Instance Properties

  // Public Instance Methods

  // public setFocus(): void {
  //   this.$rejectButton.focus();
  // }

  // Public Instance Event Handlers

  public onUpdate(update: NotebookUpdate, _ownRequest: boolean): void {
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
        const elementId = strokePathId(this.cell.id, strokeId);
        $(this.$displaySvg!, `#${elementId}`).remove();
        break;
      }
      case 'strokeInserted': {
        const { stroke } = update;
        const svgMarkup = convertStrokeToPath(this.cell.id, stroke);
        const $svg = $newSvg<'svg'>({ tag: 'svg', html: svgMarkup });
        while ($svg.childNodes.length > 0) {
          this.$displaySvg!.appendChild($svg.childNodes[0]);
        }
        break;
      }
    }
  }

  // -- PRIVATE --

  // Private Instance Properties

  private cell: ImageCell;

  private $cropBox: HTMLDivElement;
  private $imageElt: HTMLImageElement;
  private $displaySvg: SVGSVGElement;

  // Private Instance Property Functions

  // Private Instance Methods

  private updateImage(imageInfo?: ImageInfo): void {
    if (imageInfo) {
      // Adding image to empty image cell, or replacing image in nonempty image cell.
      this.$imageElt.src = imageInfo.url;
    } else {
      // Removing image from cell. (e.g. undo of add image operation)
      this.$imageElt.removeAttribute('src');
    }
  }

  private updatePosition(positionInfo?: PositionInfo): void {
    if (!positionInfo) { return; }
    this.$cropBox!.style.width = `${positionInfo.cropBox.width}px`;
    this.$cropBox!.style.height = `${positionInfo.cropBox.height}px`;
    this.$imageElt!.style.transform = transformationMatrixValue(positionInfo.transformationMatrix);
  }

  // Private Instance Event Handlers

  // private async onAcceptButtonClicked(_event: MouseEvent): Promise<void> {
  //   this.callback(this.imageInfo);
  // }

  // private onRejectButtonClicked(_event: MouseEvent): void {
  //   this.callback(undefined);
  // }
}
