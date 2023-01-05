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

import { escapeHtml } from "../../../shared/common"
import { CssClass } from "../../../shared/css"
import { Folder, FolderEntry, FolderName, NotebookEntry, NotebookName } from "../../../shared/folder";

import { CLOSE_X_ENTITY, PENCIL_ENTITY, CHECKMARK_ENTITY, $new, DOTTED_CIRCLE_ENTITY } from "../../../dom";
import { ClientFolder } from "../../../models/client-folder";
import { HtmlElement } from "../../../html-element";
import { errorMessageForUser } from "../../../error-messages";
import { svgIcon } from "../../../svg-icons";

// Types

type Entry = FolderEntry|NotebookEntry;

export enum EntryType { Folder, Notebook };

// Exported Class

export class EntryRow extends HtmlElement<'tr'> {

  // Public Constructor

  public constructor(folder: ClientFolder, type: EntryType, entry: Entry) {

    // REVIEW: Escape path?
    const $nameLink = $new({ tag: 'a', attrs: { href: `/#${encodeURI(entry.path)}` }, html: escapeHtml(entry.name) });

    const $nameTextInput = $new({
      tag: 'input',
      attrs: {
        type: 'text',
        value: escapeHtml(entry.name),
        autocapitalize: 'off',
      },
      style: 'display:none',
      listeners: {
        input: (e: InputEvent)=>this.onNameInputInput(e),
        keydown: (e: KeyboardEvent)=>this.onNameInputKeydown(e),
      },
      asyncListeners: {
        blur: (e: FocusEvent)=>this.onNameInputBlur(e),
      },
    });

    const $renameButton = $new({
      tag: 'button',
      class: <CssClass>'iconButton',
      html: PENCIL_ENTITY,
      syncButtonHandler: (e: MouseEvent)=>this.onRenameButtonClicked(e),
    });

    const $renameFinishedButton = $new({
      tag: 'button',
      class: <CssClass>'iconButton',
      style: 'display:none',
      html: CHECKMARK_ENTITY,
      asyncButtonHandler: (e: MouseEvent)=>this.onRenameFinishedButtonClicked(e),
    });

    const $removeButton = $new({
      tag: 'button',
      class: <CssClass>'iconButton',
      html: CLOSE_X_ENTITY,
      asyncButtonHandler: (e: MouseEvent)=>this.onRemoveButtonClicked(e),
    });

    const $errorCell = $new({ tag: 'td', class: <CssClass>'error' });

    super({
      tag: 'tr',
      class: <CssClass>'folderRow',
      children: [
        { tag: 'td', html: svgIcon(type==EntryType.Folder?'iconMonstrFolder2':'iconMonstrBook14') },
        { tag: 'td', class: <CssClass>'name', children: [ $nameLink, $nameTextInput ] },
        { tag: 'td', children: [ $renameButton, $renameFinishedButton, $removeButton ] },
        $errorCell,
      ],
    });

    this.$renameFinishedButton = $renameFinishedButton;
    this.$errorCell = $errorCell;
    this.$nameInput = $nameTextInput;
    this.$nameLink = $nameLink;
    this.$renameButton = $renameButton;
    this.$removeButton = $removeButton;

    this.entry = entry;
    this.folder = folder;
    this.renaming = false;
    this.type = type;
  }

  // Public Instance Methods

  public enterEditMode(): void {
    this.$nameLink.style.display = 'none';
    this.$renameButton.style.display = 'none';

    this.$nameInput.style.display = 'block';
    this.$renameFinishedButton.style.display = 'inline';

    this.$nameInput.focus();
    this.$nameInput.select();
  }

  public rename(entry: Entry): void {
    // LATER: Some sort of animation.
    // LATER: Identify name of user that made the change.
    this.entry = entry;
    this.$nameLink.href = '/#' + entry.path; // REVIEW: Escape path?
    this.$nameLink.innerHTML = escapeHtml(entry.name);
  }

  // --- PRIVATE ---

  // Private Constructor

  // Private Instance Properties

  private $renameFinishedButton: HTMLButtonElement;
  private $errorCell: HTMLTableCellElement;
  private $nameInput: HTMLInputElement;
  private $nameLink: HTMLAnchorElement;
  private $renameButton: HTMLButtonElement;
  private $removeButton: HTMLButtonElement;

  private entry: Entry;
  private folder: ClientFolder;
  private renaming: boolean;
  private type: EntryType;

  // Private Instance Property Functions

  private anotherFolderOrNotebookHasSameName(newName: string): boolean {
    // REVIEW: Case sensitivity?
    return (this.type == EntryType.Folder ?
                          this.folder.hasFolderNamed(<FolderName>newName) :
                          this.folder.hasNotebookNamed(<NotebookName>newName));
  }

  // Private Instance Methods

  private clearErrorMessage(): void {
    // See also setrNameError.
    this.$errorCell.innerHTML = "";
  }

  private exitNameEditMode(): void {
    this.clearErrorMessage();

    // REVIEW: Set focus elsewhere?
    // Hide the name input text box and finished button.
    this.$nameInput.style.display = 'none';
    this.$renameFinishedButton.style.display = 'none';

    // Show the name in link form and the pencil button.
    this.$nameLink.style.display = 'inline';
    this.$renameButton.style.display = 'inline';

  }

  private async removeFromFolder(): Promise<void> {
    let removeError: any = undefined;
    this.$removeButton.disabled = true;
    this.$removeButton.innerHTML = DOTTED_CIRCLE_ENTITY;
    try {
      if (this.type == EntryType.Folder) {
        await this.folder.removeFolderRequest(<FolderName>this.entry.name);
      } else {
        await this.folder.removeNotebookRequest(<NotebookName>this.entry.name);
      }
    } catch(err) {
      removeError = err;
    } finally {
      this.$removeButton.disabled = false;
      this.$removeButton.innerHTML = CLOSE_X_ENTITY;
    }
    if (!removeError) { this.destroy(); }
    else { this.showError(removeError); }
  }

  private async renameEntryAndExitEditMode(): Promise<void> {
    let renameError: unknown = undefined;
    const newName = this.$nameInput.value;
    if (newName != this.entry.name) {
      // console.log("Name changed. Submitting change.");
      this.renaming = true;
      this.$nameInput.disabled = true;
      this.$renameFinishedButton.disabled = true;
      this.$renameFinishedButton.innerHTML = DOTTED_CIRCLE_ENTITY;
      try {
        if (this.type == EntryType.Folder) {
          await this.folder.renameFolderRequest(<FolderName>this.entry.name, <FolderName>newName);
        } else {
          await this.folder.renameNotebookRequest(<NotebookName>this.entry.name, <NotebookName>newName);
        }
      } catch(err) { renameError = err; }
      finally {
        this.$nameInput.disabled = false;
        this.$renameFinishedButton.innerHTML = CHECKMARK_ENTITY;
        this.$renameFinishedButton.disabled = false;
      }
      this.renaming = false;
    }
    if (!renameError) { this.exitNameEditMode(); }
    else { this.showError(renameError); }
  }

  private showError(err: unknown): void {
    const message = errorMessageForUser(err);
    this.showErrorMessage(message);
  }

  private showErrorMessage(message: string): void {
    this.$errorCell.innerHTML = escapeHtml(message);
  }

  // Private Event Handlers

  private async onRenameFinishedButtonClicked(_event: MouseEvent): Promise<void> {
    // console.log(`Edit name finish clicked`);
    this.renameEntryAndExitEditMode();
  }

  private async onNameInputBlur(_e: FocusEvent): Promise<void> {
    // console.log(`Name input blurred`);
    if (!this.renaming) {
      this.exitNameEditMode();
    }
  }

  private onNameInputInput(e: InputEvent): void {
    const newName = (<HTMLInputElement>e.target!).value;
    const invalid = (this.type == EntryType.Folder ?
                                    !Folder.isValidFolderName(<FolderName>newName) :
                                    !Folder.isValidNotebookName(<NotebookName>newName));
    const duplicate: boolean = (newName != this.entry.name) && this.anotherFolderOrNotebookHasSameName(newName);
    if (invalid || duplicate) {
      const message = invalid ? `Invalid name.` : `Duplicate name.`;
      this.showErrorMessage(message);
      this.$renameFinishedButton.disabled = true;
    } else {
      this.clearErrorMessage();
      this.$renameFinishedButton.disabled = false;
    }
  }

  private onNameInputKeydown(e: KeyboardEvent): void {
    // console.log(`Name input keydown: ${e.code}`);
    switch (e.code) {
      case "Escape": this.exitNameEditMode(); break;
      case "Enter":
        if (!this.$renameFinishedButton.disabled) {
          this.renameEntryAndExitEditMode();
        } else {
          // LATER: Beep and/or flash error message.
        }
        break;
    }
  }

  private onRenameButtonClicked(_event: MouseEvent): void {
    console.log(`Edit name clicked`);
    this.enterEditMode();
  }

  private async onRemoveButtonClicked(e: MouseEvent): Promise<void> {
    // TODO: Disable button?
    const $button = <HTMLButtonElement>e.target;
    $button.disabled = true;
    try {
      await this.removeFromFolder();
    } finally {
      $button.disabled = false;
    }
  }

}
