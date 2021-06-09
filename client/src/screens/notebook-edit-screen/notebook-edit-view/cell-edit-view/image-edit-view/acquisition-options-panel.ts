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

import { CssClass } from "../../../../../shared/css";

import { $button, $new } from "../../../../../dom";
import { HtmlElement } from "../../../../../html-element";
import { DataUrl, PlainText } from "../../../../../shared/common";
import { ImageInfo, PositionInfo } from "../../../../../shared/image-cell";
import { ImageCell } from "../../../../../models/client-cell/image-cell";
import { IconSize } from "../../../../../svg-icons";

// Types

type CameraCallback = ()=>void;

// Constants

// Global Variables

// Exported Class

export class AcquisitionOptionsPanel extends HtmlElement<'div'>{

  // Public Class Properties
  // Public Class Property Functions
  // Public Class Methods
  // Public Class Event Handlers

  // Public Constructor

  public constructor(cell: ImageCell, show: boolean, cameraCallback: CameraCallback) {

    const $fileInput = $new({
      tag: 'input',
      type: 'file',
      asyncListeners: { change: e=>this.onFileInputChange(e) },
      hidden: true
    });

    super({
      tag: 'div',
      classes: [ <CssClass>'panel', <CssClass>'optionsPanel' ],
      children: [
        $button({
          title: <PlainText>"Take photo",
          iconId: 'iconMonstrPhotoCamera5',
          iconOptions: { size: IconSize.Large },
          syncHandler: _e=>this.cameraCallback(),
        }),
        $button({
          title: <PlainText>"Upload image",
          iconId: 'iconMonstrUpload5',
          iconOptions: { size: IconSize.Large },
          syncHandler: e=>this.onUploadButtonPressed(e),
        }),
        $button({
          title: <PlainText>"Link to image",
          iconId: 'iconMonstrGlobe3',
          syncHandler: e=>this.onUrlButtonPressed(e),
          iconOptions: { size: IconSize.Large },
        }),
        $fileInput,
      ],
      show,
    });

    this.$fileInput = $fileInput;
    this.cameraCallback = cameraCallback;
    this.cell = cell;
  }

  // Public Instance Properties
  // Public Instance Property Functions
  // Public Instance Methods
  // Public Instance Event Handlers

  // --- PRIVATE ---

  // Private Class Properties

  private $fileInput: HTMLInputElement;

  // Private Class Property Functions
  // Private Class Methods
  // Private Class Event Handlers

  // Private Instance Properties

  private cameraCallback: CameraCallback;
  private cell: ImageCell;

  // Private Instance Property Functions
  // Private Instance Methods

  // Private Instance Event Handlers

  private onUploadButtonPressed(_event: MouseEvent): void {
    this.$fileInput.click();
  }

  private onUrlButtonPressed(_event: MouseEvent): void {
    alert("Adding image via URL not yet implemented.");
  }

  private async onFileInputChange(event: InputEvent): Promise<void> {
    const $input = <HTMLInputElement>event.target!;
    const file = $input.files![0];
    // REVIEW: Would it be more efficent to instantiate the image from the file and then get the data URL from the image?
    const url = await readFileAsDataUrl(file);
    const image = await instantiateImageFromUrl(url);
    const imageInfo: ImageInfo = {
      url,
      size: { width: image.width, height: image.height },
    };
    const cellSize = this.cell.sizeInPixels();
    const scaleX = cellSize.width/imageInfo.size.width;
    const scaleY = scaleX;
    const newCellHeight = Math.round(imageInfo.size.height * scaleY);
    const translateX = 0;
    const translateY = 0;
    const positionInfo: PositionInfo = {
     cropBox: { x: 0, y: 0, ...cellSize },
     transformationMatrix: [ scaleX, 0, 0, scaleY, translateX, translateY ],
    };
    await this.cell.changeImageRequest(imageInfo, positionInfo, newCellHeight);
  }
}

// Helper Functions

function readFileAsDataUrl(file: File): Promise<DataUrl> {
  // encode the file using the FileReader API
  const reader = new FileReader();
  return new Promise((resolve, reject)=>{
    reader.addEventListener('loadend', (_e) => { resolve(<DataUrl>reader.result); });
    reader.addEventListener('error', (_e)=>{ reject(reader.error); })
    reader.readAsDataURL(file);
  });
}

function instantiateImageFromUrl(url: DataUrl): Promise<HTMLImageElement> {
  const image = new Image();
  return new Promise (function (resolve, reject) {
    image.addEventListener('load', _event=>resolve(image));
    // TODO: Is this the way to handle an error instantiating an image?
    image.addEventListener('error', _event=>reject(new Error('Error uploading image.')))
    image.src = url;
  })
}
