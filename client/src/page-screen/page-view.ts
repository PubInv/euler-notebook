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

import { $new, $newSvg, $allSvg } from "../dom"
import { PageSidebar } from "./page-sidebar"
import { ClientNotebook } from "../client-notebook"

// Types

export enum PageViewType { Single, Thumbnail }

interface PageTypeData {
  marginPercent: number,
  pagesPerRow: number,
}

// Constants

const PIXELS_PER_INCH = 96;

const PAGE_TYPE_DATA = new Map<PageViewType, PageTypeData>([
  [ PageViewType.Single, { marginPercent: 0.025, pagesPerRow: 1 }],
  [ PageViewType.Thumbnail, { marginPercent: 0.10, pagesPerRow: 4 }],
]);

// TEMPORARY page data until our Notebooks are paginated:

export type CellId = string;
export type PageId = string;

export interface CellData {
  id: CellId;
  size: CssSize;
}

export interface CssSize {
  height: string; // TYPESCRIPT: CssLength
  width: string; // TYPESCRIPT: CssLength
}

interface Document {
  pageConfig: PageConfig,
  pages: PageData[];
}

interface PageConfig {
  size: CssSize;
  margins: PageMargins;
}

interface PageData {
  id: PageId;
  cells: CellData[];
}

interface PageMargins {
  bottom: string;
  left: string;
  right: string;
  top: string;
}

const DOCUMENT: Document = {
  pageConfig: {
    size: { width: '8.5in', height: '11in' },
    margins: { top: '1in', bottom: '1in', left: '1in', right: '1in' },
  },
  pages: [
    {
      id: 'p1',
      cells: [
        { id: 'p1c1', size: { width: '6.5in', height: '1in' } },
        { id: 'p1c2', size: { width: '6.5in', height: '1in' } },
        { id: 'p1c3', size: { width: '6.5in', height: '1in' } },
        { id: 'p1c4', size: { width: '6.5in', height: '1in' } },
        { id: 'p1c5', size: { width: '6.5in', height: '1in' } },
        { id: 'p1c6', size: { width: '6.5in', height: '1in' } },
        { id: 'p1c7', size: { width: '6.5in', height: '1in' } },
        { id: 'p1c8', size: { width: '6.5in', height: '1in' } },
        { id: 'p1c9', size: { width: '6.5in', height: '1in' } },
      ],
    },
    {
      id: 'p2',
      cells: [
        { id: 'p2c1', size: { width: '6.5in', height: '1in' } },
        { id: 'p2c2', size: { width: '6.5in', height: '1in' } },
        { id: 'p2c3', size: { width: '6.5in', height: '1in' } },
        { id: 'p2c4', size: { width: '6.5in', height: '1in' } },
        { id: 'p2c5', size: { width: '6.5in', height: '1in' } },
        { id: 'p2c6', size: { width: '6.5in', height: '1in' } },
        { id: 'p2c7', size: { width: '6.5in', height: '1in' } },
        { id: 'p2c8', size: { width: '6.5in', height: '1in' } },
        { id: 'p2c9', size: { width: '6.5in', height: '1in' } },
      ],
    },
    {
      id: 'p3',
      cells: [
        { id: 'p3c1', size: { width: '6.5in', height: '9in' } },
      ],
    },
    { id: 'p4', cells: [
      { id: 'p4c1', size: { width: '6.5in', height: '9in' } },
    ]},
    { id: 'p5', cells: [
      { id: 'p5c1', size: { width: '6.5in', height: '9in' } },
    ]},
    { id: 'p6', cells: [
      { id: 'p6c1', size: { width: '6.5in', height: '9in' } },
    ]},
    { id: 'p7', cells: [
      { id: 'p7c1', size: { width: '6.5in', height: '9in' } },
    ]},
    { id: 'p8', cells: [
      { id: 'p8c1', size: { width: '6.5in', height: '9in' } },
    ]},
    { id: 'p9', cells: [
      { id: 'p9c1', size: { width: '6.5in', height: '9in' } },
    ]},
  ],
};

// Global Variables

// Class

export class PageView {

  // Class Methods

  public static create($parent: HTMLElement, notebook: ClientNotebook, type: PageViewType): PageView {
    return new this($parent, notebook, type);
  }

  // Instance Methods

  public connect(_clientNotebook: ClientNotebook, _sidebar: PageSidebar): void {
    this.render();
    this.resize();
  }

  public resize(): void {

    // NOTE: Can't use our own bounding rect when we are hidden.
    //       This assumes our parent element is not hidden.
    // TODO: assert parent element not hidden.
    const viewWidth = this.$elt.parentElement!.getBoundingClientRect().width;

    // Calculate the size of the page thumbnails
    const pageAspectRatio = parseInt(DOCUMENT.pageConfig.size.width) / parseInt(DOCUMENT.pageConfig.size.height);
    let pageWidth = viewWidth / (this.pagesPerRow + (this.pagesPerRow+1)*this.marginPercent);
    const pageHeight = Math.round(pageWidth / pageAspectRatio);
    const pageMargin = Math.round(pageWidth * this.marginPercent);
    pageWidth = Math.round(pageWidth);

    // LATER: Update the stylesheet instead of each of the pages.
    // const stylesheet: CSSStyleSheet = <CSSStyleSheet>Array.from(document.styleSheets).find(s=>s.href && s.href.endsWith('drawing.css'));
    // const stylesheetRules: CSSStyleRule[] = <CSSStyleRule[]>Array.from(stylesheet.cssRules);
    // const pageRule = stylesheetRules.find(r=>r.selectorText == '.page')!;
    // pageRule.style.width = `${pageWidth}px`;
    // pageRule.style.height = `${pageHeight}px`;
    // pageRule.style.margin = `${pageMargin}px 0 0 ${pageMargin}px`;

    const $pages: NodeListOf<SVGSVGElement> = $allSvg<'svg'>(this.$elt, '.page');
    for (const $page of $pages) {
      $page.style.width = `${pageWidth}px`;
      $page.style.height = `${pageHeight}px`;
      $page.style.margin = `${pageMargin}px 0 0 ${pageMargin}px`;
    }
  }

  // -- PRIVATE --

  // Constructor

  private constructor($parent: HTMLElement, _notebook: ClientNotebook, type: PageViewType) {

    this.$elt = $new({ tag: 'div', appendTo: $parent, class: 'view' });

    const ptd = PAGE_TYPE_DATA.get(type)!;
    this.marginPercent = ptd.marginPercent;
    this.pagesPerRow = ptd.pagesPerRow;
  }

  // Private Instance Properties

  private $elt: HTMLDivElement;
  private marginPercent: number;
  private pagesPerRow: number;

  // Private Instance Methods

  private render(): void {
    const openNotebook = DOCUMENT;

    const pageWidth = parseInt(openNotebook.pageConfig.size.width);
    const pageHeight = parseInt(openNotebook.pageConfig.size.height);
    const viewBoxWidth = pageWidth * PIXELS_PER_INCH;
    const viewBoxHeight = pageHeight * PIXELS_PER_INCH;

    const topMargin = openNotebook.pageConfig.margins.top;
    const leftMargin = openNotebook.pageConfig.margins.left;
    for (const pageData of openNotebook.pages) {
      const $page = $newSvg({
        tag: 'svg',
        appendTo: this.$elt,
        attrs: {
          viewBox: `0 0 ${viewBoxWidth} ${viewBoxHeight}`,
        },
        class: 'page',
        id: pageData.id,
        listeners: {
          click: e=>this.onPageClicked(e),
          dblclick: e=>this.onPageDoubleClicked(e),
        },
      });

      let y: number = parseInt(topMargin);
      for (const cellData of pageData.cells) {
        // Cell.create(this.$cellView, cellData);
        $newSvg<'use'>({
          tag: 'use',
          // TODO: parse unit from page config.
          attrs: { href: `#${cellData.id}`, x: leftMargin, y: `${y}in` },
          appendTo: $page,
        });
        y += parseInt(cellData.size.height);
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
    console.error("Page double clicked not yet implemented.")
  }

}
