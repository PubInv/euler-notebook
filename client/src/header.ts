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

import { ButtonBar } from './button-bar';
import { escapeHtml, $attach, $ } from './dom';
import { monitorPromise } from './error-handler';
import { Path } from './shared/folder';

// Types

// Constants

// Global Variables

// Exported Class

export class Header extends ButtonBar {

  // Public Class Methods

  public static attach($elt: HTMLDivElement): Header {
    return new this($elt);
  }

  // Public Instance Methods

  public setPathTitle(path: Path): void {
    let html = '<a href="#/">Home</a>';
    const segments = path.split('/').slice(1);
    if (segments[segments.length-1].length == 0) { segments.pop(); }
    for (let i=0; i<segments.length; i++) {
      const escapedSegment = escapeHtml(segments[i]);
      const href = `#/${segments.slice(0, i+1).join('/')}/`;
      const segmentHtml = (i < segments.length-1 ? `<a href="${href}">${escapedSegment}</a>` : escapedSegment);
      html += ' / ' + segmentHtml;
    }
    $(this.$elt, '#title').innerHTML = html;
  }

  // -- PRIVATE --

  // Constructor

  private constructor($elt: HTMLDivElement) {
    super($elt)
    $attach($elt, '#homeButton', { listeners: { click: _e=>{ window.location.href = '/#/'; }}});
    $attach($elt, '#refreshButton', { listeners: { click: _e=>{ window.location.reload(); }}});
    $attach($elt, '#userButton', { listeners: { click: _e=>{ alert("User menu not yet implemented."); }}});

    const $fullscreenButton = $attach<'button'>($elt, '#fullscreenButton', { listeners: { click: e=>this.onFullscreenButtonClicked(e) }});
    $fullscreenButton.disabled = !document.fullscreenEnabled;

  }

  // Private Instance Properties

  // Private Instance Methods

  // Private Event Handlers

  private onFullscreenButtonClicked(_event: MouseEvent): void {
    // REVIEW: Maybe use this: https://github.com/sindresorhus/screenfull.js?
    // REVIEW: Saw it mentioned somewhere that not all implementations return a promise.
    // See https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API/Guide.
    if (!document.fullscreenElement) {
      monitorPromise(document.documentElement.requestFullscreen(), `Browser error switching to full-screen mode.`);
    } else {
      document.exitFullscreen();
    }
  }

}

// HELPER FUNCTIONS
