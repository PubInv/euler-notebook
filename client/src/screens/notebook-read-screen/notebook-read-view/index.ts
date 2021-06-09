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

// Requirements

import * as debug1 from "debug";
const debug = debug1('client:notebook-read-view');

import { assert, assertFalse } from "../../../shared/common";
import { CssClass, cssSizeFromPixels, cssLengthInPixels, SizeInPixels } from "../../../shared/css";

import { HtmlElement } from "../../../html-element";

import { Mode } from "../index";

import { PageReadView } from "./page-read-view";
import { ClientNotebook } from "../../../models/client-notebook";

// Types

// Constants

// Global Variables

// Class

export class NotebookReadView extends HtmlElement<'div'> {

  // Class Methods

  // Public Constructor

  public constructor(notebook: ClientNotebook, mode: Mode) {
    debug(`Constructing.`)
    super({
      tag: 'div',
      class: <CssClass>'content',
    });

    this.notebook = notebook;
    this.pageViews = [];

    switch(mode) {
      case Mode.Reading:
        this.marginPercent = 0.025;
        this.pagesPerRow = 1;
        break;
      case Mode.Thumbnails:
        this.marginPercent = 0.1;
        this.pagesPerRow = 4;
        break;
      default: assertFalse();
    }

    // PageReadViews will be created in onAfterShow.
  }

  // Public Instance Properties

  // Public Instance Property Functions

  // Public Instance Methods

  public /* override */ onAfterHide(): void {
    debug(`onAfterHide.`);
    while (this.pageViews.length>0) {
      const pageView = this.pageViews.pop()!;
      pageView.destroy();
    }
  }

  public /* override */ onAfterShow(): void {
    debug(`onAfterShow.`);
    assert(this.pageViews.length == 0);
    for (const pageInfo of this.notebook.pages()) {
      const pageView = new PageReadView(this.notebook, pageInfo);
      this.$elt.append(pageView.$elt);
      this.pageViews.push(pageView);
    }
    this.adjustPageSizes();
  }

  public onResize(): void {
    debug(`onResize.`);
    this.adjustPageSizes();
  }

  // -- PRIVATE --

  // Private Instance Properties

  private marginPercent: number;
  private notebook: ClientNotebook;
  private pagesPerRow: number;
  private pageViews: PageReadView[];

  // Private Instance Methods

  private adjustPageSizes(): void {
    // Calculate the size of the page thumbnails
    // TODO: Different pages could have different sizes.
    const viewWidth = this.$elt.getBoundingClientRect().width;
    assert(viewWidth>0);
    const pageAspectRatio = cssLengthInPixels(this.notebook.pageSize.width) / cssLengthInPixels(this.notebook.pageSize.height);
    const w = viewWidth / (this.pagesPerRow + (this.pagesPerRow+1)*this.marginPercent);
    const pageSize: SizeInPixels = {
      width: Math.round(w),
      height: Math.round(w / pageAspectRatio),
    };
    const pageMargin = Math.round(w * this.marginPercent);

    const cssSize = cssSizeFromPixels(pageSize);
    for (const pageView of this.pageViews) {
      pageView.resizeViaStyle(cssSize);
      pageView.$elt.style.margin = `${pageMargin}px 0 0 ${pageMargin}px`;
    }
  }

  // Private Instance Event Handlers

}
