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
const debug = debug1('client:cell-edit-view');

import { CellObject, CellId, CellRelativePosition, CellPosition } from "../../../../shared/cell";
import { assert, Html, ElementId } from "../../../../shared/common";
import { CssClass, CssLength, CssSize, LengthInPixels, joinCssLength } from "../../../../shared/css";
import { CellDeleted, NotebookUpdate } from "../../../../shared/server-responses";
import { Stroke, StrokeId } from "../../../../shared/stylus";
import { notebookUpdateSynopsis } from "../../../../shared/debug-synopsis";

// import { DebugConsole } from "../../components/debug-console";
import { HtmlElement } from "../../../../html-element";
import { $new, HtmlElementOrSpecification, } from "../../../../dom";
import { showError } from "../../../../user-message-dispatch";

import { CellView, ClientCell } from "../../../../models/client-cell";
import { StrokePanel, StrokePanelCallbacks, StylusMode } from "./stroke-panel";

import { NotebookEditView } from "..";

import { CallbackFunctions as ResizerCallbackFunctions, ResizerBar } from "./resizer-bar";
import { SuggestionPanel } from "./suggestion-panel";
import { CELL_ICONS, smallSvgIcon } from "../../../../svg-icons";

// Types

interface CellDragData {
  cellId: CellId;
}

// Constants

const CELL_MIME_TYPE = 'application/vnd.eulernotebook.cell';

// Exported Class

// Exported Class

export abstract class CellEditView<O extends CellObject> extends HtmlElement<'div'> implements CellView {

  // Public Class Constants

  // static MISSING_ERROR = "<i>No primary representation.</i>";

  // Public Class Methods

  // Public Instance Properties

  public cell: ClientCell<O>;

  // Public Instance Property Functions

  public get id(): CellId { return this.cell.id; }

  public isLastCell(): boolean { return this.cell.isLastCell(); }

  public isSelected(): boolean {
    return this.$elt.classList.contains('selected');
  }

  public /* overridable */ set stylusMode(value: StylusMode) {
    if (this.strokePanel) {
      this.strokePanel.stylusMode = value;
    }
  }

  // Public Instance Methods

  public scrollIntoView(): void {
    this.$elt.scrollIntoView();
  }

  public select(): void {
    this.$elt.classList.add('selected');
  }

  public unselect(): void {
    this.$elt.classList.remove('selected');
  }

  // CellView Methods

  public onUpdate(update: NotebookUpdate, ownRequest: boolean): void {
    debug(`onUpdate ${notebookUpdateSynopsis(update)}`);
    switch (update.type) {
      case 'cellResized': {
        this.$content.style.height = update.cssSize.height;
        this.$content.style.width = update.cssSize.width;
        break;
      }
      case 'suggestionAdded':
      case 'suggestionRemoved': {
        this.suggestionPanel.onUpdate(update, ownRequest);
        break;
      }
      default: /* Nothing to do. */ break;
    }

    if (this.strokePanel) {
      this.strokePanel.onUpdate(update, ownRequest);
    }
  };

  // Public Instance Event Handlers

  public onCellDeleted(_update: CellDeleted): void {
    // REVIEW: Remove our "view" from the cell?
    this.$elt.remove();
  }

  // --- PRIVATE ---

  // Private Constructor

  protected constructor(
    notebookEditView: NotebookEditView,
    cell: ClientCell<O>,
    $content: HTMLDivElement,
    includeStrokePanel: boolean = true,
  ) {

    const iconId = CELL_ICONS.get(cell.obj.type)!;
    assert(iconId);

    const $leftMargin = $new<'div'>({
      tag: 'div',
      class: <CssClass>'leftMargin',
      children: [{
        tag: 'div',
        classes: [ <CssClass>'cellIcon', <CssClass>'iconButton' ],
        html: smallSvgIcon(iconId),
      }],
    });

    const rightMarginChildren: HtmlElementOrSpecification[] = [
      {
        tag: 'button',
        class: <CssClass>'iconButton',
        attrs: { tabindex: -1 },
        html: smallSvgIcon('iconMonstrInfo6'),
        syncButtonHandler: (e: MouseEvent)=>this.onSuggestionsButtonClicked(e),
      }, {
        tag: 'div',
        attrs: { draggable: true },
        classes: [ <CssClass>'dragIcon', <CssClass>'iconButton' ],
        html: smallSvgIcon('iconMonstrCursor19'),
        listeners: {
          dragend: e=>this.onDragEnd(e),
          dragstart: e=>this.onDragStart(e),
        },
      }, {
        tag: 'button',
        classes:[ <CssClass>'deleteButton', <CssClass>'iconButton' ],
        attrs: { tabindex: -1 },
        html: smallSvgIcon('iconMonstrTrashcan2'),
        asyncButtonHandler: e=>this.onDeleteButtonClicked(e),
      }
    ];
    const $rightMargin = $new<'div'>({
      tag: 'div',
      class: <CssClass>'rightMargin',
      children: rightMarginChildren,
    });

    const $main = $new({
      tag: 'div',
      class: <CssClass>'main',
      children: [ $leftMargin, $content, $rightMargin ],
    });

    const resizerCallbackFunctions: ResizerCallbackFunctions = {
      cancel: ()=>this.onResizerCancel(),
      down: ()=>this.onResizerDown(),
      insert: ()=>this.onInsertCell(),
      move: (deltaY: number)=>this.onResizerMove(deltaY),
      up: (deltaY: LengthInPixels)=>this.onResizerUp(deltaY),
    };
    const resizerBar = new ResizerBar(resizerCallbackFunctions);

    const suggestionPanel = new SuggestionPanel<O>(cell);

    super({
      tag: 'div',
      attrs: { tabindex: 0 },
      class: <CssClass>'cell',
      id: <ElementId>`C${cell.obj.id}`,
      children:[
        $main,
        resizerBar.$elt,
        suggestionPanel.$elt,
      ],
      asyncListeners: {
        drop: e=>this.onDrop(e),
      },
      listeners: {
        // click: e=>this.onClicked(e),
        dragenter: e=>this.onDragEnter(e),
        dragover: e=>this.onDragOver(e),
      },
    });

    this.$content = $content;
    this.$main = $main;
    this.suggestionPanel = suggestionPanel;
    this.cell = cell;
    this.notebookEditView = notebookEditView;

    if (includeStrokePanel) {
      // Create a "stroke panel" for displaying and capturing stylus strokes
      const drawStroke = async (stroke: Stroke): Promise<void>=>{
        await this.cell.insertStrokeRequest(stroke)
      };
      const eraseStroke = async (strokeId: StrokeId): Promise<void>=>{
        await this.cell.deleteStrokeRequest(strokeId);
      };
      const callbacks: StrokePanelCallbacks = { drawStroke, eraseStroke };
      this.strokePanel = new StrokePanel(cell.obj, callbacks, notebookEditView.stylusMode);
      $content.append(this.strokePanel.$elt);
    }

    cell.addView(this);
  }

  // Private Instance Properties

  protected $content: HTMLDivElement;
  protected suggestionPanel: SuggestionPanel<O>;
  protected notebookEditView: NotebookEditView;

  private $main: HTMLDivElement;
  private resizingInitialHeight?: LengthInPixels;
  private strokePanel?: StrokePanel;

  // Private Instance Property Functions

  // Private Instance Methods

  // Private Instance Event Handlers

  private async onDeleteButtonClicked(event: MouseEvent): Promise<void> {
    event.stopPropagation(); // Prevent our own 'onClicked' handler from being called.
    debug(`onDeleteCellButtonClicked`);
    // TODO: Make the provisional change by hiding ourself? Or notify our container to hide us?
    await this.cell.deleteRequest();
  }

  private onDragEnd(_event: DragEvent): void {
    // DebugConsole.addMessage(<Html>`Drag end: ${_event.dataTransfer?.dropEffect}`);
  }

  private onDragEnter(event: DragEvent): void {
    // DebugConsole.addMessage(<Html>"Drag enter");

    // REVIEW: Very odd. If we try to get the data from the data transfer object we get an empty string
    //         even though the dataTranspfer.types array indicates that the data is there.
    //         So we can't make any decisions based on the data itself.
    // const cellDragData = getDragData(event);

    const dropAllowed = hasDragData(event);
    if (!dropAllowed) {
      // DebugConsole.addMessage(<Html>`Drag enter: aborting, no ${CELL_MIME_TYPE} data.`);
      return;
    }

    // Allow a drop by preventing the default action.
    event.preventDefault();
    // REVIEW: Set event.dataTransfer.dropEffect?
  }

  private onDragOver(event: DragEvent): void {
    // REVIEW: See review comment in onDragEnter. Getting the drag data from the event.dataTransfer fails.
    const dropAllowed = hasDragData(event);
    if (!dropAllowed) {
      // DebugConsole.addMessage(<Html>`Drag over: aborting, no ${CELL_MIME_TYPE} data.`);
      return;
    }

    // Allow a drop by preventing the default action.
    event.preventDefault();
  }

  private onDragStart(event: DragEvent): void {
    // DebugConsole.addMessage(<Html>"Drag start");
    const cellDragData: CellDragData = {
      cellId: this.id,
    }
    // TODO: Other data types: LaTeX, SVG, text/plain, text/uri-list etc.
    setDragData(event, cellDragData);
    event.dataTransfer!.effectAllowed = 'all';
  }

  private async onDrop(event: DragEvent): Promise<void> {
    // TODO: Allow dropping on area below last cell.
    // DebugConsole.addMessage(<Html>"Dropping.");
    const cellDragData = getDragData(event);
    if (!cellDragData) { return; }
    debug(`Dropped style ${cellDragData.cellId} onto style ${this.id}`);
    await this.notebookEditView.moveCellRequest(cellDragData.cellId, this.id);
  }

  private async onInsertCell(): Promise<void> {
    const afterId: CellRelativePosition = (this.isLastCell() ? CellPosition.Bottom : this.id);
    await this.notebookEditView.insertCellRequest(afterId);
  }

  private onResizerCancel(): void {
    debug(`onResizerCancel`);
    delete this.resizingInitialHeight;
    this.$main.style.removeProperty('height');
  }

  private onResizerDown(): void {
    debug(`onResizerDown`);
    assert(!this.resizingInitialHeight);
    const style = window.getComputedStyle(this.$main);
    const cssHeight = <CssLength>style.height;
    assert(cssHeight.endsWith('px'));
    this.resizingInitialHeight = parseInt(cssHeight.slice(0,-2), 10);
  }

  private onResizerMove(deltaY: LengthInPixels): void {
    debug(`onResizerMove: ${this.resizingInitialHeight} ${deltaY}`);
    assert(this.resizingInitialHeight);
    const newHeight = this.resizingInitialHeight!+deltaY;
    this.$main.style.height = `${newHeight}px`;

    //console.dir(this.$main.style.height);
    //console.dir(this.$main.offsetHeight);

    // const $svgPanel = $svg<'svg'>(this.$elt, '.svgPanel');
    // const currentHeight = parseInt($svgPanel.getAttribute('height')!.slice(0, -2), 10);
    // // TODO: resizer bar should enforce minimum.
    // // TODO: minimum height should be based on ink content.
    // const newHeight = Math.max(currentHeight + deltaY, 10);
    // const newHeightStr = <CssLength>`${newHeight}px`;
    // $svgPanel.setAttribute('height', newHeightStr);

    // // If the user has stopped resizing the cell, then submit a request to change the size of the cell.
    // // REVIEW: How can the user cancel the resizing? Pressing escape?
    // if (final) {
    // }
  }

  private onResizerUp(deltaY: LengthInPixels): void {
    debug(`onResizerUp: ${this.resizingInitialHeight} ${deltaY}`);

    assert(this.resizingInitialHeight);
    const newHeightInPixels = this.resizingInitialHeight!+deltaY;

    delete this.resizingInitialHeight;

    const width = this.cell.obj.cssSize.width;
    const height = joinCssLength(newHeightInPixels, 'px');
    const cssSize: CssSize = { width, height };
    // LATER: Some sort of visual indication that the resize request is outstanding.
    this.cell.resizeRequest(cssSize)
    .catch((err: Error)=>{
      // TODO: What to do here?
      showError(err, <Html>"Error submitting resize");
    })
    .finally(()=>{
      // REVIEW: What if new resizing starts before old resizing update returns?
      //         Do we need to keep track of an outstanding resize request?
      this.$main.style.removeProperty('height');
    });
  }

  private onSuggestionsButtonClicked(_event: MouseEvent): void {
    this.suggestionPanel.toggleVisibility();
  }
}

// Helper Functions

function getDragData(event: DragEvent): CellDragData|undefined {
  assert(event.dataTransfer);
  const json = event.dataTransfer!.getData(CELL_MIME_TYPE);
  if (!json) { return undefined; }
  const cellDragData = <CellDragData>JSON.parse(json);
  return cellDragData;
}

function hasDragData(event: DragEvent): boolean {
  return event.dataTransfer!.types.includes(CELL_MIME_TYPE);
}

function setDragData(event: DragEvent, cellDragData: CellDragData): void {
  assert(event.dataTransfer);
  const json = JSON.stringify(cellDragData);
  event.dataTransfer!.setData(CELL_MIME_TYPE, json);
  // TODO: Other data types: LaTeX, SVG, text/plain, text/uri-list etc.
}
