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

import { svgIconReferenceMarkup } from "../../../../../dom";
import { HtmlElement } from "../../../../../html-element";
import { DataUrl } from "../../../../../shared/common";
import { ImageInfo } from "../../../../../shared/image-cell";

// Types

type Callback = (imageInfo: ImageInfo, resizeCell: boolean)=>Promise<void>;

// Constants

// Global Variables

// Exported Class

export class ImageAcquisitionPanel extends HtmlElement<'div'>{

  // Public Class Properties
  // Public Class Property Functions
  // Public Class Methods
  // Public Class Event Handlers

  // Public Constructor

  public constructor(callback: Callback) {

    super({
      tag: 'div',
      class: <CssClass>'imageAcquisitionPanel',
      children: [
        {
          // camera
          tag: 'button',
          class: <CssClass>'iconButton',
          html: svgIconReferenceMarkup('iconMonstrPhotoCamera5'),
          syncButtonHandler: (_e: MouseEvent)=>{ alert("Image capture TODO:"); },
          title: "Image capture",
        }, {
          tag: 'input',
          type: 'file',
          asyncListeners: {
            change: e=>this.onFileInputChange(e),
          }
        }
      ]
    });

    this.callback = callback;
  }

  // Public Instance Properties
  // Public Instance Property Functions
  // Public Instance Methods
  // Public Instance Event Handlers

  // --- PRIVATE ---

  // Private Class Properties
  // Private Class Property Functions
  // Private Class Methods
  // Private Class Event Handlers

  // Private Instance Properties

  private callback: Callback;

  // Private Instance Property Functions
  // Private Instance Methods

  // Private Instance Event Handlers

  private async onFileInputChange(event: InputEvent): Promise<void> {
    const $input = <HTMLInputElement>event.target!;
    const file = $input.files![0];
    // REVIEW: Would it be more efficent to instantiate the image from the file and then get the data URL from the image?
    const url = await readFileAsDataUrl(file);
    const image = await instantiateImageFromUrl(url);
    const imageInfo: ImageInfo = {
      url,
      size: { width: image.width, height: image.height },
    }
    await this.callback(imageInfo, true);
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
