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

import { Content } from "../index";
import { CssClass } from "../../../../shared/common";
import { StyleObject, StyleId, NotebookChange } from "../../../../shared/notebook";
import { Tools } from "../../tools";
import { HtmlElement } from "../../../../html-element";
import { $new, CLOSE_X_ENTITY, ElementId, HtmlElementOrSpecification } from "../../../../dom";
import { reportError } from "../../../../error-handler";
import { assert, Html } from "../../../../shared/common";
import { ResizerBar } from "../../../../resizer-bar";
import { StyleMoveRequest } from "../../../../shared/math-tablet-api";
import { ClientNotebook } from "../../../../client-notebook";

// Types

interface CellDragData {
  styleId: StyleId;
}

// Constants

const CELL_MIME_TYPE = 'application/vnd.mathtablet.cell';

// Exported Class

export abstract class CellBase extends HtmlElement<'div'>{

  // Class Constants

  static MISSING_ERROR = "<i>No primary representation.</i>";

  // Class Methods

  // Instance Properties

  public styleId: StyleId;

  // Instance Property Functions

  public isSelected(): boolean {
    return this.$elt.classList.contains('selected');
  }

  // Instance Methods

  // public abstract render(style: StyleObject): void;
  // {
  //   // get the primary representation
  //   let repStyle = this.view.screen.notebook.findStyle({ role: 'REPRESENTATION', subrole: 'PRIMARY' }, style.id);
  //   if (!repStyle) {
  //     // TODO: Look for renderable alternate representations
  //     this.$elt.innerHTML = CellBase.MISSING_ERROR;
  //     return;
  //   }

  //   switch(repStyle.type) {
  //     case 'IMAGE-URL': {
  //       const url: string = style.data;
  //       this.$elt.innerHTML = `<image src="${url}"/>`
  //       break;
  //     }
  //     case 'SVG-MARKUP': {
  //       this.$elt.innerHTML = repStyle.data;
  //       break;
  //     }
  //     default:
  //       assert(false, "TODO: Unrecognized representation type.");
  //       break;
  //   }
  // }

  public renderTools(tools: Tools): void {
    tools.clear();
    tools.render(this.styleId);
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

  // ClientNotebookWatcher Methods

  public abstract onChange(change: NotebookChange): void;

  public abstract onChangesFinished(): void;

  // PRIVATE

  // Private Constructor

  protected constructor(
    container: Content,
    style: StyleObject,
    child: HtmlElementOrSpecification,
  ) {

    const $leftMargin = $new<'div'>({
      tag: 'div',
      class: <CssClass>'leftMargin',
      html: <Html>'BUGBUG',
    });

    const $rightMargin = $new<'div'>({
      tag: 'div',
      class: <CssClass>'rightMargin',
      children: [
        {
          tag: 'button',
          attrs: { tabindex: -1 },
          class: <CssClass>'deleteCellButton',
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

    const $main = $new({
      tag: 'div',
      class: <CssClass>'main',
      children: [
        $leftMargin,
        child,
        $rightMargin,
      ],
    });

    const resizerBar = new ResizerBar((deltaY: number, final: boolean)=>this.onResize(deltaY, final), ()=>this.onInsertCellBelow());

    super({
      tag: 'div',
      attrs: { tabindex: 0 },
      class: <CssClass>'cell',
      id: <ElementId>`C${style.id}`,
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

    this.container = container;
    this.styleId = style.id;
  }

  // Private Instance Properties

  protected container: Content;

  // Private Instance Methods

  // Private Event Handlers

  private onClicked(event: MouseEvent): void {
    // Note: Shift-click or ctrl-click will extend the current selection.
    this.container.selectCell(this, event.shiftKey, event.metaKey);
  }

  private onDeleteCellButtonClicked(_event: MouseEvent): void {
    this.container.deleteTopLevelStyle(this.styleId).catch(err=>{
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
      styleId: this.styleId,
    }
    // TODO: Other data types: LaTeX, SVG, text/plain, text/uri-list etc.
    setDragData(event, cellDragData);
    event.dataTransfer!.effectAllowed = 'all';
  }

  private onDrop(event: DragEvent): void {
    const cellDragData = getDragData(event);
    if (!cellDragData) { return; }
    // console.log(`Dropped style ${cellDragData.styleId} onto style ${this.styleId}`);

    const c = this.container.screen.notebook.compareStylePositions(cellDragData.styleId, this.styleId);
    if (c==0) { /* Dropped onto self */ return; }

    // If dragging down, then put dragged cell below the cell that was dropped on.
    // If dragging up, then put dragged cell above the cell that was dropped on.
    const afterId = c<0 ? this.styleId : this.container.screen.notebook.precedingStyleId(this.styleId);
    const moveRequest: StyleMoveRequest = {
      type: 'moveStyle',
      styleId: cellDragData.styleId,
      afterId,
    }
    this.container.editStyle([ moveRequest ])
    .catch((err: Error)=>{
      // TODO: What to do here?
      reportError(err, <Html>"Error moving style for drag/drop");
    });
  }

  private onInsertCellBelow(): void {
    this.container.insertDrawingCellBelow(this.styleId).catch(err=>{
      // TODO: Better handling of this error.
      reportError(err, <Html>"Error inserting cell below");
    });
  }

  protected abstract onResize(deltaY: number, final: boolean): void;

}

// EXPORTED FUNCTIONS

export function isDisplayStyle(style: StyleObject, parentId: StyleId): boolean {
  return style.role == 'REPRESENTATION' && style.type == 'SVG-MARKUP' && style.parentId == parentId;
}

export function isInputStyle(style: StyleObject, parentId: StyleId): boolean {
  return style.role == 'INPUT' && style.parentId == parentId;
}

export function isStrokeSvgStyle(style: StyleObject, parentId: StyleId, notebook: ClientNotebook): boolean {
  let rval = false;
  if (style.role == 'REPRESENTATION' && style.type == 'SVG-MARKUP' && style.parentId != parentId) {
    const parentStyle = notebook.getStyle(style.parentId);
    if (parentStyle.role == 'INPUT' && parentStyle.type == 'STROKE-DATA' && parentStyle.parentId == parentId) {
      rval = true;
    }
  }
  return rval;
}

// HELPER FUNCTIONS

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
