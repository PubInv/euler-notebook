
// TODO: Strict declaration needed?

// Requirements

import { addErrorMessageToHeader, addSuccessMessageToHeader } from './global.js';
import { /* apiGetRequest, */ apiPostRequest } from './api.js';
import { TDoc, getKnownClientSideRules }  from './tdoc-class.js';
import katex from './katex-0.10.1.mjs';

// Constants

const MYSCRIPT_RECO_PARAMS = {
  protocol: 'WEBSOCKET',
  apiVersion: 'V4',
  v4: {
    export: {
      jiix: { strokes: true }
    },
    math: {
      mimeTypes: [ 'application/x-latex', 'application/vnd.myscript.jiix' ]
    },
    text: {
      guides: { enable: false },
      smartGuide: false,
    },
  },
};

// Global Variables

let gUserName;
let gNotebookName;
let gNotebook;
let gEditor;

// Event Handlers

async function onDomReady(_event){
  try {

    // Menu
    $('#saveButton').addEventListener('click', onSaveButtonClicked);
    $('#enhanceButton').addEventListener('click', onEnhanceButtonClicked);

    // Document
    const pathname = window.location.pathname;
    const pathnameComponents = pathname.split('/');
    // TODO: verify pathname is of length 3
    gUserName = pathnameComponents[1];
    gNotebookName = pathnameComponents[2];
    // TODO: ensure only safe characters in user notebookName
    const params = { userName: gUserName, notebookName: gNotebookName }
    const openResults = await apiPostRequest('open', params);
    gNotebook = TDoc.fromJsonObject(openResults.tDoc);
    renderNotebook(gNotebook)
    showSuccessMessage("Notebook opened successfully.");

    // Preview area
    $('#insertButton').addEventListener('click', onInsertButtonClicked);

    // Input area
    $('#textButton').addEventListener('click', onTextButtonClicked);
    $('#mathButton').addEventListener('click', onMathButtonClicked);
    gEditor = initializeEditor($('#inputMath'), 'MATH');
    // NOTE: We would like to initialize the text editor here, too, but
    // if you initialize the editor when it is hidden it does not work
    // properly once it is visible. So we initialize it the first time
    // we switch to it.
    $('#undoButton').addEventListener('click', _event=>gEditor.undo());
    $('#redoButton').addEventListener('click', _event=>gEditor.redo());
    $('#clearButton').addEventListener('click', _event=>gEditor.clear());
    $('#convertButton').addEventListener('click', _event=>gEditor.convert());

  } catch (err) {
    showErrorMessage("Error initializing math tablet.", err);
  }
}

// Fires when either the text editor or math editor fire a 'change' event.
function onEditorChanged(event) {
  try {
    $('#undoButton').disabled = !event.detail.canUndo;
    $('#redoButton').disabled = !event.detail.canRedo;
    $('#clearButton').disabled = !event.detail.canUndo;
    $('#convertButton').disabled = !event.detail.canUndo;
  } catch(err) {
    showErrorMessage("Error on editor change event handling.", err);
  }
}

async function onEnhanceButtonClicked(_event) {
  try {
    const newStyles = gNotebook.applyRules( getKnownClientSideRules() );
    const enhanceResults = await apiPostRequest('enhance', { tDoc: gNotebook });
    console.dir(enhanceResults);
    $('#enhanceButton').disabled = true;
  } catch(err) {
    showErrorMessage("Error enhancing notebook.", err);
  }
}

function onInsertButtonClicked(_event) {
  try {
    const thought = createThought(gNotebook, gEditor);
    const thoughtElt = renderThought(gNotebook, thought);
    $('#tDoc').appendChild(thoughtElt);
    gEditor.clear();
    $('#enhanceButton').disabled = false;
    $('#saveButton').disabled = false;
    $('#insertButton').disabled = true;
  } catch(err) {
    showErrorMessage("Error inserting input.", err);
  }
}

function onMathButtonClicked(_event) {
  try {
    disableTextInput();
    enableMathInput();
    gEditor = $('#inputMath').editor;
    // TODO: Update state of undo/redo/etc buttons based on new editor.
  } catch(err) {
    showErrorMessage("Error switching to math input.", err);
  }
}

function onMathExported(event) {
  try {
    if (event.detail.exports) {
      const latex = event.detail.exports['application/x-latex'];
      // TODO: Catch and report katex errors
      katex.render(latex, $('#previewMath'), { throwOnError: false });
      $('#insertButton').disabled = false;
    } else {
      $('#previewMath').innerText = '';
      $('#insertButton').disabled = true;
    }
  } catch(err) {
    showErrorMessage("Error updating math preview.", err);
  }
}

async function onSaveButtonClicked(event) {
  try {
    const params = { userName: gUserName, notebookName: gNotebookName, tDoc: gNotebook };
    await apiPostRequest('save', params);
    $('#saveButton').disabled = true;
    showSuccessMessage("Notebook saved successfully.");
  } catch(err) {
    showErrorMessage("Error saving notebook.", err);
  }
}

function onTextButtonClicked(_event) {
  try {
    disableMathInput();
    enableTextInput();
    gEditor = $('#inputText').editor || initializeEditor($('#inputText'), 'TEXT');
    // NOTE: We initialize the text editor here, rather than at DOM Ready, because
    //       it is hidden, and initializing a hidden editor doesn't work properly.
    // TODO: Update state of undo/redo/etc buttons based on new editor.
  } catch(err) {
    showErrorMessage("Error switching to text input.", err);
  }
}

function onTextExported(event) {
  try {
    if (event.detail.exports) {
      $('#previewText').innerText = event.detail.exports['text/plain'];
      $('#insertButton').disabled = false;
    } else {
      $('#previewText').innerText = '';
      $('#insertButton').disabled = true;
    }
  } catch(err) {
    showErrorMessage("Error updating text preview.", err);
  }
}

// Helper Functions

// Duplicated in global.js
function $(selector) {
  return document.querySelector(selector);
}

// Duplicated in global.js
function $new(tag, classes, innerHTML) {
  const $elt = document.createElement(tag);
  for (const cls of classes) {
    $elt.classList.add(cls);
  }
  if (innerHTML) {
    $elt.innerHTML = innerHTML;
  }
  return $elt;
}

function createThought(tDoc, editor) {
  const thought =  tDoc.createThought();

  const type = editor.configuration.recognitionParams.type;
  switch(type) {
  case 'MATH': {
    const latex = editor.exports && editor.exports['application/x-latex'];
    tDoc.createMathStyle(thought, latex);
    const jiix = editor.exports && editor.exports['application/vnd.myscript.jiix'];
    tDoc.createJiixStyle(thought, jiix);
    break;
  }
  case 'TEXT': {
    const text = editor.exports && editor.exports['text/plain'];
    tDoc.createTextStyle(thought, text);
    const strokeGroups = editor.model.strokeGroups;
    tDoc.createStrokeStyle(thought, strokeGroups);
    break;
  }
  default:
    throw new Error(`Unexpected block type: ${type}`);
  }
  return thought;
}

function disableMathInput() {
  $('#inputMath').style.display = 'none';
  $('#previewMath').style.display = 'none';
  $('#mathButton').disabled = false;
}

function disableTextInput() {
  $('#inputText').style.display = 'none';
  $('#previewText').style.display = 'none';
  $('#textButton').disabled = false;
}

function enableMathInput() {
  $('#inputMath').style.display = 'block';
  $('#previewMath').style.display = 'block';
  $('#mathButton').disabled = true;
}

function enableTextInput() {
  $('#inputText').style.display = 'block';
  $('#previewText').style.display = 'block';
  $('#textButton').disabled = true;
}

function getMyScriptConfig(editorType) {
  return {
    recognitionParams: {
      ...MYSCRIPT_RECO_PARAMS,
      server: getMyScriptKeys(),
      type: editorType,
    },
  };
}

function getMyScriptKeys() {
  const inputAreaElt = $('#inputArea');
  return {
    applicationKey: inputAreaElt.dataset.applicationkey,
    hmacKey: inputAreaElt.dataset.hmackey,
  }
}

function initializeEditor(editorElt, editorType) {
  const config = getMyScriptConfig(editorType);
  MyScript.register(editorElt, config);
  editorElt.addEventListener('changed', onEditorChanged);
  const onExportedFn = (editorType == 'MATH' ? onMathExported : onTextExported);
  editorElt.addEventListener('exported', onExportedFn);
  return editorElt.editor;
}

function renderNotebook(tDoc) {
  const $tDoc = $('#tDoc');
  $tDoc.innerHTML = '';
  const thoughts = tDoc.getThoughts();
  for (const thought of thoughts) {
    const $elt = renderThought(tDoc, thought);
    $tDoc.appendChild($elt);
  }
}

function renderStyle(tdoc, style) {
  const $elt = $new('div', ['style']);
  switch(style.type) {
  case 'MATH': {
    const latex = style.data;
    // TODO: Deal with error case.
    katex.render(latex, $elt, { throwOnError: false });
    break;
  }
  case 'TEXT': {
    const text = style.data;
    $elt.innerText = text;
    break;
  }
  default:
    $elt.innerHTML = `<i>${style.type} style is not rendered</i>`
  }

  // Render styles attached to this style.
  // TODO: Prevent infinite loop with recursion limit.
  const styles = tdoc.getStyles().filter(s=>(s.stylableId == style.id));
  renderStyles($elt, tdoc, styles);

  return $elt;
}

function renderStyles($elt, tdoc, styles) {
  // Iterate through the styles
  for (const style of styles) {
    const $styleElt = renderStyle(tdoc, style);
    $elt.appendChild($styleElt);
  }
}

function renderThought(tdoc, thought) {
  const $elt = $new('div', ['thought']);
  const styles = tdoc.getStyles().filter(s=>(s.stylableId == thought.id));
  renderStyles($elt, tdoc, styles);
  if (styles.length == 0) { $elt.innerHTML = `<i>Thought ${thought.id} has no styles attached.</i>`; }
  return $elt;
}

function showErrorMessage(html, err) {
  if (err) {
    html += `<br/><pre>${err.message}</pre>`;
  }
  addErrorMessageToHeader(html);
}

function showSuccessMessage(html) {
  addSuccessMessageToHeader(html);
}

// Application Entry Point

function main(){
  window.addEventListener('DOMContentLoaded', onDomReady);
}

main();
