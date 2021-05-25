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

// TODO: Disable forward/back buttons when displaying 3rd party content.

// Requirements

import { AbsoluteUrl, assert } from "../../shared/common";
import { CssClass } from "../../shared/css";
import { $new, svgIconReferenceMarkup } from "../../dom";

import { HtmlElement } from "../../html-element";

// import { NotebookEditScreen } from "./index";

// Types

const THIRD_PARTY_URL = '<3rd Party>';
type ThirdPartyUrl = '<3rd Party>';

// Constants

// LATER: Per user home page.
const DEFAULT_HOME_PAGE = <AbsoluteUrl>'/ref/';

// Global Variables

// Exported Class

export class ReferencePanel extends HtmlElement<'div'> {

  // Public Class Methods

  // Public Constructor

  public constructor() {

    const homeUrl = DEFAULT_HOME_PAGE;

    const $urlInput = $new({
      tag: 'input',
      attrs: {
        type: 'url',
        placeholder: "URL...",
        value: homeUrl,
      },
    });

    const $iframe = $new({
      tag: 'iframe',
      class: <CssClass>'referenceFrame',
      src: homeUrl,
    });

    const $backButton = $new({
      tag: 'button',
      class: <CssClass>'smallIconButton',
      type: 'submit',
      title: "Go back",
      syncButtonHandler: e=>this.onBackButtonClicked(e),
      html: svgIconReferenceMarkup('iconMonstrArrow72'),
    });

    const $forwardButton = $new({
      tag: 'button',
      class: <CssClass>'smallIconButton',
      type: 'submit',
      title: "Go forward",
      syncButtonHandler: e=>this.onForwardButtonClicked(e),
      html: svgIconReferenceMarkup('iconMonstrArrow71'),
    });

    super({
      tag: 'div',
      classes: [ <CssClass>'panel', <CssClass>'referencePanel' ],
      children: [
        {
          tag: 'form',
          class: <CssClass>'referenceForm',
          children: [
            $urlInput,
            $backButton,
            $forwardButton,
            {
              tag: 'button',
              class: <CssClass>'smallIconButton',
              type: 'submit',
              title: "Go home",
              syncButtonHandler: e=>this.onHomeButtonClicked(e),
              html: svgIconReferenceMarkup('iconMonstrHome6'),
            }, {
              tag: 'button',
              class: <CssClass>'smallIconButton',
              type: 'submit',
              title: "Go to URL",
              syncButtonHandler: e=>this.onGoButtonClicked(e),
              html: svgIconReferenceMarkup('iconMonstrBook17'),
            },
          ],
          asyncListeners: {
            submit: (e: Event) => this.onSubmit(e),
          },
        },
        $iframe,
      ],
      hidden: true,
    });

    iframeURLChange($iframe, url=>this.onIFrameUrlChange(url));

    this.$backButton = $backButton;
    this.$forwardButton = $forwardButton;
    this.$iframe = $iframe;
    this.$urlInput = $urlInput;

    this.homeUrl = homeUrl;
    // this.screen = screen;
  }

  // Public Instance Properties

  // Public Instance Methods

  public navigateTo(url: AbsoluteUrl): void {
    // TODO: Validate URL, add https:// if necessary, etc.
    // NOTE: iFrame load event will update the address bar.
    this.$iframe.src = url;
  }

  public setFocus(): void {
    this.$urlInput.focus();
  }

  // -- PRIVATE --

  // Private Instance Properties

  private $backButton: HTMLButtonElement;
  private $forwardButton: HTMLButtonElement;
  private $iframe: HTMLIFrameElement;
  private $urlInput: HTMLInputElement;
  // private screen: NotebookEditScreen;
  private homeUrl: AbsoluteUrl;

  // Private Instance Methods

  // Private Instance Event Handlers

  private onBackButtonClicked(event: MouseEvent): void {
    event.preventDefault(); // Don't submit form.
    assert(this.$iframe.contentWindow);
    this.$iframe.contentWindow!.history.back();
  }

  private onForwardButtonClicked(event: MouseEvent): void {
    event.preventDefault(); // Don't submit form.
    this.$iframe.contentWindow!.history.forward();
  }

  private onGoButtonClicked(event: MouseEvent): void {
    event.preventDefault(); // Don't submit form.
    // TODO: Sanity check the URL.
    this.$iframe.src = this.$urlInput.value;
  }

  private onHomeButtonClicked(event: MouseEvent): void {
    event.preventDefault(); // Don't submit form.
    this.navigateTo(this.homeUrl);
  }

  private onIFrameUrlChange(url: AbsoluteUrl|ThirdPartyUrl): void {
    this.$urlInput.value = url;
    const disableBackForwardButtons = (url == THIRD_PARTY_URL);
    this.$backButton.disabled = disableBackForwardButtons;
    this.$forwardButton.disabled = disableBackForwardButtons;
  }

  private async onSubmit(event: /* TYPESCRIPT: Why not SubmitEvent? */Event): Promise<void> {
    event.preventDefault(); // Don't perform form submit navigation.
    // const notebookPath = this.screen.notebook.path;
    const url = <AbsoluteUrl>this.$urlInput.value;
    // TODO: Validate URL, add https://...
    this.navigateTo(url);
  }

}

// Helper Functions

// https://gist.github.com/hdodov/a87c097216718655ead6cf2969b0dcfa
function iframeURLChange(iframe: HTMLIFrameElement, callback: (url: AbsoluteUrl|ThirdPartyUrl)=>void) {
  let oldHRef: AbsoluteUrl|ThirdPartyUrl;

  var dispatchChange = function () {
    let newHRef: AbsoluteUrl | ThirdPartyUrl;
    try {
      newHRef = <AbsoluteUrl>iframe.contentWindow!.location.href;
    } catch(err) {
      if (err instanceof DOMException && err.code == 18) {
        newHRef = THIRD_PARTY_URL;
      } else {
        throw err;
      }
    }
    if (newHRef !== oldHRef) {
      callback(newHRef);
      oldHRef = newHRef;
    }
  };

  var unloadHandler = function () {
    // Timeout needed because the URL changes immediately after
    // the `unload` event is dispatched.
    setTimeout(dispatchChange, 0);
  };

  function attachUnload() {
    // Remove the unloadHandler in case it was already attached.
    // Otherwise, there will be two handlers, which is unnecessary.
    iframe.contentWindow!.removeEventListener("unload", unloadHandler);
    iframe.contentWindow!.addEventListener("unload", unloadHandler);
  }

  iframe.addEventListener("load", function () {
    attachUnload();
    // Just in case the change wasn't dispatched during the unload event...
    dispatchChange();
  });

  // attachUnload();
}

