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

import { CssClass } from "../../shared/css";
import { $new, CLOSE_X_ENTITY } from "../../dom";
import { HtmlElement } from "../../html-element";
import { NotebookEditScreen } from ".";

// Types

// Constants

// Global Variables

// Class

export class DebugPopup extends HtmlElement<'div'>{

  // Class Methods

  // Public Constructor

  public constructor(screen: NotebookEditScreen) {
    const $content = $new({
      tag: 'div',
      class: <CssClass>'content',
      listeners: { click: e=>this.onContentClick(e) , }
    });
    super({
      tag: 'div',
      class: <CssClass>'debugPopup',
      children: [
        {
          tag: 'button',
          class: <CssClass>'close',
          html: CLOSE_X_ENTITY,
          syncButtonHandler: e=> this.onCloseClick(e),
        },
        $content
      ],
      hidden: true,
    });
    this.$content = $content;
    this.screen = screen;
  }

  // Instance Methods

  // -- PRIVATE --

  // Private Instance Properties

  private $content: HTMLDivElement;
  private screen: NotebookEditScreen;

  // Private Instance Property Functions

  // Private Instance Methods

  // Private Instance Event Handlers

  protected /* override */ onAfterHide(): void {
    super.onAfterHide();
    this.$content.innerHTML = '';
  }

  protected /* override */ onBeforeShow(): void {
    super.onBeforeShow();
    this.$content.innerHTML = this.screen.notebook.toDebugHtml();
  }

  private onCloseClick(_event: MouseEvent): void { this.hide(); }

  private onContentClick(event: MouseEvent): void {
    const $target: HTMLElement = <HTMLElement>event.target;
    if ($target.tagName == 'SPAN') {
      if ($target.classList.contains('collapsed')) {
        (<HTMLElement>$target.nextElementSibling).style.display = 'block';
        $target.classList.remove('collapsed');
        $target.classList.add('expanded');
      } else if ($target.classList.contains('expanded')) {
        (<HTMLElement>$target.nextElementSibling).style.display = 'none';
        $target.classList.remove('expanded');
        $target.classList.add('collapsed');
      }
    }
  }

}
