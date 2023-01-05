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
import { Code as ErrorCode, ExpectedError } from "../../../../../shared/expected-error";
import { logWarning } from "../../../../../error-handler";

// Types

type ErrorName = 'NotFoundError' | 'NotAllowedError';

// Constants

const ERROR_NAME_TO_CODE_MAPPING = new Map<ErrorName, ErrorCode>([
  [ 'NotAllowedError', 'noCameraPermission' ],
  [ 'NotFoundError', 'noCamerasFound' ],
]);

const MAX_PREFERRED_CAMERAS = 4;

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

  // Private Instance Methods

  private addPreferredCamera(deviceId: MediaDeviceId): void {
    const deviceIds = PersistentSettings.preferredCameras;
    const index = deviceIds.indexOf(deviceId);
    if (index>=0) { deviceIds.splice(index, 1); }
    deviceIds.unshift(deviceId);
    if (deviceIds.length > MAX_PREFERRED_CAMERAS) {
      deviceIds.slice(0, MAX_PREFERRED_CAMERAS);
    }
    PersistentSettings.preferredCameras = deviceIds;
  }

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
    const preferredDeviceIds = PersistentSettings.preferredCameras;

    // TODO: What if "exact" video size not available?
    const videoConstraints: MediaTrackConstraints = {
      aspectRatio: cellSize.width/cellSize.height,
      // height: { exact: cellSize.height },
      // width: { exact: cellSize.width },
    };
    if (deviceId) {
      videoConstraints.deviceId = { exact: deviceId };
    } else {
      if (preferredDeviceIds.length>0) {
        videoConstraints.deviceId = preferredDeviceIds;
      } else {
        // No preferred cameras. Use the camera looking away from the user.
        videoConstraints.facingMode = 'environment';
      }
    }
    const constraints: MediaStreamConstraints = { audio: false, video: videoConstraints };
    debugConsole.emitObject(videoConstraints, "Starting camera constraints");

    // When accessing an server on a local network (e.g. myserver.local)
    // from an iPad, mediaDevices doesn't exist on the navigator object.
    const mediaDevices = navigator.mediaDevices
    if (!mediaDevices) { throw new ExpectedError('noCameraPermission'); }

    // TODO: Handle NotAllowedError and NotFoundError.
    let stream: MediaStream;
    try {
      stream = await mediaDevices.getUserMedia(constraints);
    } catch(err) {
      if (err instanceof Error) {
        const code = ERROR_NAME_TO_CODE_MAPPING.get(<ErrorName>err.name);
        if (err.name && !code) { logWarning(<PlainText>`Unknown getUserMedia error '${err.name}'`); }
        throw code ? new ExpectedError(code) : err;
      } else {
        logWarning(<PlainText>"Unknown getUserMedia error that is not of type Error.");
        throw err;
      }
    }
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
    this.addPreferredCamera(deviceId);
  }

  private onShutterButtonClicked(event: MouseEvent): void {
    this.onShutterButtonClickedAsync(event)
    .catch(err=>this.showError(err));
  }

  private async onShutterButtonClickedAsync(_event: MouseEvent): Promise<void> {
    this.$shutterButton.disabled = true;

    // Capture the camera image into a data URL
    const cellSize = this.cell.sizeInPixels();
    const stream = <MediaStream>this.$video.srcObject!;
    assert(stream);
    const track = stream.getVideoTracks()[0];
    const trackSettings = track.getSettings();
    const imageSize = { width: trackSettings.width!, height: trackSettings.height! };
    const $canvas = $new({ tag: 'canvas' });
    $canvas.width = imageSize.width;
    $canvas.height = imageSize.height;
    const context = $canvas.getContext("2d")!;
    assert(context);
    context.drawImage(this.$video, 0, 0);
    // REVIEW: Would it be better to use image formats? "image/webp", "image/png"
    const url = <DataUrl>$canvas.toDataURL(JPEG_MIME_TYPE)!;

    // Change the image on the current cell.
    const scaleX = cellSize.width / imageSize.width;
    const scaleY = scaleX;
    const imageInfo: ImageInfo = { url, size: imageSize };
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
