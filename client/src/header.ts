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
// LATER: If input mode user setting changes elsewhere then update the selected option.

// Requirements

import * as debug1 from "debug";
const debug = debug1('client:header');

import { Html, escapeHtml, notImplemented } from "./shared/common";
import { Path } from "./shared/folder";

import { ButtonBar } from "./button-bar";
import { $, $new, svgIconReference, ElementClass, ElementId } from "./dom";
import { monitorPromise } from "./error-handler";
import { userSettingsInstance, InputMode } from "./user-settings";

// Types

// Constants

// Global Variables

// Exported singleton instance

export let headerInstance: Header;

// Class

export class Header extends ButtonBar {

  // Public Class Methods

  public static initialize($body: HTMLBodyElement): void {
    headerInstance = new this($body);
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

  private constructor($parent: HTMLBodyElement) {

    const $fullscreenButton = $new({
      tag: 'button',
      class: <ElementClass>'iconButton',
      title: "Full screen",
      html: svgIconReference('iconMonstrFullScreen7'),
      disabled: !document.fullscreenEnabled,
      listeners: { click: e=>this.onFullscreenButtonClicked(e) },
    });

    const inputMode = userSettingsInstance.defaultInputMode;

    super({
      tag: 'div',
      id: <ElementId>'header',
      appendTo: $parent,
      children: [
        {
          tag: 'span',
          children: [
            {
              tag: 'button',
              class: <ElementClass>'iconButton',
              title: "Math Tablet home",
              html: svgIconReference('iconMonstrHome6'),
              listeners: { click: _e=>{ window.location.href = '/#/'; }},
            }, {
              tag: 'select',
              id: <ElementId>'inputMode',
              children: [
                { tag: 'option', value: 'keyboard', html: <Html>"Keyboard", selected: inputMode=='keyboard' },
                { tag: 'option', value: 'stylus', html: <Html>"Stylus", selected: inputMode=='stylus' },
              ],
              listeners: { input: e=>{
                const inputMode = <InputMode>(<HTMLSelectElement>e.target).value;
                debug(`Default input mode changing to '${inputMode}'`);
                userSettingsInstance.defaultInputMode = inputMode;
              }}
            },
          ],
        }, {
          tag: 'div',
          id: <ElementId>'title',
        }, {
          tag: 'span',
          children: [
            {
              tag: 'button',
              class: <ElementClass>'iconButton',
              title: "Refresh page",
              html: svgIconReference('iconMonstrRefresh2'),
              listeners: { click: _e=>window.location.reload() },
            },
            $fullscreenButton,
            {
              tag: 'button',
              class: <ElementClass>'iconButton',
              title: "User settings",
              html: svgIconReference('iconMonstrUser1'),
              listeners: { click: _e=>notImplemented() },
            },
          ],
        }
      ],
    });


  }

  // Private Instance Properties

  // Private Instance Methods

  // Private Event Handlers

  private onFullscreenButtonClicked(_event: MouseEvent): void {
    // REVIEW: Maybe use this: https://github.com/sindresorhus/screenfull.js?
    // REVIEW: Saw it mentioned somewhere that not all implementations return a promise.
    // See https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API/Guide.
    if (!document.fullscreenElement) {
      monitorPromise(document.documentElement.requestFullscreen(), <Html>`Browser error switching to full-screen mode.`);
    } else {
      document.exitFullscreen();
    }
  }

}

// HELPER FUNCTIONS
