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

// TODO: Add try/catch around all event entry points.

// Requirements

import { $, $newSvg } from './dom.js';
import { Cell, CellData, Length, Size } from './cell.js';

// Types

type CellId = string;
type PageId = string;

interface Document {
  pageConfig: PageConfig,
  pages: PageData[];
}

interface PageConfig {
  size: Size;
  margins: PageMargins;
}

interface PageData {
  id: string;
  cells: CellData[];
}

interface PageMargins {
  bottom: Length;
  left: Length;
  right: Length;
  top: Length;
}

// Constants

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

const PAGE_MARGIN_PCT = 0.025;
const PAGE_THUMBNAILS_PER_ROW = 4;
const THUMBNAIL_MARGIN_PCT = 0.10;
const PIXELS_PER_INCH = 96;

// Global Variables

let gApp: App;

// Stroke Class

// App Class

type View = 'cellView'|'thumbnailView'|'pageView'

class App {

  public static create($body: HTMLBodyElement): App {
    return new this($body);
  }

  // Private Constructor

  private constructor($body: HTMLBodyElement) {

    this.$body = $body;

    const that = this;
    $<HTMLButtonElement>('#thumbnailViewBtn').addEventListener('click', function(e: MouseEvent) { that.onButtonClickedView(<HTMLButtonElement>this, e) });
    $<HTMLButtonElement>('#pageViewBtn').addEventListener('click', function(e: MouseEvent) { that.onButtonClickedView(<HTMLButtonElement>this, e) });
    $<HTMLButtonElement>('#cellViewBtn').addEventListener('click', function(e: MouseEvent) { that.onButtonClickedView(<HTMLButtonElement>this, e) });
    $<HTMLButtonElement>('#undoBtn').addEventListener('click', e=>this.onButtonClickedUndo(e));
    $<HTMLButtonElement>('#redoBtn').addEventListener('click', e=>this.onButtonClickedRedo(e));

    const $cellView = this.$cellView = $<HTMLDivElement>('#cellView');
    const $pageView = this.$pageView = $<HTMLDivElement>('#pageView');

    const pageWidth = parseInt(DOCUMENT.pageConfig.size.width);
    const pageHeight = parseInt(DOCUMENT.pageConfig.size.height);
    const viewBoxWidth = pageWidth * PIXELS_PER_INCH;
    const viewBoxHeight = pageHeight * PIXELS_PER_INCH;

    const topMargin = DOCUMENT.pageConfig.margins.top;
    const leftMargin = DOCUMENT.pageConfig.margins.left;
    for (const pageData of DOCUMENT.pages) {
      const $page = $newSvg('svg', {
        appendTo: $pageView,
        attrs: {
          viewBox: `0 0 ${viewBoxWidth} ${viewBoxHeight}`,
        },
        class: 'page',
        id: pageData.id,
      });
      $page.addEventListener('click', e=>this.onPageClicked(e));
      $page.addEventListener('dblclick', e=>this.onPageDoubleClicked(e));

      let y: number = parseInt(topMargin);
      for (const cellData of pageData.cells) {
        Cell.create($cellView, cellData);
        $newSvg<SVGUseElement>('use', {
          // TODO: parse unit from page config.
          attrs: { href: `#${cellData.id}`, x: leftMargin, y: `${y}in` },
          appendTo: $page,
        });
        y += parseInt(cellData.size.height);
      }
    }

    const initialView: View = (DOCUMENT.pages.length>1 ? 'thumbnailView' : 'pageView');
    // const initialView: View = 'cellView';
    this.switchView(initialView);
  }

  // Private Instance Properties

  private $body: HTMLBodyElement;
  private $cellView: HTMLDivElement;
  private $pageView: HTMLDivElement;

  private firstCellOfPage(pageId: PageId): CellId {
    // TODO: This will not work when cells can be added or removed.
    const pageData = DOCUMENT.pages.find(p=>p.id == pageId);
    if (!pageData) { throw new Error(`Page with ID not found: ${pageId}`); }
    const cellData = pageData.cells[0];
    return cellData.id;
  }

  // Private Instance Event Handlers

  private onButtonClickedView($button: HTMLButtonElement, _event: MouseEvent): void {
    const view: View = <View>$button.id.slice(0,-3);
    this.switchView(view);
  }

  private onButtonClickedRedo(_event: MouseEvent): void {
    console.log('TODO: Redo');
  }

  private onButtonClickedUndo(_event: MouseEvent): void {
    console.log('TODO: Undo');
  }

  private onPageClicked(event: MouseEvent): void {
    const $page = <SVGSVGElement>event.target;
    console.log(`Page double clicked: ${$page.id}`);

    // Unselect all other pages.
    // REVIEW: Use selector to select only selected pages?
    for (const $otherPage of this.$body.querySelectorAll<SVGSVGElement>('#pageView>.page')) {
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
    this.switchView('cellView');
    // TODO: This doesn't work of the page doesn't have any cells.
    const cellId = this.firstCellOfPage($page.id);
    const $cell = this.$cellView.querySelector<SVGSVGElement>(`#${cellId}`);
    $cell!.scrollIntoView({ block: 'start'});
  }

  // Private Instance Methods

  private resizePages(pagesPerRow: number, marginPct: number): void {

    // Calculate the size of the page thumbnails
    const pageAspectRatio = parseInt(DOCUMENT.pageConfig.size.width) / parseInt(DOCUMENT.pageConfig.size.height);
    const bodyViewRect = document.body.getBoundingClientRect();
    const sidebarWidth = 60; // TODO: Get from CSS.
    const viewWidth = bodyViewRect.width - sidebarWidth;
    let pageWidth = viewWidth / (pagesPerRow + (pagesPerRow+1)*marginPct);
    const pageHeight = Math.round(pageWidth / pageAspectRatio);
    const pageMargin = Math.round(pageWidth * marginPct);
    pageWidth = Math.round(pageWidth);

    // LATER: Update the stylesheet instead of each of the pages.
    // const stylesheet: CSSStyleSheet = <CSSStyleSheet>Array.from(document.styleSheets).find(s=>s.href && s.href.endsWith('drawing.css'));
    // const stylesheetRules: CSSStyleRule[] = <CSSStyleRule[]>Array.from(stylesheet.cssRules);
    // const pageRule = stylesheetRules.find(r=>r.selectorText == '.page')!;
    // pageRule.style.width = `${pageWidth}px`;
    // pageRule.style.height = `${pageHeight}px`;
    // pageRule.style.margin = `${pageMargin}px 0 0 ${pageMargin}px`;

    const $pages: NodeListOf<SVGSVGElement> = this.$pageView.querySelectorAll('.page');
    for (const $page of $pages) {
      $page.style.width = `${pageWidth}px`;
      $page.style.height = `${pageHeight}px`;
      $page.style.margin = `${pageMargin}px 0 0 ${pageMargin}px`;
    }
  }

  private switchView(newView: View) {
    switch(newView) {
      case 'cellView':
        $<HTMLDivElement>('#cellView').style.display = 'block';
        $<HTMLDivElement>('#pageView').style.display = 'none';
        $<HTMLButtonElement>('#cellViewBtn').disabled = true;
        $<HTMLButtonElement>('#pageViewBtn').disabled = false;
        $<HTMLButtonElement>('#thumbnailViewBtn').disabled = false;
        break;
      case 'pageView':
        $<HTMLDivElement>('#cellView').style.display = 'none';
        $<HTMLDivElement>('#pageView').style.display = 'block';
        $<HTMLButtonElement>('#cellViewBtn').disabled = false;
        $<HTMLButtonElement>('#pageViewBtn').disabled = true;
        $<HTMLButtonElement>('#thumbnailViewBtn').disabled = false;
        this.resizePages(1 /* page per row */, PAGE_MARGIN_PCT);
        break;
      case 'thumbnailView':
        $<HTMLDivElement>('#cellView').style.display = 'none';
        $<HTMLDivElement>('#pageView').style.display = 'block';
        $<HTMLButtonElement>('#cellViewBtn').disabled = false;
        $<HTMLButtonElement>('#pageViewBtn').disabled = false;
        $<HTMLButtonElement>('#thumbnailViewBtn').disabled = true;
        this.resizePages(PAGE_THUMBNAILS_PER_ROW, THUMBNAIL_MARGIN_PCT);
        break;
    }
  }
}

// Application Entry Point

async function onDomReady(_event: Event){
  try {
    console.log('onDomReady');
    gApp = App.create(<HTMLBodyElement>document.body);
    console.dir(gApp);
  } catch(err) {
    console.error(`Error in onDomReady: ${err.message}`);
  }
}

function main(){
  window.addEventListener('DOMContentLoaded', onDomReady);
}

main();

