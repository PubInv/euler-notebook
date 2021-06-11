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
import { ImageInfo, PositionInfo } from "../../../../../shared/image-cell";

import { debugConsole } from "../../../../../components/debug-console";
import { ImageCell } from "../../../../../models/client-cell/image-cell";

import { $new, $button } from "../../../../../dom";
import { HtmlElement } from "../../../../../html-element";
import { errorMessageForUser } from "../../../../../error-messages";
import { MediaDeviceId, PersistentSettings } from "../../../../../persistent-settings";

// Types

// Constants

const MAX_USED_CAMERAS = 4;

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
  private selectedDeviceId?: MediaDeviceId;

  // private transformationMatrix?: TransformationMatrix;
  // private videoSize?: SizeInPixels;

  // Private Instance Property Functions

  private markCameraAsUsed(deviceId: MediaDeviceId): void {
    const usedCameras = PersistentSettings.usedCameras;
    const index = usedCameras.indexOf(deviceId);
    if (index>=0) { usedCameras.splice(index, 1); }
    usedCameras.unshift(deviceId);
    if (usedCameras.length > MAX_USED_CAMERAS) {
      usedCameras.slice(0, MAX_USED_CAMERAS);
    }
    PersistentSettings.usedCameras = usedCameras;
  }

  // Private Instance Methods

  private async getListOfCameras(): Promise<MediaDeviceInfo[]> {
    // Get the list of media devices
    const mediaDevices = await navigator.mediaDevices.enumerateDevices();
    const rval = mediaDevices.filter(m=>m.kind == 'videoinput');
    debugConsole_emitMediaDevices(rval);
    return rval;
  }

  private populateCameraList(cameras: MediaDeviceInfo[], deviceId: MediaDeviceId|undefined): void {
    const numCameras = cameras.length;
    if (numCameras < 2) {
      this.$cameraSelector.style.display = 'none';
      return;
    }

    // Multiple cameras available.
    const optionElements = cameras.map((c,i)=>$new({
      tag: 'option',
      value: c.deviceId,
      selected: (c.deviceId == deviceId),
      html: <Html>(c.label || `Camera ${i+1}`),
    }));
    this.$cameraSelector.append(...optionElements);
    this.$cameraSelector.style.display = '';
  }

  private showError(err: Error): void {
    const html = errorMessageForUser(err);
    this.$errorMessage.innerHTML = html;
    this.$errorMessage.style.display = '';
  }

  private async startCamera(deviceId: MediaDeviceId|undefined): Promise<MediaDeviceId> {
    assert(!this.$video.srcObject);

    const cellSize = this.cell.sizeInPixels();
    const constraints: MediaStreamConstraints = {
      audio: false,
      video: {
        // TODO: What if "exact" video size not available?
        deviceId: (deviceId ? { exact: deviceId }: PersistentSettings.usedCameras),
        facingMode: 'environment',
        height: { exact: cellSize.height },
        width: { exact: cellSize.width },
      },
    };

    // TODO: Handle NotAllowedError and NotFoundError.
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    debugConsole_emitStreamInfo(stream);
    this.$video.srcObject = stream;
    const track = stream.getVideoTracks()[0];
    deviceId = <MediaDeviceId>track.getSettings().deviceId!;
    this.selectedDeviceId = deviceId;
    return deviceId;
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
    const deviceId = await this.startCamera(this.selectedDeviceId);
    const cameras = await this.getListOfCameras();
    this.populateCameraList(cameras, deviceId);
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
    const deviceId = <MediaDeviceId>this.$cameraSelector.value;
    this.stopCameraIfRunning();
    await this.startCamera(deviceId);
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

// Helper Functions

function debugConsole_emitMediaDevices(mediaDevices: MediaDeviceInfo[]): void {
  debugConsole.emitObjectTable(mediaDevices, `Media Device Info`);
}

function debugConsole_emitStreamInfo(stream: MediaStream): void {
  debugConsole.emit(`Media Stream ${stream.id}, active: ${stream.active}`);
  for (const track of stream.getTracks()) {
    debugConsole.emit(`Track ${track.id} ${track.kind} ${track.label} ${track.readyState}`);
    const capabilities = track.getCapabilities();
    debugConsole.emitObject(capabilities, "Capabilities");
    const constraints = track.getConstraints();
    debugConsole.emitObject(constraints, "Constraints");
    const settings = track.getSettings();
    debugConsole.emitObject(settings, "Settings");
  }
}
