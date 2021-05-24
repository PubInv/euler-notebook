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

import * as debug1 from "debug";
const debug = debug1('client:photo-panel');

import { assert, DataUrl, JPEG_MIME_TYPE } from "../../shared/common";
import { CssClass, LengthInPixels } from "../../shared/css";

import { $new, svgIconReferenceMarkup } from "../../dom";
import { HtmlElement } from "../../html-element";

import { NotebookEditScreen } from ".";

// Types

enum Mode {
  Record,
  Review,
}

interface PhotoInfo {
  url: DataUrl;
  width: LengthInPixels;
  height: LengthInPixels;
}

// Constants

const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: { facingMode: "environment" },
};

// Global Variables

// Exported Class

export class PhotoPanel extends HtmlElement<'div'> {

  // Public Class Methods

  // Public Constructor

  public constructor(screen: NotebookEditScreen) {

    const $cameraButton = $new({
      tag: 'button',
      class: <CssClass>'smallIconButton',
      type: 'submit',
      title: "Take photo",
      syncButtonHandler: e=>this.onCameraButtonClicked(e),
      html: svgIconReferenceMarkup('iconMonstrPhotoCamera5'),
    });

    const $acceptButton = $new({
      tag: 'button',
      class: <CssClass>'smallIconButton',
      type: 'submit',
      title: "Accept photo",
      syncButtonHandler: e=>this.onAcceptButtonClicked(e),
      html: svgIconReferenceMarkup('iconMonstrCheckMark2'),
      hidden: true,
    });

    const $rejectButton = $new({
      tag: 'button',
      class: <CssClass>'smallIconButton',
      type: 'submit',
      title: "Reject photo",
      syncButtonHandler: e=>this.onRejectButtonClicked(e),
      html: svgIconReferenceMarkup('iconMonstrXMark2'),
      hidden: true,
    });

    const $cameraCanvas = $new({ tag: 'canvas', hidden: true });

    const $cameraVideo = $new({
      tag: 'video',
      attrs: { autoplay: true, playsinline: true }
    });

    const $cameraImage = $new({ tag: 'img', hidden: true });

    super({
      tag: 'div',
      classes: [ <CssClass>'panel', <CssClass>'photoPanel' ],
      children: [
        $cameraVideo,
        $cameraCanvas,
        $cameraImage,
        $cameraButton,
        $rejectButton,
        $acceptButton,
      ],
      hidden: true,
    });

    this.$cameraCanvas = $cameraCanvas;
    this.$cameraVideo = $cameraVideo;
    this.$cameraImage = $cameraImage;

    this.$acceptButton = $acceptButton;
    this.$cameraButton = $cameraButton;
    this.$rejectButton = $rejectButton;

    this.mode = Mode.Record;
    this.screen = screen;
  }

  // Public Instance Properties

  // Public Instance Methods

  public setFocus(): void {
    this.$cameraButton.focus();
  }

  // -- PRIVATE --

  // Private Instance Properties

  private $acceptButton: HTMLButtonElement;
  private $cameraButton: HTMLButtonElement;
  private $rejectButton: HTMLButtonElement;

  private $cameraCanvas: HTMLCanvasElement;
  private $cameraVideo: HTMLVideoElement;
  private $cameraImage: HTMLImageElement;

  private mode: Mode;
  private screen: NotebookEditScreen;

  private photoInfo?: PhotoInfo;

  // Private Instance Property Functions

  private stream(): MediaStream|null {
    return <MediaStream>this.$cameraVideo.srcObject;
  }

  // Private Instance Methods

  private startCamera(): void {
    this.startCamera2()
    .catch(_err=>{
      console.error("ERROR: Error starting camera.");
      // TODO: display error to user.
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
    stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
    this.$cameraVideo.srcObject = stream;
  }

  private stopCameraIfRunning(): void {
    const stream = this.stream();
    if (!stream) { return }
    debug("Stopping camera.");
    for (const track of stream.getTracks()) {
      track.stop();
    }
    this.$cameraVideo.srcObject = null;
  }

  private switchToRecordMode(startCamera: boolean): void {
    assert(this.mode != Mode.Record);
    this.$cameraVideo.style.display = 'block';
    this.$cameraImage.style.display = 'none';
    this.$cameraImage.src = '';
    this.$cameraButton.style.display = 'inline';
    this.$acceptButton.style.display = 'none';
    this.$rejectButton.style.display = 'none';
    if (startCamera) { this.startCamera(); }
    this.mode = Mode.Record;
  }

  private switchToReviewMode(): void {
    assert(this.mode != Mode.Review);
    this.stopCameraIfRunning();
    this.$cameraVideo.style.display = 'none';
    this.$cameraImage.style.display = 'block';
    this.$cameraButton.style.display = 'none';
    this.$acceptButton.style.display = 'inline';
    this.$rejectButton.style.display = 'inline';
    this.mode = Mode.Review;
  }


  // Private Instance Event Handlers

  protected /* override */ onAfterShow(): void {
    debug("After show.");
    if (this.mode == Mode.Record) { this.startCamera(); }
  }

  protected /* override */ onBeforeHide(): void {
    debug("Before hide.");
    this.stopCameraIfRunning();
  }

  private onAcceptButtonClicked(_event: MouseEvent): void {
    const pi = this.photoInfo;
    assert(pi);
    this.screen.notebook.insertPhotoCell(pi!.url, pi!.width, pi!.height);
    this.hide();
    this.switchToRecordMode(false);
  }

  private onCameraButtonClicked(_event: MouseEvent): void {
    const width = this.$cameraCanvas.width = this.$cameraVideo.videoWidth;
    const height = this.$cameraCanvas.height = this.$cameraVideo.videoHeight;
    const context = this.$cameraCanvas.getContext("2d")!;
    assert(context);
    context.drawImage(this.$cameraVideo, 0, 0);
    // Other formats: "image/webp", "image/png"
    const photoInfo: PhotoInfo = {
      url: <DataUrl>this.$cameraCanvas.toDataURL(JPEG_MIME_TYPE)!,
      width,
      height,
    }
    assert(photoInfo.url);
    this.photoInfo = photoInfo;
    this.$cameraImage.src = photoInfo.url;
    this.switchToReviewMode();
  }

  private onRejectButtonClicked(_event: MouseEvent): void {
    this.switchToRecordMode(true);
  }
}
