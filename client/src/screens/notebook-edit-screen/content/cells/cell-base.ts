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

import { Content } from "..";
import { StyleObject, StyleId, NotebookChange } from "../../../../shared/notebook";
import { Tools } from "../../tools";
import { HtmlElement } from "../../../../html-element";
import { ElementClass, ElementId, HtmlElementOrSpecification } from "../../../../dom";

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
    content: Content,
    style: StyleObject,
    subclass: ElementClass,
    children: HtmlElementOrSpecification[],
  ) {

    super({
      tag: 'div',
      attrs: { tabindex: 0 },
      classes: [ <ElementClass>'cell', subclass ],
      id: <ElementId>`C${style.id}`,
      children,
      listeners: {
        'click': e=>this.onClicked(e),
      },
    });

    this.content = content;
    this.styleId = style.id;
  }

  // Private Instance Properties

  protected content: Content;

  // Private Instance Methods

  // Private Event Handlers

  private onClicked(event: MouseEvent): void {
    // Note: Shift-click or ctrl-click will extend the current selection.
    this.content.selectCell(this, event.shiftKey, event.metaKey);
  }

}
