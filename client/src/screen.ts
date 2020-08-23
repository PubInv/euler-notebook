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

import { NotebookChange } from "./shared/notebook";

// Requirements


// Exported Class

export abstract class Screen {

  // Public Class Methods

  public static show(screen: Screen): void {
    // REVIEW: check if we are showing a screen that is already visible?
    console.log(`Showing ${screen.$elt.id}`);
    if (this.visibleScreen) { this.visibleScreen.hide(); }
    this.visibleScreen = screen;
    screen.show();
  }

  // Public Instance Properties

  public $elt: HTMLDivElement;  // REVIEW: Make read-only?

  // Public Instance Methods

  // --- PRIVATE ---

  // Private Class Properties

  private static visibleScreen: Screen|undefined;

  // Private Constructor

  protected constructor($elt: HTMLDivElement) {
    this.$elt = $elt;
  }

  // Private Properties

  // Private Instance Methods

  protected hide(): void {
    // Do not call directly. Call Screen.show to show another screen instead.
    this.$elt.style.display = 'none';
  }

  protected show(): void {
    // Do not call directly. Call Screen.show to show a screen.
    this.$elt.style.display = 'block';
  }

}

export abstract class NotebookBasedScreen extends Screen {
  public abstract smChange(_change: NotebookChange): void;
}
