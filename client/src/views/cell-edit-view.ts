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

// import * as debug1 from "debug";
// const debug = debug1('client:cell-base');

import { CellObject, CellId } from "../shared/cell";
import { assert, Html, CssClass, notImplemented } from "../shared/common";
import { NotebookUpdate } from "../shared/server-responses";
// import { MoveCell } from "../../../../shared/client-requests";

import { HtmlElement } from "../html-element";
import {
  $new, CLOSE_X_ENTITY, ElementId, HtmlElementOrSpecification, HtmlElementSpecification
} from "../dom";
import { reportError } from "../error-handler";

import { Tools } from "../screens/notebook-edit-screen/tools";
import { ResizerBar } from "../components/resizer-bar";
import { CellView, ClientCell } from "../client-cell";


// Types

interface CellDragData {
  cellId: CellId;
}

// Constants

const CELL_MIME_TYPE = 'application/vnd.mathtablet.cell';

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

  public abstract onUpdate(change: NotebookUpdate, ownRequest: boolean): void;

  // --- PRIVATE ---

  // Private Constructor

  protected constructor(
    cell: ClientCell<O>,
    contentSpec: HtmlElementOrSpecification,
  ) {

    const $leftMargin = $new<'div'>({
      tag: 'div',
      class: <CssClass>'leftMargin',
    });

    const $rightMargin = $new<'div'>({
      tag: 'div',
      class: <CssClass>'rightMargin',
      children: [
        {
          tag: 'button',
          attrs: { tabindex: -1 },
          classes:[ <CssClass>'deleteCellButton', <CssClass>'iconButton' ],
          html: CLOSE_X_ENTITY,
          listeners: {
            click: e=>this.onDeleteCellButtonClicked(e),
          },
        },{
          tag: 'div',
          attrs: { draggable: true },
          class: <CssClass>'dragIcon',
          html: <Html>"&equiv;",
          listeners: {
            dragend: e=>this.onDragEnd(e),
            dragstart: e=>this.onDragStart(e),
          },
          style: "width:16px;height:16px",
        }
      ],
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

    const resizerBar = new ResizerBar((deltaY: number, final: boolean)=>this.onResize(deltaY, final), ()=>this.onInsertCellBelow());

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

    this.cell = cell;
  }

  // Private Instance Properties

  protected $content: HTMLDivElement;

  // Private Instance Methods

  // Private Event Handlers

  private onClicked(_event: MouseEvent): void {
    notImplemented();
    // Note: Shift-click or ctrl-click will extend the current selection.
    // this.container.selectCell(this, event.shiftKey, event.metaKey);
  }

  private onDeleteCellButtonClicked(_event: MouseEvent): void {
    this.cell.removeFromNotebook().catch(err=>{
      // TODO: Better handling of this error.
      reportError(err, <Html>"Error deleting cell");
    });
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

  private onInsertCellBelow(): void {
    notImplemented();
    // this.container.insertFigureCellBelow(this.cellId).catch(err=>{
    //   // TODO: Better handling of this error.
    //   reportError(err, <Html>"Error inserting cell below");
    // });
  }

  protected abstract onResize(deltaY: number, final: boolean): void;

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
