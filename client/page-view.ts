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

import { $newSvg } from './dom.js';
import { NotebookView } from './notebook-view.js';
import { Sidebar } from './sidebar.js';

/* TEMPORARY */ import { DOCUMENT } from './notebook.js';

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

// Global Variables

// Class

export class PageView {

  // Class Methods

  public static attach($elt: HTMLDivElement, type: PageViewType): PageView {
    return new this($elt, type);
  }

  // Instance Methods

  public connect(notebookView: NotebookView, sidebar: Sidebar): void {
    this.notebookView = notebookView;
    this.sidebar = sidebar;
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

    const $pages: NodeListOf<SVGSVGElement> = this.$elt.querySelectorAll('.page');
    for (const $page of $pages) {
      $page.style.width = `${pageWidth}px`;
      $page.style.height = `${pageHeight}px`;
      $page.style.margin = `${pageMargin}px 0 0 ${pageMargin}px`;
    }
  }

  // -- PRIVATE --

  // Constructor

  private constructor($elt: HTMLDivElement, type: PageViewType) {
    this.$elt = $elt;
    const ptd = PAGE_TYPE_DATA.get(type)!;
    this.marginPercent = ptd.marginPercent;
    this.pagesPerRow = ptd.pagesPerRow;
  }

  // Private Instance Properties

  private $elt: HTMLDivElement;
  private marginPercent: number;
  private notebookView!: NotebookView;
  private pagesPerRow: number;
  private sidebar!: Sidebar;

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
      const $page = $newSvg('svg', {
        appendTo: this.$elt,
        attrs: {
          viewBox: `0 0 ${viewBoxWidth} ${viewBoxHeight}`,
        },
        class: 'page',
        id: pageData.id,
      });
      // TODO: Add event listeners in $newSvg above.
      // TODO: Catch exceptions in event handlers.
      $page.addEventListener('click', e=>this.onPageClicked(e));
      $page.addEventListener('dblclick', e=>this.onPageDoubleClicked(e));

      let y: number = parseInt(topMargin);
      for (const cellData of pageData.cells) {
        // Cell.create(this.$cellView, cellData);
        $newSvg<SVGUseElement>('use', {
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
    for (const $otherPage of this.$elt.querySelectorAll<SVGSVGElement>('.page')) {
      if ($otherPage == $page) { continue; }
      $otherPage.classList.remove('selected');
    }

    // Select the page that was clicked on.
    $page.classList.add('selected');
  }

  private onPageDoubleClicked(event: MouseEvent): void {
    // TODO: double-click on thumbnail should go to page, not cells.
    const $page = <SVGSVGElement>event.target;
    console.log(`Page double clicked: ${$page.id}`);
    this.sidebar.switchView('notebook');
    this.notebookView.scrollPageIntoView($page.id);
  }

}
