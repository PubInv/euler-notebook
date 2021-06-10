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
// TODO: Cancel camera button.
// Requirements

import * as debug1 from "debug";
const debug = debug1('client:photo-panel');

import { assert, DataUrl, Html, JPEG_MIME_TYPE, PlainText } from "../../../../../shared/common";
import { CssClass } from "../../../../../shared/css";

import { $new, $button } from "../../../../../dom";
import { HtmlElement } from "../../../../../html-element";

import { ImageInfo, PositionInfo } from "../../../../../shared/image-cell";
import { ImageCell } from "../../../../../models/client-cell/image-cell";
import { showDebugMessage, showError, showWarningMessage } from "../../../../../user-message-dispatch";

// Types

// Constants

// Global Variables

// Exported Class

export class CameraPanel extends HtmlElement<'div'> {

  // Public Class Methods

  // Public Constructor

  public constructor(cell: ImageCell, show: boolean) {
    const $shutterButton = $button({
      title: <PlainText>"Take photo",
      iconId: 'iconMonstrCircle1',
      iconOptions: { stroke: 'black', fill: 'red' },
      cssClass: <CssClass>'shutterButton',
      asyncHandler: e=>this.onShutterButtonClicked(e),
      disabled: true,
    });
    const $video = $new({
      tag: 'video',
      attrs: { autoplay: true, playsinline: true }
    });
    super({
      tag: 'div',
      classes: [ <CssClass>'panel', <CssClass>'cameraPanel' ],
      children: [
        $video,
        $shutterButton,
      ],
      show,
    });
    this.$video = $video;
    this.$shutterButton = $shutterButton;
    this.cell = cell;
  }

  // Public Instance Properties

  // Public Instance Methods

  public setFocus(): void {
    this.$shutterButton.focus();
  }

  // -- PRIVATE --

  // Private Instance Properties

  private $shutterButton: HTMLButtonElement;
  private $video: HTMLVideoElement;

  private cell: ImageCell;

  // private transformationMatrix?: TransformationMatrix;
  // private videoSize?: SizeInPixels;

  // Private Instance Property Functions

  // Private Instance Methods

  private startCamera(): void {
    this.startCamera2()
    .catch(err=>{ showError(err, <Html>err.message/* "Error starting camera" */); });
  }

  private async startCamera2(): Promise<void> {
    if (!this.$video.srcObject) {
      showWarningMessage(<Html>"Starting camera that is already started.");
      return;
    }
    showDebugMessage(<Html>"Starting camera.");
    const cellSize = this.cell.sizeInPixels();
    const constraints: MediaStreamConstraints = {
      audio: false,
      video: {
        // TODO: Handle if "exact" not available.
        facingMode: "environment",
        height: { exact: cellSize.height },
        width: { exact: cellSize.width },
      },
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.$video.srcObject = stream;

    // TODO: Enable button on 'canplay'? event?
    this.$shutterButton.disabled = false;
  }

  private stopCameraIfRunning(): void {
    const stream = <MediaStream>this.$video.srcObject;
    if (!stream) { return }
    debug("Stopping camera.");
    for (const track of stream.getTracks()) {
      track.stop();
    }
    this.$video.srcObject = null;
  }

  // Private Instance Event Handlers

  protected /* override */ onAfterShow(): void {
    debug("After show.");
    // REVIEW: How to handle error opening camera?
    this.startCamera();
  }

  protected /* override */ onBeforeHide(): void {
    debug("Before hide.");
    this.stopCameraIfRunning();
  }

  private async onShutterButtonClicked(_event: MouseEvent): Promise<void> {
    this.$shutterButton.disabled = true;
    const stream = <MediaStream>this.$video.srcObject!;
    assert(stream);
    const track = stream.getVideoTracks()[0];
    const imageCapture = new ImageCapture(track);
    const blob =  await imageCapture.takePhoto();
    const imageBitmap = await createImageBitmap(blob);
    const imageSize = { width: imageBitmap.width, height: imageBitmap.height };
    const cellSize = this.cell.sizeInPixels();
    const aspectRatio = cellSize.width/cellSize.height;

    // console.log(`Image size: ${imageSize.width}x${imageSize.height}`);
    // console.log(`Cell size: ${cellSize.width}x${cellSize.height}`);

    const sWidth = imageSize.width;
    const sHeight = Math.round(sWidth/aspectRatio);
    const sx = 0;
    const sy = Math.round((imageSize.height - sHeight)/2);
    const dx = 0;
    const dy = 0;
    const dWidth = sWidth;
    const dHeight = sHeight;

    const $canvas = $new({ tag: 'canvas' });
    $canvas.width = dWidth;
    $canvas.height = dHeight;
    const context = $canvas.getContext("2d")!;
    assert(context);
    context.drawImage(imageBitmap, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
    // Other image formats: "image/webp", "image/png"
    const url = <DataUrl>$canvas.toDataURL(JPEG_MIME_TYPE)!;

    const scaleX = cellSize.width / dWidth;
    const scaleY = scaleX;

    const imageInfo: ImageInfo = { url, size: { width: dWidth, height: dHeight } };
    const positionInfo: PositionInfo = {
      cropBox: { x: 0, y: 0, ...this.cell.sizeInPixels() },
      transformationMatrix: [ scaleX, 0, 0, scaleY, 0, 0 ],
    }
    this.cell.changeImageRequest(imageInfo, positionInfo);
  }

}
