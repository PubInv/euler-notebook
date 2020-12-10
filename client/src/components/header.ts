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

// import * as debug1 from "debug";
// const debug = debug1('client:header');

import { CssClass, Html, escapeHtml, notImplementedWarning, RelativeUrl, ClientId } from "../shared/common";
import { Path } from "../shared/folder";
import { UserId } from "../shared/user";

import { ButtonBar } from "./button-bar";
import { $new, svgIconReferenceMarkup, ElementId, HtmlElementSpecification, $, EULER_NUMBER_ENTITY } from "../dom";
import { monitorPromise } from "../error-handler";
// import { userSettingsInstance, InputMode } from "../user-settings";
import { NotebookUserConnected, NotebookUserDisconnected } from "../shared/server-responses";

// Types

// Constants

// Global Variables

// Exported singleton instance

export let headerInstance: Header;

// Class

export class Header extends ButtonBar {

  // Public Class Methods

  // Public Instance Methods

  // Public Constructor

  public constructor(path: Path, users?: IterableIterator<NotebookUserConnected>) {

    let titleHtml: Html = <Html>(path===<Path>'/' ? 'Euler Notebook' : '<a href="#/">Home</a>');
    const segments = path.split('/').slice(1);
    if (segments[segments.length-1].length == 0) { segments.pop(); }
    for (let i=0; i<segments.length; i++) {
      const escapedSegment = escapeHtml(segments[i]);
      const href = `#/${segments.slice(0, i+1).join('/')}/`;
      const segmentHtml = (i < segments.length-1 ? `<a href="${href}">${escapedSegment}</a>` : escapedSegment);
      titleHtml += ' / ' + segmentHtml;
    }

    const refreshButton: HtmlElementSpecification<'button'> = {
      tag: 'button',
      class: <CssClass>'iconButton',
      title: "Refresh page",
      html: svgIconReferenceMarkup('iconMonstrRefresh2'),
      listeners: { click: _e=>window.location.reload() },
    };

    const fullscreenButton: HtmlElementSpecification<'button'> = {
      tag: 'button',
      class: <CssClass>'iconButton',
      title: "Full screen",
      html: svgIconReferenceMarkup('iconMonstrFullScreen7'),
      disabled: !document.fullscreenEnabled,
      listeners: { click: e=>this.onFullscreenButtonClicked(e) },
    };

    const $usersSpan = $new<'span'>({
      tag: 'span',
    });

//    const inputMode = userSettingsInstance.defaultInputMode;

    const leftSpan: HtmlElementSpecification<'span'> = {
      tag: 'span',
      children: [
        {
          tag: 'button',
          class: <CssClass>'entityButton',
          title: "Euler Notebook home",
          html: EULER_NUMBER_ENTITY, // svgIconReferenceMarkup('iconMonstrHome6'),
          listeners: { click: _e=>{ window.location.href = '/#/'; }},
        // }, {
        //   tag: 'select',
        //   id: <ElementId>'inputMode',
        //   children: [
        //     { tag: 'option', value: 'keyboard', html: <Html>"Keyboard", selected: inputMode=='keyboard' },
        //     { tag: 'option', value: 'stylus', html: <Html>"Stylus", selected: inputMode=='stylus' },
        //   ],
        //   listeners: { input: e=>{
        //     const inputMode = <InputMode>(<HTMLSelectElement>e.target).value;
        //     debug(`Default input mode changing to '${inputMode}'`);
        //     userSettingsInstance.defaultInputMode = inputMode;
        //   }}
        },
      ],
    };

    const rightSpan: HtmlElementSpecification<'span'> = {
      tag: 'span',
      children: [
        refreshButton,
        fullscreenButton,
        $usersSpan,
        {
          tag: 'button',
          class: <CssClass>'iconButton',
          title: "User settings",
          html: svgIconReferenceMarkup('iconMonstrUser1'),
          listeners: { click: _e=>notImplementedWarning("User settings") },
        },
      ],
    };

    super({
      tag: 'div',
      id: <ElementId>'header',
      children: [
        leftSpan,
        {
          tag: 'div',
          id: <ElementId>'title',
          html: titleHtml,
        },
        rightSpan,
      ],
    });

    this.$usersSpan = $usersSpan;

    if (users) {
      for (const msg of users) {
        this.addUserButton(msg);
      }
    }
  }

  // Public Instance Event Handlers

  public onUserConnected(msg: NotebookUserConnected, _ownRequest: boolean): void {
    this.addUserButton(msg);
  };

  public onUserDisconnected(msg: NotebookUserDisconnected, _ownRequest: boolean): void {
    $(this.$usersSpan, `#${idForUserButton(msg.clientId)}`).remove();
  }

  // -- PRIVATE --

  // Private Instance Properties

  private $usersSpan: HTMLSpanElement;

  // Private Instance Methods

  private addUserButton(msg: NotebookUserConnected): void {
    const $userButton = $new<'button'>({
      tag: 'button',
      title: msg.userInfo.userName,
      children: [{
        tag: 'img',
        id: idForUserButton(msg.clientId),
        src: urlForSmallProfilePic(msg.userInfo.id),
      }],
      listeners: { click: e=>this.onUserButtonClicked(e, msg) },
    });
    this.$usersSpan.append($userButton);
  }

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

  private onUserButtonClicked(_event: MouseEvent, msg: NotebookUserConnected): void {
    notImplementedWarning(`User button for ${msg.clientId} ${msg.userInfo.id} ${msg.userInfo.userName}`);
  }
}

// Helper Functions

function idForUserButton(clientId: ClientId): ElementId {
  return <ElementId>`user-${clientId}-button`;
}

function urlForSmallProfilePic(userId: UserId): RelativeUrl {
  return <RelativeUrl>`/images/profile-pics/user-${userId}-26x26.png`;
}