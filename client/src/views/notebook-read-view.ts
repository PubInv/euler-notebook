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

// Requirements

import { CssClass, assert, CssLength, notImplemented } from "../shared/common";

import { $newSvg, $allSvg, $outerSvg, cssLength } from "../dom";
import { HtmlElement } from "../html-element";

import { Mode, NotebookReadScreen } from "../screens/notebook-read-screen/index";

// Types

// Constants

const PIXELS_PER_INCH = 96;

// TEMPORARY page data until our Notebooks are paginated:

//
// Global Variables

// Class

export class NotebookReadView extends HtmlElement<'div'>{

  // Class Methods

  // Public Constructor

  public constructor(screen: NotebookReadScreen, mode: Mode) {

    super({ tag: 'div', appendTo: screen.$elt, class: <CssClass>'content' });

    this.screen = screen;

    if (mode == Mode.Reading) {
      this.marginPercent = 0.025;
      this.pagesPerRow = 1;
    } else {
      assert(mode == Mode.Thumbnails);
      this.marginPercent = 0.1;
      this.pagesPerRow = 4;
    }
    this.render();
    this.resize();
  }

  // Public Instance Properties

  // Public Instance Property Functions

  // Public Instance Methods

  public resize(): void {

    // NOTE: Can't use our own bounding rect when we are hidden.
    //       This assumes our parent element is not hidden.
    // TODO: assert parent element not hidden.
    const viewWidth = this.$elt.getBoundingClientRect().width;

    // Calculate the size of the page thumbnails
    const notebook = this.screen.notebook;
    const pageAspectRatio = parseInt(notebook.pageConfig.size.width) / parseInt(notebook.pageConfig.size.height);
    let pageWidth = viewWidth / (this.pagesPerRow + (this.pagesPerRow+1)*this.marginPercent);
    const pageHeight = Math.round(pageWidth / pageAspectRatio);
    const pageMargin = Math.round(pageWidth * this.marginPercent);
    pageWidth = Math.round(pageWidth);

    // REVIEW: Update the stylesheet instead of each of the pages?
    //         const stylesheet: CSSStyleSheet = <CSSStyleSheet>Array.from(document.styleSheets).find(s=>s.href && s.href.endsWith('drawing.css'));
    //         const stylesheetRules: CSSStyleRule[] = <CSSStyleRule[]>Array.from(stylesheet.cssRules);
    //         const pageRule = stylesheetRules.find(r=>r.selectorText == '.page')!;
    //         pageRule.style.width = `${pageWidth}px`;
    //         pageRule.style.height = `${pageHeight}px`;
    //         pageRule.style.margin = `${pageMargin}px 0 0 ${pageMargin}px`;

    const $pages: NodeListOf<SVGSVGElement> = $allSvg<'svg'>(this.$elt, '.page');
    for (const $page of $pages) {
      $page.style.width = `${pageWidth}px`;
      $page.style.height = `${pageHeight}px`;
      $page.style.margin = `${pageMargin}px 0 0 ${pageMargin}px`;
    }
  }

  // -- PRIVATE --

  // Private Instance Properties

  private marginPercent: number;
  private pagesPerRow: number;
  private screen: NotebookReadScreen;

  // Private Instance Methods

  private render(): void {
    const notebook = this.screen.notebook;

    const pageWidth = parseInt(notebook.pageConfig.size.width);
    const pageHeight = parseInt(notebook.pageConfig.size.height);
    const viewBoxWidth = pageWidth * PIXELS_PER_INCH;
    const viewBoxHeight = pageHeight * PIXELS_PER_INCH;

    const topMargin = notebook.pageConfig.margins.top;
    const leftMargin = notebook.pageConfig.margins.left;

    for (const page of notebook.pages) {
      const $page = $newSvg({
        tag: 'svg',
        appendTo: this.$elt,
        attrs: {
          viewBox: `0 0 ${viewBoxWidth} ${viewBoxHeight}`,
        },
        class: <CssClass>'page',
        listeners: {
          click: e=>this.onPageClicked(e),
          dblclick: e=>this.onPageDoubleClicked(e),
        },
      });

      let x: number = cssLength(leftMargin, 'pt');
      let y: number = cssLength(topMargin, 'pt');
      for (const cellObject of page.cellObjects) {
        const $cellSvg = $outerSvg(cellObject.displaySvg);
        $cellSvg.setAttribute('x', `${x}pt`);
        $cellSvg.setAttribute('y', `${y}pt`);
        // TODO: translate SVG by (leftMargin, y);
        $page.appendChild($cellSvg);

        // LATER: MathJax sets the height of equations SVGs in "ex" units.
        const svgHeight = /* LATER: <CssLength|null>$cellSvg.getAttribute('height') || */ <CssLength>'72pt';

        y += cssLength(svgHeight, 'pt');
      }
    }
  }

  // Private Event Handlers

  private onPageClicked(event: MouseEvent): void {
    const $page = <SVGSVGElement>event.target;
    console.log(`Page double clicked: ${$page.id}`);

    // Unselect all other pages.
    // REVIEW: Use selector to select only selected pages?
    for (const $otherPage of $allSvg<'svg'>(this.$elt, '.page')) {
      if ($otherPage == $page) { continue; }
      $otherPage.classList.remove('selected');
    }

    // Select the page that was clicked on.
    $page.classList.add('selected');
  }

  private onPageDoubleClicked(_event: MouseEvent): void {
    // TODO: double-click on thumbnail should go to page, not cells.
    notImplemented();
  }

}
