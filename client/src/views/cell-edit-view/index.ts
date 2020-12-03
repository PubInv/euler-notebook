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

// REVIEW: Files exporting a class should be named after the class exported. Rename this to cell-view.ts?

// Requirements

import * as debug1 from "debug";
const debug = debug1('client:cell-edit-view');

import { CellObject, CellId, CellType } from "../../shared/cell";
import {
  assert, Html, CssClass, notImplemented, CssLength, CssSize, LengthInPixels,
  PIXELS_PER_INCH, POINTS_PER_INCH
} from "../../shared/common";
import { NotebookUpdate } from "../../shared/server-responses";
// import { MoveCell } from "../../../../shared/client-requests";

import { HtmlElement } from "../../html-element";
import {
  $new, CLOSE_X_ENTITY, ElementId, HtmlElementOrSpecification, HtmlElementSpecification,
  SvgIconId,
  svgIconReferenceMarkup,
} from "../../dom";

import { Tools } from "../../screens/notebook-edit-screen/tools";
import { CallbackFunctions as ResizerCallbackFunctions, ResizerBar } from "../../components/resizer-bar";
import { CellView, ClientCell } from "../../client-cell";
import { logError, reportError } from "../../error-handler";
import { StrokeCallbackFn, StrokePanel } from "../../components/stroke-panel";
import { Stroke } from "../../shared/myscript-types";
import { NotebookEditView } from "../notebook-edit-view";

// Types

interface CellDragData {
  cellId: CellId;
}

// Constants

const CELL_MIME_TYPE = 'application/vnd.mathtablet.cell';

const CELL_ICONS: Map<CellType, SvgIconId> = new Map([
  [CellType.Figure, 'iconMonstrPencil9'],
  [CellType.Formula, 'iconMonstrCalculator2'],
  [CellType.Plot, 'iconMonstrChart20'],
  [CellType.Text, 'iconMonstrText1'],
]);

// Exported Class

// Exported Class

export abstract class CellEditView<O extends CellObject> extends HtmlElement<'div'> implements CellView {

  // Public Class Constants

  static MISSING_ERROR = "<i>No primary representation.</i>";

  // Public Class Methods

  // Public Instance Properties

  public cell: ClientCell<O>;

  // Public Instance Property Functions

  public get id(): CellId { return this.cell.id; }

  public isSelected(): boolean {
    return this.$elt.classList.contains('selected');
  }

  // Public Instance Methods

  public renderTools(tools: Tools): void {
    tools.clear();
    tools.render(this.id);
  }

  public scrollIntoView(): void {
    this.$elt.scrollIntoView();
  }

  public select(): void {
    this.$elt.classList.add('selected');
  }

  public unselect(): void {
    this.$elt.classList.remove('selected');
  }

  // Overridable ClientNotebookWatcher Methods

  public onUpdate(update: NotebookUpdate, ownRequest: boolean): void {
    this.strokePanel.onUpdate(update, ownRequest);
    // switch (update.type) {
    //   default: /* Nothing to do. */ break;
    // }
  };

  // --- PRIVATE ---

  // Private Constructor

  protected constructor(
    notebookEditView: NotebookEditView,
    cell: ClientCell<O>,
    contentSpec: HtmlElementOrSpecification,
  ) {

    const iconId = CELL_ICONS.get(cell.obj.type)!;
    assert(iconId);

    const $leftMargin = $new<'div'>({
      tag: 'div',
      class: <CssClass>'leftMargin',
      children: [
        {
          tag: 'div',
          attrs: { draggable: true },
          class: <CssClass>'dragIcon',
          html: <Html>"&equiv;",
          listeners: {
            dragend: e=>this.onDragEnd(e),
            dragstart: e=>this.onDragStart(e),
          },
        },
        {
          tag: 'div',
          class: <CssClass>'cellIcon',
          html: svgIconReferenceMarkup(iconId),
        },
      ],
    });

    const $rightMargin = $new<'div'>({
      tag: 'div',
      class: <CssClass>'rightMargin',
      children: [{
        tag: 'button',
        attrs: { tabindex: -1 },
        classes:[ <CssClass>'deleteButton', <CssClass>'entityButton' ],
        html: CLOSE_X_ENTITY,
        asyncListeners: {
          click: e=>this.onDeleteButtonClicked(e),
        },
      }],
    });

    const contentInstantiated = contentSpec instanceof HTMLElement || contentSpec instanceof SVGElement;
    const $content: HTMLDivElement = (!contentInstantiated ?  $new<'div'>(<HtmlElementSpecification<'div'>>contentSpec): <HTMLDivElement>contentSpec);

    const $main = $new({
      tag: 'div',
      class: <CssClass>'main',
      children: [
        $leftMargin,
        $content,
        $rightMargin,
      ],
    });

    const resizerCallbackFunctions: ResizerCallbackFunctions = {
      cancel: ()=>this.onResizerCancel(),
      down: ()=>this.onResizerDown(),
      insert: ()=>this.onInsertCell(),
      move: (deltaY: number)=>this.onResizerMove(deltaY),
      up: (deltaY: LengthInPixels)=>this.onResizerUp(deltaY),
    };
    const resizerBar = new ResizerBar(resizerCallbackFunctions);

    super({
      tag: 'div',
      attrs: { tabindex: 0 },
      class: <CssClass>'cell',
      id: <ElementId>`C${cell.obj.id}`,
      children:[
        $main,
        resizerBar.$elt,
      ],
      listeners: {
        click: e=>this.onClicked(e),
        dragenter: e=>this.onDragEnter(e),
        dragover: e=>this.onDragOver(e),
        drop: e=>this.onDrop(e),
      },
    });

    this.$content = $content;
    this.$main = $main;
    this.cell = cell;
    this.notebookEditView = notebookEditView;

    const callbackFn: StrokeCallbackFn = async (stroke: Stroke)=>{
      this.cell.insertStroke(stroke)
      .catch(err=>{
        // REVIEW: Proper way to handle this error?
        logError(err, <Html>"Error sending stroke from text cell");
      });
    };
    this.strokePanel = new StrokePanel(cell.obj.cssSize, cell.obj.strokeData, callbackFn);

    $content.append(this.strokePanel.$elt);

    cell.addView(this);
  }

  // Private Instance Properties

  protected $content: HTMLDivElement;
  private $main: HTMLDivElement;
  private resizingInitialHeight?: LengthInPixels;
  private notebookEditView: NotebookEditView;
  private strokePanel: StrokePanel;

  // Private Instance Property Functions

  // Private Instance Methods

  // private createKeyboardSubpanel(cellObject: TextCellObject): KeyboardPanel {
  //   const textChangeCallback: KeyboardCallbackFn = (_start: number, _end: number, _replacement: PlainText, _value: PlainText): void =>{
  //     notImplemented();
  //     // const changeRequest: KeyboardInputRequest = { type: 'keyboardInputChange', cellId: style.id, start, end, replacement, value, };
  //     // this.container.screen.notebook.sendCellChangeRequest(changeRequest)
  //     // .catch(err=>{
  //     //   logError(err, <Html>"Error sending keyboardInputChange from text cell");
  //     // });
  //   }
  //   return new KeyboardPanel(cellObject.inputText, textChangeCallback);
  // }

  // Private Event Handlers

  private onClicked(_event: MouseEvent): void {
    debug(`onClicked`);
    console.warn("Click to select not implemented.");
    // Note: Shift-click or ctrl-click will extend the current selection.
    // this.container.selectCell(this, event.shiftKey, event.metaKey);
  }

  private async onDeleteButtonClicked(event: MouseEvent): Promise<void> {
    event.preventDefault(); // Don't take focus.
    event.stopPropagation(); // Prevent our own 'onClicked' handler from being called.
    debug(`onDeleteCellButtonClicked`);
    // TODO: Make the provisional change by hiding ourself? Or notify our container to hide us?
    await this.cell.delete();
  }

  private onDragEnd(_event: DragEvent): void {
    // console.log(`Drag end: ${event.dataTransfer?.dropEffect}`)
  }

  private onDragEnter(event: DragEvent): void {
    // console.log("Drag enter");

    // REVIEW: Very odd. If we try to get the data from the data transfer object we get an empty string
    //         even though the dataTranspfer.types array indicates that the data is there.
    //         So we can't make any decisions based on the data itself.
    // const cellDragData = getDragData(event);

    const dropAllowed = hasDragData(event);
    if (!dropAllowed) {
      console.warn(`Drag enter: aborting, no ${CELL_MIME_TYPE} data.`);
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
      console.warn(`Drag over: aborting, no ${CELL_MIME_TYPE} data.`);
      return;
    }

    // Allow a drop by preventing the default action.
    event.preventDefault();
  }

  private onDragStart(event: DragEvent): void {
    // console.log("Drag start");
    const cellDragData: CellDragData = {
      cellId: this.id,
    }
    // TODO: Other data types: LaTeX, SVG, text/plain, text/uri-list etc.
    setDragData(event, cellDragData);
    event.dataTransfer!.effectAllowed = 'all';
  }

  private onDrop(_event: DragEvent): void {
    notImplemented();
    // const cellDragData = getDragData(event);
    // if (!cellDragData) { return; }
    // // console.log(`Dropped style ${cellDragData.cellId} onto style ${this.cellId}`);

    // const c = this.container.screen.notebook.compareCellPositions(cellDragData.cellId, this.cellId);
    // if (c==0) { /* Dropped onto self */ return; }

    // // If dragging down, then put dragged cell below the cell that was dropped on.
    // // If dragging up, then put dragged cell above the cell that was dropped on.
    // const afterId = c<0 ? this.cellId : this.container.screen.notebook.precedingCellId(this.cellId);
    // const moveRequest: MoveCell = {
    //   type: 'moveCell',
    //   cellId: cellDragData.cellId,
    //   afterId,
    // }
    // this.container.editStyle([ moveRequest ])
    // .catch((err: Error)=>{
    //   // TODO: What to do here?
    //   reportError(err, <Html>"Error moving style for drag/drop");
    // });
  }

  private onInsertCell(): void {
    this.notebookEditView.insertCell(this.id).catch((err: Error)=>{
      // TODO: Better handling of this error.
      reportError(err, <Html>"Error inserting cell");
    });
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
    const newHeightInPoints = Math.round(newHeightInPixels * POINTS_PER_INCH / PIXELS_PER_INCH);

    delete this.resizingInitialHeight;

    // TODO: Convert pixels to points
    const width = this.cell.obj.cssSize.width;
    const height = <CssLength>`${newHeightInPoints}pt`;
    const cssSize: CssSize = { width, height };
    // LATER: Some sort of visual indication that the resize request is outstanding.
    this.cell.resize(cssSize)
    .catch((err: Error)=>{
      // TODO: What to do here?
      reportError(err, <Html>"Error submitting resize");
    })
    .finally(()=>{
      // REVIEW: What if new resizing starts before old resizing update returns?
      //         Do we need to keep track of an outstanding resize request?
      this.$main.style.removeProperty('height');
    });
  }

}

// Helper Functions

// function getDragData(event: DragEvent): CellDragData|undefined {
//   assert(event.dataTransfer);
//   const json = event.dataTransfer!.getData(CELL_MIME_TYPE);
//   if (!json) { return undefined; }
//   const cellDragData = <CellDragData>JSON.parse(json);
//   return cellDragData;
// }

function hasDragData(event: DragEvent): boolean {
  return event.dataTransfer!.types.includes(CELL_MIME_TYPE);
}

function setDragData(event: DragEvent, cellDragData: CellDragData): void {
  assert(event.dataTransfer);
  const json = JSON.stringify(cellDragData);
  event.dataTransfer!.setData(CELL_MIME_TYPE, json);
  // TODO: Other data types: LaTeX, SVG, text/plain, text/uri-list etc.
}
