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
import { showWarningMessage } from "../../../../../user-message-dispatch";
import { ExpectedError } from "../../../../../shared/expected-error";
import { errorMessageForUser } from "../../../../../error-messages";

// Types

type MediaDeviceId = '{MediaDeviceId}';
type UsedCameras = MediaDeviceId[];

// Constants

const MAX_USED_CAMERAS = 4;
const USED_CAMERAS_KEY = 'usedCameras';

// Global Variables

// Exported Class

export class CameraPanel extends HtmlElement<'div'> {

  // Public Class Methods

  // Public Constructor

  public constructor(cell: ImageCell, show: boolean) {

    const $errorMessage = $new({
      tag: 'div',
      class: <CssClass>'errorMessage',
      hidden: true,
    });

    const $cameraSelector = $new({
      tag: 'select',
      class: <CssClass>'cameraSelector',
      listeners: {
        change: (e)=>this.onCameraSelectChange(e),
      },
      hidden: true, // Displayed if there is more than one camera.
    });

    const $shutterButton = $button({
      title: <PlainText>"Take photo",
      iconId: 'iconMonstrCircle1',
      iconOptions: { stroke: 'black', fill: 'red' },
      class: <CssClass>'shutterButton',
      syncHandler: e=>this.onShutterButtonClicked(e),
      disabled: true, // Enabled on video 'canplay' event.
    });

    const $video = $new({
      tag: 'video',
      attrs: { autoplay: true, playsinline: true },
      listeners: {
        canplay: e=>this.onVideoCanPlay(e),
      },
    });

    super({
      tag: 'div',
      classes: [ <CssClass>'panel', <CssClass>'cameraPanel' ],
      children: [
        $video,
        $errorMessage,
        $cameraSelector,
        $shutterButton,
      ],
      show,
    });

    this.$cameraSelector = $cameraSelector;
    this.$errorMessage = $errorMessage;
    this.$shutterButton = $shutterButton;
    this.$video = $video;

    this.cell = cell;
  }

  // Public Instance Properties

  // Public Instance Methods

  public setFocus(): void {
    this.$shutterButton.focus();
  }

  // -- PRIVATE --

  // Private Instance Properties

  private $cameraSelector: HTMLSelectElement;
  private $errorMessage: HTMLDivElement;
  private $shutterButton: HTMLButtonElement;
  private $video: HTMLVideoElement;

  private cell: ImageCell;

  // private transformationMatrix?: TransformationMatrix;
  // private videoSize?: SizeInPixels;

  // Private Instance Property Functions

  private getUsedCameras(): UsedCameras {
    const json = window.localStorage.getItem(USED_CAMERAS_KEY);
    if (!json) { return []; }
    const rval = <UsedCameras>JSON.parse(json);
    assert(rval instanceof Array);
    assert(rval.every(id=>typeof id == 'string'));
    return rval;
  }

  private markCameraAsUsed(cameraId: MediaDeviceId): void {
    const usedCameras = this.getUsedCameras();
    const index = usedCameras.indexOf(cameraId);
    if (index>=0) { usedCameras.splice(index, 1); }
    usedCameras.unshift(cameraId);
    if (usedCameras.length > MAX_USED_CAMERAS) {
      usedCameras.slice(0, MAX_USED_CAMERAS);
    }
    const json = JSON.stringify(usedCameras);
    window.localStorage.setItem(USED_CAMERAS_KEY, json);
  }

  // Private Instance Methods

  private selectCamera(cameras: MediaDeviceInfo[]): MediaDeviceId {

    // Look through the list of cameras that were used, most recent first.
    // If the camera is in the list of available cameras, then select it.
    const usedCameraIds = this.getUsedCameras();
    for (const usedCameraId of usedCameraIds) {
      const camera = cameras.find(c=>c.deviceId==usedCameraId);
      if (camera) { return usedCameraId; }
    }

    // No used camera found. Use the first camera on the list.
    // LATER: Look for a camera with facingMode: "environment"?
    return <MediaDeviceId>cameras[0].deviceId;
  }

  private async populateCameraList(): Promise<MediaDeviceId> {

    // Get the list of media devices
    const mediaDevices = await navigator.mediaDevices.enumerateDevices();
    const cameras = mediaDevices.filter(m=>m.kind == 'videoinput');

    const numCameras = cameras.length;
    if (numCameras == 0) {
      this.$cameraSelector.style.display = 'none';
      throw new ExpectedError('noCamerasFound');
    } else if (numCameras == 1) {
      this.$cameraSelector.style.display = 'none';
      return <MediaDeviceId>cameras[0].deviceId;
    } else {
      // Multiple cameras available.
      const selectedCameraId = this.selectCamera(cameras);
      const optionElements = cameras.map((c,i)=>$new({
        tag: 'option',
        value: c.deviceId,
        selected: (c.deviceId == selectedCameraId),
        html: <Html>(c.label || `Camera ${i+1}`),
      }));
      this.$cameraSelector.append(...optionElements);
      this.$cameraSelector.style.display = '';
      return selectedCameraId;
    }
  }

  private showError(err: Error): void {
    const html = errorMessageForUser(err);
    this.$errorMessage.innerHTML = html;
    this.$errorMessage.style.display = '';
  }

  private async startCamera(deviceId: MediaDeviceId): Promise<void> {
    const existingStream = this.$video.srcObject;
    if (existingStream) {
      // TODO: Should just be a logged warning.
      showWarningMessage(<Html>"Starting camera that is already started.");
      return;
    }
    debug("Starting camera.");
    const cellSize = this.cell.sizeInPixels();
    const constraints: MediaStreamConstraints = {
      audio: false,
      video: {
        // TODO: Handle if "exact" not available.
        deviceId,
        height: { exact: cellSize.height },
        width: { exact: cellSize.width },
      },
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.$video.srcObject = stream;
    // NOTE: $shutterButton will be enabled on the 'canplay' event.
  }

  private stopCameraIfRunning(): void {
    this.$shutterButton.disabled = true;
    const stream = <MediaStream>this.$video.srcObject;
    if (!stream) { return; }
    debug("Stopping camera.");
    for (const track of stream.getTracks()) {
      track.stop();
    }
    this.$video.srcObject = null;
  }

  // Private Instance Event Handlers

  protected /* override */ onAfterShow(): void {
    debug("After show.");
    this.onAfterShowAsync()
    .catch(err=>{ this.showError(err); });
  }

  private async onAfterShowAsync(): Promise<void> {
    const cameraId = await this.populateCameraList();
    await this.startCamera(cameraId);
  }

  protected /* override */ onBeforeHide(): void {
    debug("Before hide.");
    this.stopCameraIfRunning();
  }

  private onCameraSelectChange(event: Event): void {
    this.onCameraSelectChangeAsync(event)
    .catch(err=>this.showError(err));
  }

  private async onCameraSelectChangeAsync(_event: Event): Promise<void> {
    const cameraId = <MediaDeviceId>this.$cameraSelector.value;
    this.stopCameraIfRunning();
    await this.startCamera(cameraId);
  }

  private onShutterButtonClicked(event: MouseEvent): void {
    this.onShutterButtonClickedAsync(event)
    .catch(err=>this.showError(err));
  }

  private async onShutterButtonClickedAsync(_event: MouseEvent): Promise<void> {
    this.$shutterButton.disabled = true;

    // Capture a bitmap image from the camera.
    const stream = <MediaStream>this.$video.srcObject!;
    assert(stream);
    const track = stream.getVideoTracks()[0];
    const imageCapture = new ImageCapture(track);
    const blob =  await imageCapture.takePhoto();
    const imageBitmap = await createImageBitmap(blob);

    // Make this camera the preferred camera in the future.
    const cameraId = <MediaDeviceId>track.getSettings().deviceId!;
    assert(cameraId);
    this.markCameraAsUsed(cameraId);

    // Extract a section of the bitmap into an image data URL.
    // The section is the part that was visible within the cell.
    const imageSize = { width: imageBitmap.width, height: imageBitmap.height };
    const cellSize = this.cell.sizeInPixels();
    const aspectRatio = cellSize.width/cellSize.height;
    // c-nsole.log(`Image size: ${imageSize.width}x${imageSize.height}`);
    // c-nsole.log(`Cell size: ${cellSize.width}x${cellSize.height}`);
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

    // Change the image on the current cell.
    const scaleX = cellSize.width / dWidth;
    const scaleY = scaleX;
    const imageInfo: ImageInfo = { url, size: { width: dWidth, height: dHeight } };
    const positionInfo: PositionInfo = {
      cropBox: { x: 0, y: 0, ...this.cell.sizeInPixels() },
      transformationMatrix: [ scaleX, 0, 0, scaleY, 0, 0 ],
    }
    await this.cell.changeImageRequest(imageInfo, positionInfo);

    // When the update is received, the cell view will switch to the image panel.
  }

  private onVideoCanPlay(_event: Event): void {
    this.$shutterButton.disabled = false;
  }
}
