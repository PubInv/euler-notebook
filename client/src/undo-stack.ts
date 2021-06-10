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

import { showError } from "./user-message-dispatch";
import { Html } from "./shared/common";

// TODO: Undo needs to scroll the changed region into view.

// Requirements

// Types

// TODO: This name conflicts!
export interface NotebookUpdate {
  'type': string;
  'do': ()=>Promise<void>;
  undo: ()=>Promise<void>;
}

// Exported Class

export class UndoStack {

  // Class Methods

  public static create(
    $undoButton: HTMLButtonElement,
    $redoButton: HTMLButtonElement,
  ): UndoStack {
    return new this($undoButton, $redoButton);
  }

  // Instance Methods

  public async addChange(change: NotebookUpdate): Promise<void> {

    // Remove any changes beyond the current point on the undo stack,
    if (this.top < this.stack.length) {
      this.stack.splice(this.top, this.stack.length - this.top);
    }

    // Push the new change onto the stack,
    // and execute the change.
    this.stack.push(change);
    await this.onRedo();
  }

  // ----- PRIVATE -----

  // Private Constructor

  private constructor(
    $undoButton: HTMLButtonElement,
    $redoButton: HTMLButtonElement,
  ) {
    this.stack = [];
    this.top = 0;
    this.$redoButton = $redoButton;
    this.$undoButton = $undoButton;

    // TODO: This should use the dom.ts asyncButtonHandler.
    $redoButton.addEventListener('click', event=>this.onRedo(event));
    $undoButton.addEventListener('click', event=>this.onUndo(event));

    this.enableButtons();
  }

  // Private Instance Properties

  private $redoButton: HTMLButtonElement;
  private $undoButton: HTMLButtonElement;
  private stack: NotebookUpdate[];
  private top: number;          // Index of the top of the stack. May not be the length of the array if there have been some undos.

  // Private Instance Event Handlers

  private onRedo(_event?: MouseEvent): void {
    assert(this.top < this.stack.length);
    this.disableButtons();

    const change = this.stack[this.top];
    change.do().then(
      ()=>{ this.top += 1; },
      err=>{ showError(err, <Html>`Error doing '${change.type}'`); },
    )
    .finally(()=>{ this.enableButtons(); })
  }

  private onUndo(_event: MouseEvent): void {
    assert(this.top > 0);
    this.disableButtons();

    const change = this.stack[this.top - 1];
    change.undo()
    .then(
      ()=>{ this.top -= 1; },
      err=>{ showError(err, <Html>`Error undoing '${change.type}'`); },
    )
    .finally(()=>{ this.enableButtons(); })
  }

  // Private Instance Methods

  private disableButtons(): void {
    this.$redoButton.disabled = true;
    this.$undoButton.disabled = true;
  }

  private enableButtons(): void {
    this.$redoButton.disabled = (this.top >= this.stack.length);
    this.$undoButton.disabled = (this.top <= 0);
  }
}

// HELPER FUNCTIONS

// TODO: Move to a common location.
function assert(cond: boolean, message?: string): void {
  if (!cond) { throw new Error(`ASSERTION FAILED: ${message}`); }
}
