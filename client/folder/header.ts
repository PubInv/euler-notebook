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

// TODO: Disable home button when we are on the home page.

// Requirements

import { $attach } from '../dom.js';

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

  public connect(): void { }

  // -- PRIVATE --

  // Constructor

  private constructor($elt: HTMLDivElement) {
    $attach($elt, '#homeButton', { listeners: { click: _e=>{ window.location.href = '/'; }}});
    $attach($elt, '#refreshButton', { listeners: { click: _e=>{ window.location.reload(); }}});
    $attach($elt, '#userButton', { listeners: { click: _e=>{ alert("User menu not yet implemented."); }}});
  }

  // Private Instance Properties

  // Private Instance Methods

  // Private Event Handlers

}
