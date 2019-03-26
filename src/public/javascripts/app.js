
// Requirements

import { apiGetRequest, apiPostRequest } from './api.js';
import { deserializeNotebook, serializeNotebook } from './notebook.js';
import { tdoc, numMathStyles, numTextStyles,
         mathSimplifyRule, applyStyle} from './tdoc.js';

var GLOBAL_TDOC;

// Event Handlers

async function onDomReady(event){
  try {
    // Open a notebook
    const openResults = await apiGetRequest('open');
    // TODO: check openResults.ok
    const pagesElt = document.getElementById('pages');

    // Rob proposes that a notebook have a reference to a backing TDoc
    // At the moment this TDoc is volatile, it is not persistent
    // and is created on the fly. It can only be viewed through a separate action.
    //    deserializeNotebook(pagesElt, openResults.notebook);
    //    deserializeNotebook(pagesElt, openResults.notebook, new tdoc());
    GLOBAL_TDOC  = new tdoc();
    deserializeNotebook(pagesElt, openResults.notebook, GLOBAL_TDOC);        
    showStatusMessage("Notebook opened successfully.");

    const saveButtonElt = document.getElementById('saveButton');
    saveButtonElt.addEventListener('click', onSaveButtonClicked);
    
    const enhanceButtonElt = document.getElementById('enhanceButton');
    enhanceButtonElt.addEventListener('click', onEnhanceButtonClicked);
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

function onEnhanceButtonClicked(event) {
  try {
    let ms0 = numMathStyles(GLOBAL_TDOC);
    let r = mathSimplifyRule;
    GLOBAL_TDOC = applyStyle(GLOBAL_TDOC,[r]);
    let ms1 = numMathStyles(GLOBAL_TDOC);
    this.disabled = true;
    let numEnhancements = ms1 - ms0;
    showStatusMessage(numEnhancements > 0 ? `Found ${numEnhancements} simplifications`
                      : 'No mathematical simplications found');
    console.log(GLOBAL_TDOC);
  } catch(err) {
    console.log("Error",err);
    showErrorHeader("Error enhanceing TDOC", err);
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
