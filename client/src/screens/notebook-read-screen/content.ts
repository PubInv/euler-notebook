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

import { $newSvg, $allSvg, ElementClass, $outerSvg } from "../../dom";
import { NotebookReadScreen } from "./index";
import { HtmlElement } from "../../html-element";
import { assert, notImplemented } from "../../shared/common";

// Types

// Constants

const PIXELS_PER_INCH = 96;

// TEMPORARY page data until our Notebooks are paginated:

//
// Global Variables

// Class

export class Content extends HtmlElement<'div'>{

  // Class Methods

  // Public Constructor

  public constructor(screen: NotebookReadScreen) {

    super({ tag: 'div', appendTo: screen.$elt, class: <ElementClass>'content' });

    this.screen = screen;
    this.marginPercent = 0.025;
    this.pagesPerRow = 1;

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

    // const topMargin = notebook.pageConfig.margins.top;
    // const leftMargin = notebook.pageConfig.margins.left;

    for (const page of notebook.pages) {
      const $page = $newSvg({
        tag: 'svg',
        appendTo: this.$elt,
        attrs: {
          viewBox: `0 0 ${viewBoxWidth} ${viewBoxHeight}`,
        },
        class: <ElementClass>'page',
        listeners: {
          click: e=>this.onPageClicked(e),
          dblclick: e=>this.onPageDoubleClicked(e),
        },
      });

      // let y: number = parseInt(topMargin);
      for (const styleId of page.styleIds) {

        const style = this.screen.notebook.getStyle(styleId);
        const svgRepStyle = this.screen.notebook.findStyle({ role: 'REPRESENTATION', type: 'SVG-MARKUP' }, style.id);
        if (!svgRepStyle) {
          console.warn(`Top-level style does not have SVG representation: ${style.id}`);
          continue;
        }

        const $cellSvg = $outerSvg(svgRepStyle.data);
        // TODO: translate SVG by (leftMargin, y);
        $page.appendChild($cellSvg);

        const svgHeight = $cellSvg.getAttribute('height')!;
        assert(svgHeight);

        // y += parseInt(svgHeight);
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

// const DOCUMENT: Document = {
//   pageConfig: {
//     size: { width: '8.5in', height: '11in' },
//     margins: { top: '1in', bottom: '1in', left: '1in', right: '1in' },
//   },
//   pages: [
//     {
//       id: 'p1',
//       cells: [
//         { id: 'p1c1', size: { width: '6.5in', height: '1in' } },
//         { id: 'p1c2', size: { width: '6.5in', height: '1in' } },
//         { id: 'p1c3', size: { width: '6.5in', height: '1in' } },
//         { id: 'p1c4', size: { width: '6.5in', height: '1in' } },
//         { id: 'p1c5', size: { width: '6.5in', height: '1in' } },
//         { id: 'p1c6', size: { width: '6.5in', height: '1in' } },
//         { id: 'p1c7', size: { width: '6.5in', height: '1in' } },
//         { id: 'p1c8', size: { width: '6.5in', height: '1in' } },
//         { id: 'p1c9', size: { width: '6.5in', height: '1in' } },
//       ],
//     },
//     {
//       id: 'p2',
//       cells: [
//         { id: 'p2c1', size: { width: '6.5in', height: '1in' } },
//         { id: 'p2c2', size: { width: '6.5in', height: '1in' } },
//         { id: 'p2c3', size: { width: '6.5in', height: '1in' } },
//         { id: 'p2c4', size: { width: '6.5in', height: '1in' } },
//         { id: 'p2c5', size: { width: '6.5in', height: '1in' } },
//         { id: 'p2c6', size: { width: '6.5in', height: '1in' } },
//         { id: 'p2c7', size: { width: '6.5in', height: '1in' } },
//         { id: 'p2c8', size: { width: '6.5in', height: '1in' } },
//         { id: 'p2c9', size: { width: '6.5in', height: '1in' } },
//       ],
//     },
//     {
//       id: 'p3',
//       cells: [
//         { id: 'p3c1', size: { width: '6.5in', height: '9in' } },
//       ],
//     },
//     { id: 'p4', cells: [
//       { id: 'p4c1', size: { width: '6.5in', height: '9in' } },
//     ]},
//     { id: 'p5', cells: [
//       { id: 'p5c1', size: { width: '6.5in', height: '9in' } },
//     ]},
//     { id: 'p6', cells: [
//       { id: 'p6c1', size: { width: '6.5in', height: '9in' } },
//     ]},
//     { id: 'p7', cells: [
//       { id: 'p7c1', size: { width: '6.5in', height: '9in' } },
//     ]},
//     { id: 'p8', cells: [
//       { id: 'p8c1', size: { width: '6.5in', height: '9in' } },
//     ]},
//     { id: 'p9', cells: [
//       { id: 'p9c1', size: { width: '6.5in', height: '9in' } },
//     ]},
//   ],
// };
