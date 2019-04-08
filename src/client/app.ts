
// TODO: Strict declaration needed?

// Requirements

import { $, $new, Html } from './dom.js';
import { getKatex } from './katex-types.js';
import { getMyScript, MyScriptConfiguration, MyScriptEditor, MyScriptEditorElement, MyScriptEditorChangedEvent, MyScriptEditorExportedEvent, MyScriptEditorType, MyScriptServerKeys } from './myscript-types.js';
import { addErrorMessageToHeader, addSuccessMessageToHeader } from './global.js';
import { apiPostRequest } from './api.js';
import { EnhanceParams, EnhanceResults, NotebookName, OpenParams, OpenResults, SaveParams, StyleObject, TDocObject, ThoughtObject, UserName }  from './math-tablet-api.js';

// Types

type InputMethod = 'Math'|'MathJsPlain'|'Text';

type StyleRenderer = (s: StyleObject)=>HTMLElement;

interface StyleRendererMap {
  [ styleType: /* StyleType */ string ]: StyleRenderer;
}

// Constants

const STYLE_RENDERERS: StyleRendererMap = {
  'LATEX': renderLatexStyle,
  'MATHJS': renderMathJsStyle,
  'MATHJS-PLAIN': renderMathJsPlainStyle,
  'MATHJSSIMPLIFICATION': renderMathJsSimplificationStyle,
  'TEXT': renderTextStyle,
};

// Global Variables

let gUserName: UserName;
let gNotebookName: NotebookName;
let gNotebook: TDocObject;
let gEditor: MyScriptEditor|undefined;
let gInputMethod: InputMethod|undefined;

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
    $('#inputMathButton').addEventListener<'click'>('click', _event=>switchInput('Math'));
    $('#inputMathJsPlainButton').addEventListener<'click'>('click', _event=>switchInput('MathJsPlain'));
    $('#inputTextButton').addEventListener<'click'>('click', _event=>switchInput('Text'));

    $('#inputMathJsPlain>textarea').addEventListener<'input'>('input', onMathJsPlainInputInput)

    // TODO: Make undo, redo etc work with MathJsPlain input.
    $('#undoButton').addEventListener<'click'>('click', _event=>gEditor && gEditor.undo());
    $('#redoButton').addEventListener<'click'>('click', _event=>gEditor && gEditor.redo());
    $('#clearButton').addEventListener<'click'>('click', _event=>gEditor && gEditor.clear());
    $('#convertButton').addEventListener<'click'>('click', _event=>gEditor && gEditor.convert());

    switchInput('MathJsPlain');

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

  const tDoc = gNotebook;

  const thought: ThoughtObject =  { id: tDoc.nextId++ };
  gNotebook.thoughts.push(thought);

  try {
    switch(gInputMethod) {
    case 'Math': {
      const editor = gEditor; // TODO: grab from DOM.editor instead
      if (!editor) { throw new Error(); }
      const latex = editor.exports && editor.exports['application/x-latex'];
      const mStyle: StyleObject = { id: tDoc.nextId++, stylableId: thought.id, type: 'LATEX', data: latex };
      tDoc.styles.push(mStyle);

      const jiix = editor.exports && editor.exports['application/vnd.myscript.jiix'];
      const jStyle: StyleObject = { id: tDoc.nextId++, stylableId: thought.id, type: 'JIIX', data: jiix };
      tDoc.styles.push(jStyle);

      editor.clear();

      break;
    }
    case 'MathJsPlain': {
      const text = $<HTMLTextAreaElement>('#inputMathJsPlain>textarea').value;
      const style: StyleObject = { id: tDoc.nextId++, stylableId: thought.id, type: 'MATHJS-PLAIN', data: text };
      tDoc.styles.push(style);
      break;
    }
    case 'Text': {
      const editor = gEditor; // TODO: grab from DOM.editor instead
      if (!editor) { throw new Error(); }
      const text = editor.exports && editor.exports['text/plain'];
      const tStyle: StyleObject = { id: tDoc.nextId++, stylableId: thought.id, type: 'TEXT', data: text };
      tDoc.styles.push(tStyle);

      const strokeGroups = editor.model.strokeGroups;
      const sStyle: StyleObject = { id: tDoc.nextId++, stylableId: thought.id, type: 'STROKE', data: strokeGroups };
      tDoc.styles.push(sStyle);

      editor.clear();

      break;
    }
    default:
      // TODO: shouldn't happen.
    }

    const thoughtElt = renderThought(gNotebook, thought);
    $('#tDoc').appendChild(thoughtElt);

    $<HTMLButtonElement>('#enhanceButton').disabled = false;
    $<HTMLButtonElement>('#saveButton').disabled = false;
    $<HTMLButtonElement>('#insertButton').disabled = true;
  } catch(err) {
    showErrorMessage("Error inserting input.", err);
  }
}

function onMathJsPlainInputInput(this: HTMLElement, _event: Event) {
  try {
    console.log("INPUT:");
    const textArea: HTMLTextAreaElement = this /* TYPESCRIPT: */ as HTMLTextAreaElement;
    const text: string = textArea.value;
    console.log(text);
    const isValid = (text.length>0); // LATER: Validate expression.
    $('#previewMathJsPlain').innerText = text;
    $<HTMLButtonElement>('#insertButton').disabled = !isValid;
  } catch(err) {
    showErrorMessage("Error updating mathJsPlain preview.", err);
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

function renderMathJsPlainStyle(style: StyleObject) {
  return $new('div', ['style'], `<div class="styleId">S-${style.id} ${style.type} => ${style.stylableId}</div><div><tt>${style.data}</tt></div>`);
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

function showErrorMessage(html: Html, err: Error): void {
  if (err) {
    html += `<br/><pre>${err.message}</pre>`;
  }
  addErrorMessageToHeader(html);
}

function showSuccessMessage(html: Html): void {
  addSuccessMessageToHeader(html);
}

function switchInput(method: InputMethod): void {
  try {
    // Disable the current input method
    if (gInputMethod) {
      $(`#input${gInputMethod}`).style.display = 'none';
      $(`#preview${gInputMethod}`).style.display = 'none';
      $<HTMLButtonElement>(`#input${gInputMethod}`).disabled = false;
    }

    // Enable the new input method
    gInputMethod = method;
    $(`#input${gInputMethod}`).style.display = 'block';
    $(`#preview${gInputMethod}`).style.display = 'block';
    $<HTMLButtonElement>(`#input${gInputMethod}`).disabled = true;

    switch(gInputMethod) {
    case 'Math':
      gEditor = $<MyScriptEditorElement>('#inputMath').editor  || initializeEditor($('#inputMath'), 'MATH');
      break;
    case 'Text':
      gEditor = $<MyScriptEditorElement>('#inputText').editor || initializeEditor($('#inputText'), 'TEXT');
      break;
    default:
      gEditor = undefined;
    }
  } catch(err) {
    showErrorMessage("Error switching input method.", err);
  }
}

// Application Entry Point

function main(){
  window.addEventListener('DOMContentLoaded', onDomReady);
}

main();
