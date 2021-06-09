/*
Euler Notebook
Copyright (C) 2019-21 Public Invention
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

import { ElementId, Html, escapeHtml, RelativeUrl, ClientId } from "../shared/common";
import { CssClass } from "../shared/css";
import { Path } from "../shared/folder";
import { CollaboratorObject, UserName } from "../shared/user";

import { ButtonBar } from "./button-bar";
import { $new, HtmlElementSpecification, $, EULER_NUMBER_ENTITY } from "../dom";
import { monitorPromise } from "../error-handler";
// import { userSettingsInstance, InputMode } from "../user-settings";
import { ClientUser } from "../client-user";
import { svgIcon } from "../svg-icons";

// Types

// Constants

const LOGGED_OUT_ICON = svgIcon('iconMonstrUser1');

// Global Variables

// Exported singleton instance

export let headerInstance: Header;

// Class

export class Header extends ButtonBar {

  // Public Class Methods

  // Public Constructor

  public constructor() {

    const refreshButton: HtmlElementSpecification<'button'> = {
      tag: 'button',
      class: <CssClass>'iconButton',
      title: "Refresh page",
      html: svgIcon('iconMonstrRefresh2'),
      syncButtonHandler: _e=>window.location.reload(),
    };

    const fullscreenButton: HtmlElementSpecification<'button'> = {
      tag: 'button',
      class: <CssClass>'iconButton',
      title: "Full screen",
      html: svgIcon('iconMonstrFullScreen7'),
      disabled: !document.fullscreenEnabled,
      syncButtonHandler: e=>this.onFullscreenButtonClicked(e),
    };

    const $userButton = $new({
      tag: 'button',
      class: <CssClass>'iconButton',
      title: "User settings",
      html: LOGGED_OUT_ICON,
      syncButtonHandler: e=>this.onUserButtonClicked(e),
      disabled: true,
    });

    const $collaboratorsSpan = $new<'span'>({
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
          html: EULER_NUMBER_ENTITY,
          syncButtonHandler: _e=>{ window.location.href = '/#/'; },
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
        $collaboratorsSpan,
        refreshButton,
        fullscreenButton,
        $userButton,
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
          html: <Html>"Euler Notebook",
        },
        rightSpan,
      ],
    });

    this.$collaboratorsSpan = $collaboratorsSpan;
    this.$userButton = $userButton;

  }

  // Public Instance Property Functions

  // Public Instance Methods

  public setCollaborators(collaborators: IterableIterator<CollaboratorObject>): void {
    this.removeAllCollaboratorButtons();
    for (const collaborator of collaborators) {
      this.addCollaboratorButton(collaborator);
    }
  }

  public setPath(path: Path): void {
    // Update the path to the notebook/folder.
    let titleHtml: Html = <Html>(path===<Path>'/' ? 'Euler Notebook' : '<a href="#/">Home</a>');
    const segments = path.split('/').slice(1);
    if (segments[segments.length-1].length == 0) { segments.pop(); }
    for (let i=0; i<segments.length; i++) {
      const escapedSegment = escapeHtml(segments[i]);
      const href = `#/${segments.slice(0, i+1).join('/')}/`;
      const segmentHtml = (i < segments.length-1 ? `<a href="${href}">${escapedSegment}</a>` : escapedSegment);
      titleHtml += ' / ' + segmentHtml;
    }
    $(this.$elt, "#title").innerHTML = titleHtml;
    this.removeAllCollaboratorButtons();
  }

  // Public Instance Event Handlers

  public onCollaboratorConnected(obj: CollaboratorObject): void {
    this.addCollaboratorButton(obj);
  };

  public onCollaboratorDisconnected(clientId: ClientId): void {
    this.removeCollaboratorButton(clientId);
  }

  public onUserLogin(user: ClientUser): void {
    this.$userButton.innerHTML = `<img src="${urlForSmallProfilePic(user.userName)}"/>`;
    this.$userButton.disabled = false;
  }

  public onUserLogout(): void {
    // REVIEW: Should have notification message if user logged out remotely.
    this.$userButton.innerHTML = LOGGED_OUT_ICON;
    this.$userButton.disabled = true;
    // window.location.href = '/#/';
  }

  // -- PRIVATE --

  // Private Instance Properties

  private $userButton: HTMLButtonElement;
  private $collaboratorsSpan: HTMLSpanElement;

  // Private Instance Methods

  private addCollaboratorButton(obj: CollaboratorObject): void {
    const $userButton = $new<'button'>({
      tag: 'button',
      class: <CssClass>'iconButton',
      title: obj.userName,
      children: [{
        tag: 'img',
        id: idForCollaboratorButton(obj.clientId),
        src: urlForSmallProfilePic(obj.userName),
      }],
      // syncButtonHandler: _e=>notImplementedError("Collaborator buttons"),
    });
    this.$collaboratorsSpan.append($userButton);
  }

  private removeCollaboratorButton(clientId: ClientId): void {
    $(this.$collaboratorsSpan, `#${idForCollaboratorButton(clientId)}`).remove();
  }

  private removeAllCollaboratorButtons(): void {
    this.$collaboratorsSpan.innerHTML = "";
  }

  // Private Instance Event Handlers

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

  private onUserButtonClicked(_event: MouseEvent): void {
    ClientUser.logout();
  }
}

// Helper Functions

function idForCollaboratorButton(clientId: ClientId): ElementId {
  return <ElementId>`user-${clientId}-button`;
}

function urlForSmallProfilePic(userName: UserName): RelativeUrl {
  return <RelativeUrl>`/images/profile-pics/${userName}-26x26.png`;
}
