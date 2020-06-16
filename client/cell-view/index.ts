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

import { assert } from '../common.js';
import { /* escapeHtml, */ $new, $, /* Html */} from '../dom.js';
// import { getKatex } from '../katex-types.js';
import { NotebookView } from '../notebook/notebook-view.js';
import { KeyboardInputPanel } from '../notebook/keyboard-input-panel.js';
import { StyleObject, StyleId, /* RelationshipObject */ } from '../shared/notebook.js';
import { NotebookChangeRequest } from '../shared/math-tablet-api.js';
// import { LatexData, ToolInfo, NameValuePair } from '../shared/math-tablet-api.js';
import { StylusInputPanel } from '../notebook/stylus-input-panel.js';

// Exported Class

export abstract class CellView {

  // Class Constants

  static MISSING_ERROR = "<i>No primary representation.</i>";

  // Class Methods

  // Instance Properties

  public $elt: HTMLDivElement;
  public styleId: StyleId;

  // Instance Property Functions

  public isSelected(): boolean {
    return this.$elt.classList.contains('selected');
  }

  // Instance Methods

  public editMode(): boolean {
    // Returns true iff cell was put into edit mode.

    // REVIEW: Not completely sure we will not get double-clicks.
    //         We may need to stopPropagation or preventDefault
    //         in the right places.
    assert(!this.inputPanel);

    // Only allow editing of user input cells, which have a data type
    // that is string-based, with a renderer.
    const style = this.notebookView.openNotebook.getStyle(this.styleId);
    const repStyle = this.notebookView.openNotebook.findStyle({ role: 'INPUT' }, this.styleId);
    if (!repStyle) { return false; }

    if (repStyle.type == 'STROKE-DATA') {
      this.inputPanel = StylusInputPanel.create(
        style,
        repStyle,
        (changes)=>this.onInputPanelDismissed(changes)
      );
    } else if (typeof repStyle.data=='string') {
      this.inputPanel = KeyboardInputPanel.create(
        style,
        repStyle,
        (changes)=>this.onInputPanelDismissed(changes)
      );
    } else {
      // Not a cell we can edit.
    }

    if (this.inputPanel) {
      $<HTMLDivElement>(document, '#tools').style.display = 'none';
      this.$elt.parentElement!.insertBefore(this.inputPanel.$elt, this.$elt.nextSibling);
      this.inputPanel.focus();
      this.hide();
      return true;
    } else {
      return false;
    }
  }

  public render(style: StyleObject): void {
    // get the primary representation
    let repStyle = this.notebookView.openNotebook.findStyle({ role: 'REPRESENTATION', subrole: 'PRIMARY' }, style.id);
    if (!repStyle) {
      // TODO: Look for renderable alternate representations
      this.$elt.innerHTML = CellView.MISSING_ERROR;
      return;
    }

    switch(repStyle.type) {
      case 'IMAGE-URL': {
        const url: string = style.data;
        this.$elt.innerHTML = `<image src="${url}"/>`
        break;
      }
      case 'SVG-MARKUP': {
        this.$elt.innerHTML = repStyle.data;
        break;
      }
      default:
        assert(false, "TODO: Unrecognized representation type.");
        break;
    }
  };

  public renderTools($tools: HTMLDivElement): void {
    $tools.innerHTML = '';
  }

  public scrollIntoView(): void {
    this.$elt.scrollIntoView();
  }

  public select(): void {
    this.$elt.classList.add('selected');
  }

  public unselect(): void {
    if (this.inputPanel) {
      // 'dismiss' will call the callback function, onKeyboardInputPanelDismissed,
      // which will delete the keyboard input panel and show ourself.
      this.inputPanel.dismiss(false);
    }
    this.$elt.classList.remove('selected');
  }

  // PRIVATE

  // Private Constructor

  protected constructor(notebookView: NotebookView, style: StyleObject, subclass: /* TYPESCRIPT: CssClass */string) {
    this.notebookView = notebookView;
    this.styleId = style.id;

    this.$elt = $new<HTMLDivElement>('div', {
      classes: [ 'cell', subclass ],
      id: `C${style.id}`,
      listeners: {
        'click': e=>this.onClicked(e),
        'dblclick': e=>this.onDoubleClicked(e),
      },
    });

  }

  // Private Instance Properties

  protected inputPanel?: KeyboardInputPanel|StylusInputPanel;
  protected notebookView: NotebookView;

  // Private Instance Methods

  private hide(): void {
    this.$elt.style.display = 'none';
  }

  private show(): void {
    this.$elt.style.display = 'flex';
  }

  // Private Event Handlers

  private onClicked(event: MouseEvent): void {
    // Note: Shift-click or ctrl-click will extend the current selection.
    this.notebookView.selectCell(this, event.shiftKey, event.metaKey);
  }

  private onDoubleClicked(_event: MouseEvent): void {
    if (!this.editMode()) {
      // REVIEW: Beep or something?
      console.log(`Keyboard input panel not available for cell: ${this.styleId}`)
    }
  }

  private onInputPanelDismissed(changeRequests: NotebookChangeRequest[]): void {
    if (changeRequests.length>0) {
      this.notebookView.editStyle(changeRequests)
      .catch((err: Error)=>{
        // TODO: Display error to user?
        console.error(`Error submitting input changes: ${err.message}`);
      });
    }
    this.$elt.parentElement!.removeChild(this.inputPanel!.$elt);
    delete this.inputPanel;

    this.show();
    $<HTMLDivElement>(document, '#tools').style.display = 'block';
    this.notebookView.setFocus();
  }

}
