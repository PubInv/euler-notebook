/*
Math Tablet
Copyright (C) 2019 Public Invention
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

// TODO: Full-screen button should be like a toggle and look depressed when in full-screen mode.

// Requirements

import { $attach, $configureAll, $all } from '../dom.js';
// import { showErrorMessageIfPromiseRejects } from '../global.js';
import { DebugPopup } from './debug-popup.js';
import { ClientNotebook } from './client-notebook.js';

// Types

// Constants

// Global Variables

// Class

export class Header {

  // Class Methods

  public static attach($elt: HTMLDivElement): Header {
    return new this($elt);
  }

  // Instance Methods

  public connect(debugPopup: DebugPopup, openNotebook: ClientNotebook): void {
    this.debugPopup = debugPopup;
    this.openNotebook = openNotebook;
  }

  public enableDebugButton(enable: boolean): void {
    this.$debugButton.disabled = !enable;
  }

  // -- PRIVATE --

  // Constructor

  private constructor($elt: HTMLDivElement) {
    $attach($elt, '#exportButton', { listeners: { click: e=>this.onExportButtonClicked(e) }});
    $attach($elt, '#refreshButton', { listeners: { click: _e=>{ window.location.reload(); }}});
    $attach($elt, '#userButton', { listeners: { click: _e=>{ alert("User menu not yet implemented."); }}});
    this.$debugButton = $attach($elt, '#debugButton', { listeners: { click: e=>this.onDebugButtonClicked(e) }});

    const $fullscreenButton = $attach<HTMLButtonElement>($elt, '#fullscreenButton', { listeners: { click: e=>this.onFullscreenButtonClicked(e) }});
    $fullscreenButton.disabled = !fullScreenIsEnabled();

    // Prevent header buttons from taking focus when clicked.
    // REVIEW: Code duplicated in sidebar.ts.
    $configureAll($all($elt, 'button'), {
      // REVIEW: Use pointer event instead? Will this handle touches and stylus taps?
      listeners: { mousedown: (e: MouseEvent)=>{ e.preventDefault(); }},
    });

  }

  // Private Instance Properties

  private $debugButton: HTMLButtonElement;
  private debugPopup!: DebugPopup

  private openNotebook!: ClientNotebook

  // Private Instance Methods

  // Private Event Handlers

  private onDebugButtonClicked(_event: MouseEvent): void {
    this.enableDebugButton(false);
    this.debugPopup.show();
  }

  private onExportButtonClicked(_event: MouseEvent): void {
    this.openNotebook.export();
  }

  private onFullscreenButtonClicked(_event: MouseEvent): void {
    if (!document.fullscreenElement) {
      requestFullscreen(document.documentElement);
      // // NOTE: Saw it mentioned somewhere that not all implementations return a promise.
      // const promise = Promise.resolve(document.documentElement.requestFullscreen());
      // showErrorMessageIfPromiseRejects(promise, "Cannot go full screen.");
    } else {
      document.exitFullscreen && document.exitFullscreen();
    }
  }

}

// HELPER FUNCTIONS

function fullScreenIsEnabled(): boolean {
  // @ts-ignore
  return !!(document.fullscreenEnabled || document.mozFullScreenEnabled || document.documentElement.webkitRequestFullScreen);
}

function requestFullscreen(element: HTMLElement): void {
  // TODO: Check for error on promise that is returned and show it to user if so. Not all implementations return a promise.
  // REVIEW: Maybe use this: https://github.com/sindresorhus/screenfull.js?
  // See https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API/Guide.
  if (element.requestFullscreen) {
    element.requestFullscreen();
  // @ts-ignore
	} else if (element.mozRequestFullScreen) {
    // @ts-ignore
    element.mozRequestFullScreen();
  // @ts-ignore
	} else if (element.webkitRequestFullScreen) {
    // @ts-ignore
		element.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
	}
}
