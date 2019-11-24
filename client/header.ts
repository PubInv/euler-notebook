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

import { configure } from './dom.js';
import { DebugPopup } from './debug-popup.js';

// Types

// Constants

// Global Variables

// Class

export class Header {

  // Class Methods

  public static attach($elt: HTMLDivElement): Header {
    return new this($elt);
  }

  // Instance Methods

  public connect(debugPopup: DebugPopup): void {
    this.debugPopup = debugPopup;
  }

  public enableDebugButton(enable: boolean): void {
    this.$debugButton.disabled = !enable;
  }

  // -- PRIVATE --

  // Constructor

  private constructor($elt: HTMLDivElement) {
    this.$debugButton = $elt.querySelector<HTMLButtonElement>('#debugButton')!;
    configure(this.$debugButton, { listeners: { click: e=>this.onDebugButtonClicked(e) } });
  }

  // Private Instance Properties

  private $debugButton: HTMLButtonElement;
  private debugPopup!: DebugPopup

  // Private Instance Methods

  // Private Event Handlers

  private onDebugButtonClicked(_event: MouseEvent): void {
    this.enableDebugButton(false);
    this.debugPopup.show();
  }

}
