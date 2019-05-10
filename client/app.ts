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

import { $, Html } from './dom.js';
import { getKatex } from './katex-types.js';
import { getMyScript, Configuration, Editor, EditorElement, EditorChangedEvent, EditorExportedEvent, EditorType, ServerKeys } from './myscript-types.js';
import { addErrorMessageToHeader, /* addSuccessMessageToHeader */} from './global.js';
// import { apiPostRequest } from './api.js';
// import { StyleObject, ThoughtObject }  from './math-tablet-api.js';
import { Notebook } from './notebook.js';
import { ServerSocket } from './server-socket.js';
import { Jiix, LatexData, MathMlData, StyleType, ThoughtProperties, StyleProperties } from './math-tablet-api.js';

// Types

type InputMethod = 'Math'|'Keyboard'|'Text';

// Constants

const INITIAL_INPUT_METHOD: InputMethod = 'Math';

// Global Variables

let gSocket: ServerSocket;
let gNotebook: Notebook;
let gEditor: Editor|undefined;
let gInputMethod: InputMethod|undefined;

// Event Handlers

async function onDomReady(_event: Event){
  try {

    // Menu

    // Preview area
    $('#insertButton').addEventListener<'click'>('click', onInsertButtonClicked);

    // Input area
    $('#inputMathButton').addEventListener<'click'>('click', _event=>switchInput('Math'));
    $('#inputKeyboardButton').addEventListener<'click'>('click', _event=>switchInput('Keyboard'));
    $('#inputTextButton').addEventListener<'click'>('click', _event=>switchInput('Text'));

    const keyboardInputField = $('#inputKeyboard>input');
    keyboardInputField.addEventListener<'input'>('input', onKeyboardInputInput);
    keyboardInputField.addEventListener<'keyup'>('keyup', onKeyboardInputKeyup);

    // TODO: Make undo, redo etc work with Keyboard input.
    $('#undoButton').addEventListener<'click'>('click', _event=>gEditor && gEditor.undo());
    $('#redoButton').addEventListener<'click'>('click', _event=>gEditor && gEditor.redo());
    $('#clearButton').addEventListener<'click'>('click', _event=>gEditor && gEditor.clear());
    $('#convertButton').addEventListener<'click'>('click', _event=>gEditor && gEditor.convert());

    switchInput(INITIAL_INPUT_METHOD);

    // Make websocket connection to the notebook.
    const wsUrl = `ws://${window.location.host}/`;
    gSocket = await ServerSocket.connect(wsUrl);

    // Open the notebook specified in our URL.
    const notebookName = window.location.pathname;
    gNotebook = await gSocket.openNotebook(notebookName);

    $('#tdoc').appendChild(gNotebook.$elt);

  } catch (err) {
    showErrorMessage("Error initializing math tablet.", err);
  }
}

// Fires when either the text editor or math editor fire a 'change' event.
function onEditorChanged(event: EditorChangedEvent) {
  try {
    $<HTMLButtonElement>('#undoButton').disabled = !event.detail.canUndo;
    $<HTMLButtonElement>('#redoButton').disabled = !event.detail.canRedo;
    $<HTMLButtonElement>('#clearButton').disabled = !event.detail.canUndo;
    $<HTMLButtonElement>('#convertButton').disabled = !event.detail.canUndo;
  } catch(err) {
    showErrorMessage("Error on editor change event handling.", err);
  }
}

function onInsertButtonClicked(_event: Event) {
  try {
    switch(gInputMethod) {
    case 'Math': {
      const editor = gEditor; // TODO: grab from DOM.editor instead
      if (!editor) { throw new Error("Inserting math with no MyScript editor."); }
      const edExports = editor.exports;
      if (!edExports) { throw new Error("MyScript math editor has no exports."); }
      const jiix: Jiix = edExports['application/vnd.myscript.jiix'];
      const latex: LatexData = edExports['application/x-latex'];
      const mathMl: MathMlData = edExports['application/mathml+xml'];
      if (!jiix || !latex || !mathMl) { throw new Error("Missing export from MyScript math editor."); }
      console.dir(mathMl);
      const thoughtProps: ThoughtProperties = {};
      const stylePropss: StyleProperties[] = [
        { type: 'JIIX', data: jiix, meaning: 'INPUT', source: 'USER' },
        { type: 'LATEX', data: latex, meaning: 'INPUT', source: 'USER' },
        { type: 'MATHML', data: mathMl, meaning: 'INPUT', source: 'USER' },
      ];
      gNotebook.insertThought(thoughtProps, stylePropss);
      editor.clear();
      break;
    }
    case 'Keyboard': {
      const $typeSelector = $<HTMLSelectElement>('#inputKeyboard>select');
      const styleType: StyleType = <StyleType>$typeSelector.value;
      const $inputField = $<HTMLInputElement>('#inputKeyboard>input');
      const text = $inputField.value;
      const thoughtProps: ThoughtProperties = {};
      const stylePropss: StyleProperties[] = [
        { type: styleType, data: text, meaning: 'INPUT', source: 'USER' },
      ];
      gNotebook.insertThought(thoughtProps, stylePropss);
      $inputField.value = $('#previewKeyboard').innerText = '';
      break;
    }
    case 'Text': {
      const editor = gEditor; // TODO: grab from DOM.editor instead
      if (!editor) { throw new Error(); }
      const text = editor.exports && editor.exports['text/plain'];
      const strokeGroups = editor.model.strokeGroups;
      const thoughtProps: ThoughtProperties = {};
      const stylePropss: StyleProperties[] = [
        { type: 'TEXT', data: text, meaning: 'INPUT', source: 'USER' },
        { type: 'STROKE', data: strokeGroups, meaning: 'INPUT', source: 'USER' },
      ];
      gNotebook.insertThought(thoughtProps, stylePropss);
      editor.clear();
      break;
    }
    default:
      throw new Error(`Unexpected input method: ${gInputMethod}`);
    }

    $<HTMLButtonElement>('#insertButton').disabled = true;
  } catch(err) {
    showErrorMessage("Error inserting input.", err);
  }
}

function onKeyboardInputInput(this: HTMLElement, _event: Event): void {
  try {
    const $field: HTMLInputElement = this /* TYPESCRIPT: */ as HTMLInputElement;
    const text: string = $field.value;
    const isValid = (text.length>0); // LATER: Validate expression.
    $('#previewKeyboard').innerText = text;
    $<HTMLButtonElement>('#insertButton').disabled = !isValid;
  } catch(err) {
    showErrorMessage("Error on keyboard-input input event.", err);
  }
}

function onKeyboardInputKeyup(this: HTMLElement, event: KeyboardEvent): void {
  try {
    if (event.keyCode == 13) { onInsertButtonClicked.call(this, event); }
  } catch(err) {
    showErrorMessage("Error on keyboard-input keyup event.", err);
  }
}

function onMathExported(event: EditorExportedEvent) {
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

function onTextExported(event: EditorExportedEvent) {
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

function getMyScriptConfig(editorType: EditorType): Configuration {
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
          mimeTypes: [ 'application/vnd.myscript.jiix', 'application/x-latex', 'application/mathml+xml' ]
        },
        text: {
          guides: { enable: false },
          smartGuide: false,
        },
      },
    },
  };
}

function getMyScriptKeys(): ServerKeys {
  const inputAreaElt = $('#inputArea');
  const applicationKey = inputAreaElt.dataset.applicationkey;
  const hmacKey = inputAreaElt.dataset.hmackey;
  if (!applicationKey || !hmacKey) { throw new Error(); }
  return { applicationKey, hmacKey }
}

function initializeEditor($elt: EditorElement, editorType: EditorType) {
  const config = getMyScriptConfig(editorType);
  getMyScript().register($elt, config);
  $elt.addEventListener('changed', </* TYPESCRIPT: */EventListener>onEditorChanged);
  const onExportedFn = (editorType == 'MATH' ? onMathExported : onTextExported);
  $elt.addEventListener('exported', </* TYPESCRIPT: */EventListener>onExportedFn);
  return $elt.editor;
}

function showErrorMessage(html: Html, err?: Error): void {
  if (err) {
    html += `<br/><pre>${err.message}</pre>`;
  }
  addErrorMessageToHeader(html);
}

// function showSuccessMessage(html: Html): void {
//   addSuccessMessageToHeader(html);
// }

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
      gEditor = $<EditorElement>('#inputMath').editor  || initializeEditor($('#inputMath'), 'MATH');
      break;
    case 'Text':
      gEditor = $<EditorElement>('#inputText').editor || initializeEditor($('#inputText'), 'TEXT');
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
