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

import { $, Html, $new, CLOSE_X_ENTITY } from './dom';

// Types

// Constants

// Global Variables

// Class

export class DebugPopup {

  // Class Methods

  public static create($parent: HTMLElement): DebugPopup {
    return new this($parent);
  }

  // Instance Methods

  public hide(): void {
    this.$elt.style.display = 'none';
  }

  public show(html: Html): void {
    const $content = $(this.$elt, '.content');
    $content.innerHTML = html;
    this.$elt.style.display = 'block';
  }

  // -- PRIVATE --

  // Constructor

  private constructor($parent: HTMLElement) {
    this.$elt = $new({
      tag: 'div',
      appendTo: $parent,
      class: 'debugPopup',
      children: [
        {
          tag: 'button',
          class: 'close',
          html: CLOSE_X_ENTITY,
          listeners: { click: e=> this.onCloseClick(e), }
        }, {
          tag: 'div',
          appendTo: $parent,
          class: 'content',
          listeners: { click: e=>this.onContentClick(e) , }
        }
      ],
      hidden: true,
    });
  }

  // Private Instance Properties

  private $elt: HTMLDivElement;

  // Private Instance Property Functions

  // Private Instance Methods

  // Private Event Handlers

  private onCloseClick(_event: MouseEvent): void {
    this.hide();
    // LATER: this.header.enableDebugButton(true);
  }

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
