
// Requirements

import { apiGetRequest, apiPostRequest } from './api.js';
import { deserializeNotebook, serializeNotebook } from './notebook.js';

// Event Handlers

async function onDomReady(event){
  try {
    // Open a notebook
    const openResults = await apiGetRequest('open');
    // TODO: check openResults.ok
    const pagesElt = document.getElementById('pages');
    deserializeNotebook(pagesElt, openResults.notebook);
    showStatusMessage("Notebook opened successfully.");

    const saveButtonElt = document.getElementById('saveButton');
    saveButtonElt.addEventListener('click', onSaveButtonClicked);
  } catch (err) {
    showErrorHeader("Error initializing page", err);
  }
}

async function onSaveButtonClicked(event) {
  try {
    const pagesElt = document.getElementById('pages');
    const notebook = serializeNotebook(pagesElt);
    await apiPostRequest('save', { notebook });
    this.disabled = true;
    showStatusMessage("Notebook saved successfully.");
  } catch(err) {
    showErrorHeader("Error saving notebook", err);
  }
}

// Helper Functions

function showErrorHeader(msg, err) {
  const errorHeader = document.getElementById('errorHeader');
  errorHeader.innerText = msg + (err ? ': ' + err.message : '');
  errorHeader.style.display = 'block';
}

function showStatusMessage(msg) {
  console.log(msg);
}

// Application Entry Point

function main(){
  window.addEventListener('DOMContentLoaded', onDomReady);
}

main();
