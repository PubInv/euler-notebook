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

type View = 'createFile' | 'createFolder' | 'filesAndFolders';

// Constants

// REVIEW: Any way to extract this array from the View type or vice versa?
const VIEWS = [ 'createFile', 'createFolder', 'filesAndFolders' ];

// Global Variables

// Event Handlers

function onCreateFileButtonClicked(_event: Event) {
  try {
    switchView('createFile');
  } catch (err) {
    showErrorMessage("Error showing create file form", err);
  }
}

function onCreateFolderButtonClicked(_event: Event) {
  try {
    switchView('createFolder');
  } catch (err) {
    showErrorMessage("Error showing create folder form", err);
  }
}

async function onDomReady(_event: Event){
  try {
    $<HTMLButtonElement>('#filesAndFoldersButton').addEventListener<'click'>('click', onFilesAndFoldersButtonClicked);
    $<HTMLButtonElement>('#createFolderButton').addEventListener<'click'>('click', onCreateFolderButtonClicked);
    $<HTMLButtonElement>('#createFileButton').addEventListener<'click'>('click', onCreateFileButtonClicked);

    switchView('filesAndFolders');

  } catch (err) {
    showErrorMessage("Initialization error", err);
  }
}

function onFilesAndFoldersButtonClicked(_event: Event) {
  try {
    switchView('filesAndFolders');
  } catch (err) {
    showErrorMessage("Error showing create folder form", err);
  }
}

// Helper Functions

function switchView(view: View): void {
  for (const otherView of VIEWS) {
    const show = (otherView == view);
    $<HTMLDivElement>(`#${otherView}`).style.display = (show ? 'block' : 'none');
    $<HTMLButtonElement>(`#${otherView}Button`).disabled = show;
  }
}

// Application Entry Point

function main(){
  window.addEventListener('DOMContentLoaded', onDomReady);
}

main();
