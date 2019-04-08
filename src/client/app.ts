
// TODO: Strict declaration needed?

// Requirements

import { $, $new, Html } from './dom.js';
import { getKatex } from './katex-types.js';
import { getMyScript, MyScriptConfiguration, MyScriptEditor, MyScriptEditorElement, MyScriptEditorChangedEvent, MyScriptEditorExportedEvent, MyScriptEditorType, MyScriptServerKeys } from './myscript-types.js';
import { addErrorMessageToHeader, addSuccessMessageToHeader } from './global.js';
import { apiPostRequest } from './api.js';
import { EnhanceParams, EnhanceResults, NotebookName, OpenParams, OpenResults, SaveParams, StyleObject, TDocObject, ThoughtObject, UserName }  from './math-tablet-api.js';

// Types

type StyleRenderer = (s: StyleObject)=>HTMLElement;

interface StyleRendererMap {
  [ styleType: /* StyleType */ string ]: StyleRenderer;
}

// Constants

const STYLE_RENDERERS: StyleRendererMap = {
  'LATEX': renderLatexStyle,
  'MATHJS': renderMathJsStyle,
  'MATHJSSIMPLIFICATION': renderMathJsSimplificationStyle,
  'TEXT': renderTextStyle,
};

// Global Variables

let gUserName: UserName;
let gNotebookName: NotebookName;
let gNotebook: TDocObject;
let gEditor: MyScriptEditor;

// Event Handlers

async function onDomReady(_event: Event){
  try {

    // Menu
    $('#saveButton').addEventListener<'click'>('click', onSaveButtonClicked);
    $('#enhanceButton').addEventListener<'click'>('click', onEnhanceButtonClicked);

    // Document
    const pathname = window.location.pathname;
    const pathnameComponents = pathname.split('/');
    // TODO: verify pathname is of length 3
    gUserName = pathnameComponents[1];
    gNotebookName = pathnameComponents[2];
    // TODO: ensure only safe characters in user notebookName
    const params = { userName: gUserName, notebookName: gNotebookName }
    const openResults = await apiPostRequest<OpenParams, OpenResults>('open', params);
    gNotebook = openResults.tDoc;
    renderNotebook(gNotebook)
    showSuccessMessage("Notebook opened successfully.");

    // Preview area
    $('#insertButton').addEventListener<'click'>('click', onInsertButtonClicked);

    // Input area
    $('#textButton').addEventListener<'click'>('click', onTextButtonClicked);
    $('#mathButton').addEventListener<'click'>('click', onMathButtonClicked);
    gEditor = initializeEditor($('#inputMath'), 'MATH');
    // NOTE: We would like to initialize the text editor here, too, but
    // if you initialize the editor when it is hidden it does not work
    // properly once it is visible. So we initialize it the first time
    // we switch to it.
    $('#undoButton').addEventListener<'click'>('click', _event=>gEditor.undo());
    $('#redoButton').addEventListener<'click'>('click', _event=>gEditor.redo());
    $('#clearButton').addEventListener<'click'>('click', _event=>gEditor.clear());
    $('#convertButton').addEventListener<'click'>('click', _event=>gEditor.convert());

  } catch (err) {
    showErrorMessage("Error initializing math tablet.", err);
  }
}

// Fires when either the text editor or math editor fire a 'change' event.
function onEditorChanged(event: MyScriptEditorChangedEvent) {
  try {
    $<HTMLButtonElement>('#undoButton').disabled = !event.detail.canUndo;
    $<HTMLButtonElement>('#redoButton').disabled = !event.detail.canRedo;
    $<HTMLButtonElement>('#clearButton').disabled = !event.detail.canUndo;
    $<HTMLButtonElement>('#convertButton').disabled = !event.detail.canUndo;
  } catch(err) {
    showErrorMessage("Error on editor change event handling.", err);
  }
}

async function onEnhanceButtonClicked(_event: Event) {
  try {
    const params = { tDoc: gNotebook };
    const enhanceResults = await apiPostRequest<EnhanceParams, EnhanceResults>('enhance', params);
    console.dir(enhanceResults);

    // Add the new styles to the TDoc
    for (const style of enhanceResults.newStyles) {
      // TEMPORARY: Have bug with null styles:
      if (!style) { continue; }
      gNotebook.styles.push(style);
    }

    // TODO: More efficient way than re-rendering the entire notebook.
    renderNotebook(gNotebook);

    // TEMPORARY: $('#enhanceButton').disabled = true;
  } catch(err) {
    showErrorMessage("Error enhancing notebook.", err);
  }
}

function onInsertButtonClicked(_event: Event) {
  try {
    const thought = createThought(gNotebook, gEditor);
    const thoughtElt = renderThought(gNotebook, thought);
    $('#tDoc').appendChild(thoughtElt);
    gEditor.clear();
    $<HTMLButtonElement>('#enhanceButton').disabled = false;
    $<HTMLButtonElement>('#saveButton').disabled = false;
    $<HTMLButtonElement>('#insertButton').disabled = true;
  } catch(err) {
    showErrorMessage("Error inserting input.", err);
  }
}

function onMathButtonClicked(_event: Event) {
  try {
    disableTextInput();
    enableMathInput();
    gEditor = $<MyScriptEditorElement>('#inputMath').editor
    // TODO: Update state of undo/redo/etc buttons based on new editor.
  } catch(err) {
    showErrorMessage("Error switching to math input.", err);
  }
}

function onMathExported(event: MyScriptEditorExportedEvent) {
  try {
    if (event.detail.exports) {
      const latex = event.detail.exports['application/x-latex'];
      // TODO: Catch and report katex errors
      getKatex().render(latex, $('#previewMath'), { throwOnError: false });
      $<HTMLButtonElement>('#insertButton').disabled = false;
    } else {
      $<HTMLButtonElement>('#previewMath').innerText = '';
      $<HTMLButtonElement>('#insertButton').disabled = true;
    }
  } catch(err) {
    showErrorMessage("Error updating math preview.", err);
  }
}

async function onSaveButtonClicked(_event: Event) {
  try {
    const params: SaveParams = { userName: gUserName, notebookName: gNotebookName, tDoc: gNotebook };
    await apiPostRequest('save', params);
    $<HTMLButtonElement>('#saveButton').disabled = true;
    showSuccessMessage("Notebook saved successfully.");
  } catch(err) {
    showErrorMessage("Error saving notebook.", err);
  }
}

function onTextButtonClicked(_event: Event) {
  try {
    disableMathInput();
    enableTextInput();
    gEditor = $<MyScriptEditorElement>('#inputText').editor || initializeEditor($('#inputText'), 'TEXT');
    // NOTE: We initialize the text editor here, rather than at DOM Ready, because
    //       it is hidden, and initializing a hidden editor doesn't work properly.
    // TODO: Update state of undo/redo/etc buttons based on new editor.
  } catch(err) {
    showErrorMessage("Error switching to text input.", err);
  }
}

function onTextExported(event: MyScriptEditorExportedEvent) {
  try {
    if (event.detail.exports) {
      $('#previewText').innerText = event.detail.exports['text/plain'];
      $<HTMLButtonElement>('#insertButton').disabled = false;
    } else {
      $('#previewText').innerText = '';
      $<HTMLButtonElement>('#insertButton').disabled = true;
    }
  } catch(err) {
    showErrorMessage("Error updating text preview.", err);
  }
}

// Helper Functions

function createThought(tDoc: TDocObject, editor: MyScriptEditor): ThoughtObject {

  const thought: ThoughtObject =  { id: tDoc.nextId++ };
  tDoc.thoughts.push(thought);

  const type = editor.configuration.recognitionParams.type;
  switch(type) {
  case 'MATH': {
    const latex = editor.exports && editor.exports['application/x-latex'];
    const mStyle: StyleObject = { id: tDoc.nextId++, stylableId: thought.id, type: 'LATEX', data: latex };
    tDoc.styles.push(mStyle);

    const jiix = editor.exports && editor.exports['application/vnd.myscript.jiix'];
    const jStyle: StyleObject = { id: tDoc.nextId++, stylableId: thought.id, type: 'JIIX', data: jiix };
    tDoc.styles.push(jStyle);
    break;
  }
  case 'TEXT': {
    const text = editor.exports && editor.exports['text/plain'];
    const tStyle: StyleObject = { id: tDoc.nextId++, stylableId: thought.id, type: 'TEXT', data: text };
    tDoc.styles.push(tStyle);

    const strokeGroups = editor.model.strokeGroups;
    const sStyle: StyleObject = { id: tDoc.nextId++, stylableId: thought.id, type: 'STROKE', data: strokeGroups };
    tDoc.styles.push(sStyle);
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
  $<HTMLButtonElement>('#mathButton').disabled = false;
}

function disableTextInput() {
  $('#inputText').style.display = 'none';
  $('#previewText').style.display = 'none';
  $<HTMLButtonElement>('#textButton').disabled = false;
}

function enableMathInput() {
  $('#inputMath').style.display = 'block';
  $('#previewMath').style.display = 'block';
  $<HTMLButtonElement>('#mathButton').disabled = true;
}

function enableTextInput() {
  $('#inputText').style.display = 'block';
  $('#previewText').style.display = 'block';
  $<HTMLButtonElement>('#textButton').disabled = true;
}

function getMyScriptConfig(editorType: MyScriptEditorType): MyScriptConfiguration {
  return {
    recognitionParams: {
      apiVersion: 'V4',
      protocol: 'WEBSOCKET',
      server: getMyScriptKeys(),
      type: editorType,
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
    },
  };
}

function getMyScriptKeys(): MyScriptServerKeys {
  const inputAreaElt = $('#inputArea');
  const applicationKey = inputAreaElt.dataset.applicationkey;
  const hmacKey = inputAreaElt.dataset.hmackey;
  if (!applicationKey || !hmacKey) { throw new Error(); }
  return { applicationKey, hmacKey }
}

function initializeEditor($elt: MyScriptEditorElement, editorType: MyScriptEditorType) {
  const config = getMyScriptConfig(editorType);
  getMyScript().register($elt, config);
  $elt.addEventListener('changed', </* TYPESCRIPT: */EventListener>onEditorChanged);
  const onExportedFn = (editorType == 'MATH' ? onMathExported : onTextExported);
  $elt.addEventListener('exported', </* TYPESCRIPT: */EventListener>onExportedFn);
  return $elt.editor;
}

function renderNotebook(tDoc: TDocObject) {
  const $tDoc = $('#tDoc');
  $tDoc.innerHTML = '';
  const thoughts = tDoc.thoughts;
  for (const thought of thoughts) {
    const $elt = renderThought(tDoc, thought);
    $tDoc.appendChild($elt);
  }
}

function renderLatexStyle(style: StyleObject) {
  const $elt = $new('div', ['style'], `<div class="styleId">S-${style.id} ${style.type} => ${style.stylableId}</div>`);
  const $subElt = $new('div');
  getKatex().render(style.data, $subElt, { throwOnError: false });
  $elt.appendChild($subElt);
  return $elt;
}

function renderMathJsStyle(style: StyleObject) {
  return $new('div', ['style'], `<div class="styleId">S-${style.id} ${style.type} => ${style.stylableId}</div><div><tt>${JSON.stringify(style.data)}</tt></div>`);
}

function renderMathJsSimplificationStyle(style: StyleObject) {
  return $new('div', ['style'], `<div class="styleId">S-${style.id} ${style.type} => ${style.stylableId}</div><div><tt>${JSON.stringify(style.data)}</tt></div>`);
}

function renderStyle(tdoc: TDocObject, style: StyleObject) {
  // Render the style itself using a style renderer.
  const renderFn = STYLE_RENDERERS[style.type];
  let $elt;
  if (renderFn) {
    $elt = renderFn(style);
  } else {
    $elt = $new('div', ['style'], `<div class="styleId">S-${style.id} ${style.type}  => ${style.stylableId}: Not rendered</div>`);
  }

  // Render styles attached to this style.
  // TODO: Prevent infinite loop with recursion limit.
  const styles = tdoc.styles.filter(s=>(s.stylableId == style.id));
  renderStyles($elt, tdoc, styles);

  return $elt;
}

function renderStyles($elt: HTMLElement, tdoc: TDocObject, styles: StyleObject[]) {
  // Iterate through the styles
  for (const style of styles) {
    const $styleElt = renderStyle(tdoc, style);
    $elt.appendChild($styleElt);
  }
}

function renderTextStyle(style: StyleObject) {
  return $new('div', ['style'], `<div class="styleId">S-${style.id} ${style.type} => ${style.stylableId}</div><div>${style.data}</div>`);
}

function renderThought(tdoc: TDocObject, thought: ThoughtObject) {
  const $elt = $new('div', ['thought'], `<div class="thoughtId">T-${thought.id}</div>`);
  const styles = tdoc.styles.filter(s=>(s.stylableId == thought.id));
  renderStyles($elt, tdoc, styles);
  if (styles.length == 0) { $elt.innerHTML = `<i>Thought ${thought.id} has no styles attached.</i>`; }
  return $elt;
}

function showErrorMessage(html: Html, err: Error) {
  if (err) {
    html += `<br/><pre>${err.message}</pre>`;
  }
  addErrorMessageToHeader(html);
}

function showSuccessMessage(html: Html) {
  addSuccessMessageToHeader(html);
}

// Application Entry Point

function main(){
  window.addEventListener('DOMContentLoaded', onDomReady);
}

main();
