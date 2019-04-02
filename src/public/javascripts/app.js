
// Requirements

import { apiGetRequest, apiPostRequest } from './api.js';
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

let tDoc /*: TDoc*/;
let currentEditor;

// Event Handlers


async function onDomReady(_event){
  try {

    // Banner
    $('#bannerClose').addEventListener('click', hideBanner);

    // Menu

    $('#saveButton').addEventListener('click', onSaveButtonClicked);
    $('#enhanceButton').addEventListener('click', onEnhanceButtonClicked);

    // Document

    // TODO:
    // const openResults = await apiGetRequest('open');
    // tDoc = TDoc.fromPlainObject(openResults.tDoc);
    // showStatusMessage("Notebook opened successfully.");
    tDoc = TDoc.create();

    // Preview Area

    $('#insertButton').addEventListener('click', onInsertButtonClicked);

    // Input Area

    $('#textButton').addEventListener('click', onTextButtonClicked);
    $('#mathButton').addEventListener('click', onMathButtonClicked);

    currentEditor = initializeEditor($('#inputMath'), 'MATH');
    // NOTE: We would like to initialize the text editor here, too, but
    // if you initialize the editor when it is hidden it does not work
    // properly once it is visible. So we initialize it the first time
    // we switch to it.

    $('#undoButton').addEventListener('click', _event=>currentEditor.undo());
    $('#redoButton').addEventListener('click', _event=>currentEditor.redo());
    $('#clearButton').addEventListener('click', _event=>currentEditor.clear());
    $('#convertButton').addEventListener('click', _event=>currentEditor.convert());


  } catch (err) {
    showErrorMessage("Error initializing math tablet.", err);
  }
}

// Fires when either the text editor or math editor fire a 'change' event.
function onEditorChanged(event) {
  $('#undoButton').disabled = !event.detail.canUndo;
  $('#redoButton').disabled = !event.detail.canRedo;
  $('#clearButton').disabled = !event.detail.canUndo;
  $('#convertButton').disabled = !event.detail.canUndo;
}

async function onEnhanceButtonClicked(_event) {
  try {
    // Basically at this point there may be enhancements both client-side and
    // server side. Since one of the main enhancemnts is in "math.js" which
    // is a hard to include here (due to incompatibilities with our test system)
    // We probably will need server-side enhancements anyway, so I will check here.
    const newStyles = tDoc.applyRules( getKnownClientSideRules() );
    // TODO: update the display.
    console.log("New styles from applying mathSimplifyRule:");
    console.dir(newStyles);

    // Rob is trying to a hello world request here:
    const enhanceResults = await apiPostRequest('enhance', { tDoc });
    console.log("enhance results", enhanceResults);

    $('#enhanceButton').disabled = true;
  } catch(err) {
    showErrorMessage("Error enhancing TDOC.", err);
  }
}

function onInsertButtonClicked(_event) {
  try {
    // Create a Thought and attach styles depending on the type of input.
    const thought =  tDoc.createThought();
    const thoughtElt = document.createElement('div');
    thoughtElt.classList.add('thought');
    $('#tDoc').appendChild(thoughtElt);

    const type = currentEditor.configuration.recognitionParams.type;
    switch(type) {
    case 'MATH': {
      const latex = currentEditor.exports && currentEditor.exports['application/x-latex'];
      tDoc.createMathStyle(thought, latex);
      const jiix = currentEditor.exports && currentEditor.exports['application/vnd.myscript.jiix'];
      tDoc.createJiixStyle(thought, jiix);
      // TODO: Catch and report katex errors
      katex.render(latex, thoughtElt, { throwOnError: false });
      break;
    }
    case 'TEXT': {
      const text = currentEditor.exports && currentEditor.exports['text/plain'];
      tDoc.createTextStyle(thought, text);
      const strokeGroups = currentEditor.model.strokeGroups;
      tDoc.createStrokeStyle(thought, strokeGroups);
      thoughtElt.innerText = text;
      break;
    }
    default:
      throw new Error(`Unexpected block type: ${type}`);
    }

    // Clear the contents of the editor and
    currentEditor.clear();

    $('#enhanceButton').disabled = false;
    $('#saveButton').disabled = false;
    $('#insertButton').disabled = true;
  } catch(err) {
    showErrorMessage("Error inserting input", err);
  }
}

function onMathButtonClicked(_event) {
  try {
    disableTextInput();
    enableMathInput();
    currentEditor = $('#inputMath').editor;
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
    console.log("Saving TDoc:");
    console.dir(tDoc);
    await apiPostRequest('save', { tDoc });
    $('#saveButton').disabled = true;
    showStatusMessage("TDoc saved successfully.");
  } catch(err) {
    showErrorMessage("Error saving notebook", err);
  }
}

function onTextButtonClicked(_event) {
  try {
    disableMathInput();
    enableTextInput();
    currentEditor = $('#inputText').editor || initializeEditor($('#inputText'), 'TEXT');
    // NOTE: We initialize the text editor here, rather than at DOM Ready, because
    //       it is hidden, and initializing a hidden editor doesn't work properly.
    // TODO: Update state of undo/redo/etc buttons based on new editor.
  } catch(err) {
    showErrorMessage("Error switching to text input.", err);
  }
}

function onTextExported(event) {
  try {
    // console.dir(event.detail);
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

function $(selector) {
  return document.querySelector(selector);
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

function hideBanner(_event) {
  $('#banner').style.display = 'none';
}

function initializeEditor(editorElt, editorType) {
  const config = getMyScriptConfig(editorType);
  MyScript.register(editorElt, config);
  editorElt.addEventListener('changed', onEditorChanged);
  const onExportedFn = (editorType == 'MATH' ? onMathExported : onTextExported);
  editorElt.addEventListener('exported', onExportedFn);
  return editorElt.editor;
}

function showErrorMessage(msg, err) {
  // TODO: Display on page.
  console.error(msg);
  console.dir(err);
}

function showStatusMessage(msg) {
  // TODO: Display on page.
  console.log(msg);
}

// Application Entry Point

function main(){
  window.addEventListener('DOMContentLoaded', onDomReady);
}

main();
