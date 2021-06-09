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

import { assert, DataUrl, JPEG_MIME_TYPE, PlainText } from "../../../../../shared/common";
import { CssClass } from "../../../../../shared/css";

import { $new, $button } from "../../../../../dom";
import { HtmlElement } from "../../../../../html-element";

import { ImageInfo, PositionInfo } from "../../../../../shared/image-cell";
import { ImageCell } from "../../../../../models/client-cell/image-cell";

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
  private imageCapture?: ImageCapture;

  // private transformationMatrix?: TransformationMatrix;
  // private videoSize?: SizeInPixels;

  // Private Instance Property Functions

  private stream(): MediaStream|null { return <MediaStream>this.$video.srcObject; }

  // Private Instance Methods

  private startCamera(): void {
    this.startCamera2()
    .catch(_err=>{
      // TODO: display error to user.
      console.error("ERROR: Error starting camera.");
    });
  }

  private async startCamera2(): Promise<void> {
    let stream = this.stream();
    if (stream) {
      debug("Starting camera... but camera is already running.");
      // TODO: Throw error? Log?
      console.warn("WARNING: Starting camera that is not stopped.");
      return;
    }
    debug("Starting camera.");
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
    stream = await navigator.mediaDevices.getUserMedia(constraints);

    // // Get the dimensions of the video from the stream.
    // const videoTracks = stream.getVideoTracks();
    // assert(videoTracks.length == 1);
    // const videoTrack = videoTracks[0];
    // const capabilities = videoTrack.getCapabilities();
    // // const constraints = videoTrack.getConstraints();
    // // const settings = videoTrack.getSettings();
    // assert(capabilities.width && capabilities.width.max);
    // assert(capabilities.height && capabilities.height.max);
    // /* const videoSize = */ this.videoSize = {
    //   width: capabilities.width!.max!,
    //   height: capabilities.height!.max!,
    // };
    // console.log("STREAM CAPABILITIES:");
    // console.dir(capabilities);

    // // TODO: Recompute if cell size changes!
    // const scaleFactor = cellSize.width/videoSize.width;
    // const scaledVideoHeight = videoSize.height * scaleFactor;
    // const translateY = Math.round((cellSize.height - scaledVideoHeight)/2);
    // this.transformationMatrix = [ scaleFactor, 0, 0, scaleFactor, 0, translateY ];

    // this.$video.style.width = `${videoSize.width}px`;
    // this.$video.style.height = `${videoSize.height}px`;
    // this.$video.style.transform = transformationMatrixValue(this.transformationMatrix);

    // this.$video.addEventListener('loadedmetadata', e=>{
    //   console.dir(e);
    //   console.log(`${this.$video.videoWidth}x${this.$video.videoHeight}`);
    //   console.log(`${this.$video.width}x${this.$video.height}`);
    // });
    this.$video.srcObject = stream;

    const track = stream.getVideoTracks()[0];
    this.imageCapture = new ImageCapture(track);

    this.$shutterButton.disabled = false;
  }

  private stopCameraIfRunning(): void {
    const stream = this.stream();
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

    // Convert the current video frame to an image via a canvas element.
    assert(this.imageCapture);
    const blob =  await this.imageCapture!.takePhoto();
    const imageBitmap = await createImageBitmap(blob);
    const imageSize = { width: imageBitmap.width, height: imageBitmap.height };
    const cellSize = this.cell.sizeInPixels();
    const aspectRatio = cellSize.width/cellSize.height;

    // console.log(`Image size: ${imageSize.width}x${imageSize.height}`);
    // console.log(`Cell size: ${cellSize.width}x${cellSize.height}`);

    //const url = URL.createObjectURL(blob);
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
