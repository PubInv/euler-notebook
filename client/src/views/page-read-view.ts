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

// import * as debug1 from "debug";
// const debug = debug1('client:cell-read-view');

import { SvgMarkup, viewBoxFromCssSize } from "../shared/svg";
import { CssClass, cssLengthInPixels } from "../shared/css";

import { ClientNotebook } from "../models/client-notebook";
import { ClientPage } from "../models/client-page";
import { SvgElement } from "../svg-element";

// Exported Class

export class PageReadView extends SvgElement<'svg'> {

  // Public Constructor

  public constructor(
    notebook: ClientNotebook,
    page: ClientPage,
  ) {

    // Construct the SVG markup for the page.
    // TODO: Just the cells of this page.
    const x = cssLengthInPixels(notebook.margins.left);
    let y = cssLengthInPixels(notebook.margins.top);
    let pageMarkup: SvgMarkup = <SvgMarkup>'';
    for (const cell of notebook.cells()) {
      const cellMarkup = cell.renderToSvg(x, y);
      pageMarkup += cellMarkup;
      y += cssLengthInPixels(cell.obj.cssSize.height);
    }

    super({
      tag: 'svg',
      class: <CssClass>'page',
      attrs: {
        viewBox: viewBoxFromCssSize(page.cssSize),
      },
      html: pageMarkup,
      // listeners: {
      //   click: e=>this.onPageClicked(e),
      //   dblclick: e=>this.onPageDoubleClicked(e),
      // },
    });
  }

  // Public Instance Methods

  // --- PRIVATE ---

  // Private Instance Methods

  // Private Event Handlers

}

// Helper Functions
