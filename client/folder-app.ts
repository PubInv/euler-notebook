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

import { $ } from './dom.js';
import { showErrorMessage } from './global.js';

// Types

const VIEWS = [ 'createFile', 'createFolder', 'filesAndFolders', 'importFile' ] as const;
type View = typeof VIEWS[number];

// Constants

// Global Variables

// Event Handlers

function onCreateFileViewButtonClicked(_event: Event): void {
  try {
    // REVIEW: It would be nice if double-clicking the create-file button
    //         would create an 'anonymous' notebook, but currently we disable
    //         the button as soon as it is clicked the first time so we cannot
    //         get the second click.
    switchView('createFile');
  } catch (err) {
    showErrorMessage("Unexpected error in onCreateFileViewButtonClicked", err);
  }
}

function onCreateFolderViewButtonClicked(_event: Event): void {
  try {
    switchView('createFolder');
  } catch (err) {
    showErrorMessage("Unexpected error in onCreateFolderViewButtonClicked", err);
  }
}

function onDomReady(_event: Event): void {
  try {
    $<HTMLButtonElement>(document, '#filesAndFoldersViewButton').addEventListener<'click'>('click', onFilesAndFoldersViewButtonClicked);
    $<HTMLButtonElement>(document, '#createFolderViewButton').addEventListener<'click'>('click', onCreateFolderViewButtonClicked);
    $<HTMLButtonElement>(document, '#createFileViewButton').addEventListener<'click'>('click', onCreateFileViewButtonClicked);
    $<HTMLButtonElement>(document, '#importFileViewButton').addEventListener<'click'>('click', onImportFileViewButtonClicked);

    switchView('filesAndFolders');

  } catch (err) {
    showErrorMessage("Initialization error", err);
  }
}

function onFilesAndFoldersViewButtonClicked(_event: Event): void {
  try {
    switchView('filesAndFolders');
  } catch (err) {
    showErrorMessage("Unexpected error in onFilesAndFoldersViewButtonClicked", err);
  }
}

function onImportFileViewButtonClicked(_event: Event): void {
  try {
    switchView('importFile');
  } catch (err) {
    showErrorMessage("Unexpected error in onImportFileViewButtonClicked", err);
  }
}

// Helper Functions

function switchView(view: View): void {
  // Show/hide view panels and enable/disable sidebar buttons.
  for (const otherView of VIEWS) {
    const disabled = (otherView == view);
    const show = (otherView==view || otherView=='filesAndFolders')
    $<HTMLDivElement>(document, `#${otherView}View`).style.display = (show ? 'block' : 'none');
    $<HTMLButtonElement>(document, `#${otherView}ViewButton`).disabled = disabled;
  }

  // Set focus
  switch(view) {
    case 'createFile':
      $<HTMLInputElement>(document, 'input[name="notebookName"]').focus();
      break;
    case 'createFolder':
      $<HTMLInputElement>(document, 'input[name="folderName"]').focus();
      break;
    case 'importFile':
      $<HTMLInputElement>(document, 'input[name="importFile"]').focus();
      break;
  }
}

// Application Entry Point

function main(): void {
  window.addEventListener('DOMContentLoaded', onDomReady);
}

main();
