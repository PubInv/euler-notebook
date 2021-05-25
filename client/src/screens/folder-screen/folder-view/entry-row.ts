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

import { svgIconReferenceMarkup, CLOSE_X_ENTITY, PENCIL_ENTITY, CHECKMARK_ENTITY, $new, DOTTED_CIRCLE_ENTITY } from "../../../dom";
import { ClientFolder } from "../../../models/client-folder";
import { HtmlElement } from "../../../html-element";

// Types

type Entry = FolderEntry|NotebookEntry;

export enum EntryType { Folder, Notebook };

// Exported Class

export class EntryRow extends HtmlElement<'tr'> {

  // Public Constructor

  public constructor(folder: ClientFolder, type: EntryType, entry: Entry) {

    // REVIEW: Escape path?
    const $nameLink = $new({ tag: 'a', attrs: { href: '/#'+entry.path }, html: escapeHtml(entry.name) });

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

    const $nameError = $new({ tag: 'div', class: <CssClass>'error' });

    const $pencilButton = $new({
      tag: 'button',
      class: <CssClass>'iconButton',
      html: PENCIL_ENTITY,
      syncButtonHandler: (e: MouseEvent)=>this.onPencilButtonClicked(e),
    });

    const $checkmarkButton = $new({
      tag: 'button',
      class: <CssClass>'iconButton',
      style: 'display:none',
      html: CHECKMARK_ENTITY,
      asyncButtonHandler: (e: MouseEvent)=>this.onCheckmarkButtonClicked(e),
    });

    const $xButton = $new({
      tag: 'button',
      class: <CssClass>'iconButton',
      html: CLOSE_X_ENTITY,
      asyncButtonHandler: (e: MouseEvent)=>this.onRemoveButtonClicked(e),
    });

    super({
      tag: 'tr',
      class: <CssClass>'folderListing',
      children: [
        // File or folder icon
        { tag: 'td', html: svgIconReferenceMarkup(type==EntryType.Folder?'iconMonstrFolder2':'iconMonstrBook14') },

        // Name cell.
        // Contains a link, an input box, and an error message.
        // Input box starts out hidden, and error message is empty.
        {
          tag: 'td',
          class: <CssClass>'name',
          children: [
            $nameLink,
            $nameTextInput,
            $nameError,
          ],
        },

        // Edit and delete buttons
        {
          tag: 'td',
          children: [
            $pencilButton,
            $checkmarkButton,
            $xButton,
          ]
        }
      ],
    });

    this.$checkmarkButton = $checkmarkButton;
    this.$nameError = $nameError;
    this.$nameInput = $nameTextInput;
    this.$nameLink = $nameLink;
    this.$pencilButton = $pencilButton;
    this.$xButton = $xButton;

    this.entry = entry;
    this.folder = folder;
    this.renaming = false;
    this.type = type;
  }

  // Public Instance Methods

  public enterEditMode(): void {
    this.$nameLink.style.display = 'none';
    this.$pencilButton.style.display = 'none';

    this.$nameInput.style.display = 'block';
    this.$checkmarkButton.style.display = 'inline';

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

  private $checkmarkButton: HTMLButtonElement;
  private $nameError: HTMLDivElement;
  private $nameInput: HTMLInputElement;
  private $nameLink: HTMLAnchorElement;
  private $pencilButton: HTMLButtonElement;
  private $xButton: HTMLButtonElement;

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

  private clearNameError(): void {
    // See also setrNameError.
    this.$nameError.innerHTML = "";
    this.$checkmarkButton.disabled = false;
  }

  private exitNameEditMode(): void {
    this.clearNameError();

    // REVIEW: Set focus elsewhere?
    // Hide the name input text box and checkmark button.
    this.$nameInput.style.display = 'none';
    this.$checkmarkButton.style.display = 'none';

    // Show the name in link form and the pencil button.
    this.$nameLink.style.display = 'inline';
    this.$pencilButton.style.display = 'inline';

  }

  private async removeFromFolder(): Promise<void> {
    let removeError: Error|undefined = undefined;
    this.$xButton.disabled = true;
    this.$xButton.innerHTML = DOTTED_CIRCLE_ENTITY;
    try {
      if (this.type == EntryType.Folder) {
        await this.folder.removeFolderRequest(<FolderName>this.entry.name);
      } else {
        await this.folder.removeNotebookRequest(<NotebookName>this.entry.name);
      }
    } catch(err) {
      removeError = err;
    } finally {
      this.$xButton.disabled = false;
      this.$xButton.innerHTML = CLOSE_X_ENTITY;
    }
    if (!removeError) {
      this.destroy();
    } else {
      // REVIEW: Is the name field the approprite place to show this error message?
      this.setNameError(removeError.message);
    }
  }

  private async renameEntryAndExitEditMode(): Promise<void> {
    let renameError: Error|undefined = undefined;
    const newName = this.$nameInput.value;
    if (newName != this.entry.name) {
      // console.log("Name changed. Submitting change.");
      this.renaming = true;
      this.$nameInput.disabled = true;
      this.$checkmarkButton.disabled = true;
      this.$checkmarkButton.innerHTML = DOTTED_CIRCLE_ENTITY;
      try {
        if (this.type == EntryType.Folder) {
          /* const newEntry = */ await this.folder.renameFolderRequest(<FolderName>this.entry.name, <FolderName>newName);
        } else {
          /* const newEntry = */ await this.folder.renameNotebookRequest(<NotebookName>this.entry.name, <NotebookName>newName);
        }
      } catch(err) {
        console.error(`Error renaming folder: ${err.message}`);
        renameError = err;
      } finally {
        this.$nameInput.disabled = false;
        this.$checkmarkButton.innerHTML = CHECKMARK_ENTITY;
        this.$checkmarkButton.disabled = false;
      }
      this.renaming = false;
    }
    if (!renameError) {
      this.exitNameEditMode();
    } else {
      this.setNameError(renameError.message);
    }
  }

  private setNameError(message: string): void {
    // See also clearNameError.
    this.$nameError.innerHTML = escapeHtml(message);
    this.$checkmarkButton.disabled = true;
  }

  // Private Event Handlers

  private async onCheckmarkButtonClicked(_event: MouseEvent): Promise<void> {
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
    // console.log(`Name input input: (${e.inputType}) to ${newName}`);
    // console.dir(e);

    const invalid = (this.type == EntryType.Folder ?
                                    !Folder.isValidFolderName(<FolderName>newName) :
                                    !Folder.isValidNotebookName(<NotebookName>newName));

    let duplicate: boolean = (newName != this.entry.name) && this.anotherFolderOrNotebookHasSameName(newName);

    if (invalid) {
      this.setNameError(`Invalid ${this.type==EntryType.Folder?"folder":"notebook"} name.`);
    } else if (duplicate) {
      this.setNameError(`Duplicate ${this.type==EntryType.Folder?"folder":"notebook"} name.`);
    } else {
      this.clearNameError();
    }
  }

  private onNameInputKeydown(e: KeyboardEvent): void {
    // console.log(`Name input keydown: ${e.code}`);
    switch (e.code) {
      case "Escape": this.exitNameEditMode(); break;
      case "Enter":
        if (!this.$checkmarkButton.disabled) {
          this.renameEntryAndExitEditMode();
        } else {
          // LATER: Beep and/or flash error message.
        }
        break;
    }
  }

  private onPencilButtonClicked(_event: MouseEvent): void {
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
