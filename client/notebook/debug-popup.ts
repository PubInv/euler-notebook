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

import { $configure } from '../dom.js';
import { ClientNotebook } from './client-notebook.js';
import { Header } from './header.js';

// Types

// Constants

// Global Variables

// Class

export class DebugPopup {

  // Class Methods

  public static attach($elt: HTMLDivElement): DebugPopup {
    return new this($elt);
  }

  // Instance Methods

  public connect(header: Header, openNotebook: ClientNotebook): void {
    this.header = header;
    this.openNotebook = openNotebook;
  }

  public hide(): void {
    this.$content.innerHTML = '';
    this.$elt.style.display = 'none';
  }

  public show(): void {
    this.$content.innerHTML = this.openNotebook.toHtml();
    this.$elt.style.display = 'block';
  }

  // -- PRIVATE --

  // Constructor

  private constructor($elt: HTMLDivElement) {
    this.$elt = $elt;
    this.$closeButton = $elt.querySelector<HTMLButtonElement>('.close')!;
    this.$content = $elt.querySelector<HTMLDivElement>('.content')!;

    $configure(this.$content, { listeners: { 'click': e=>this.onContentClick(e) }});
    $configure(this.$closeButton, { listeners: { 'click': e=> this.onCloseClick(e) }});
  }

  // Private Instance Properties

  private $elt: HTMLDivElement;
  private $content: HTMLDivElement;
  private $closeButton: HTMLButtonElement;

  private header!: Header;
  private openNotebook!: ClientNotebook

  // Private Instance Property Functions

  // Private Instance Methods

  // Private Event Handlers

  private onCloseClick(_event: MouseEvent): void {
    this.hide();
    this.header.enableDebugButton(true);
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
