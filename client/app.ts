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
// import { StyleObject, StyleObject }  from './math-tablet-api.js';
import { HtmlNotebook } from './html-notebook.js';
import { ServerSocket } from './server-socket.js';
import { StyleType } from './notebook.js';
import { Jiix, LatexData, MathMlData, StylePropertiesWithSubprops } from './math-tablet-api.js';

// Types

type InputMethod = 'Math'|'Keyboard'|'Text';

// Constants

const INITIAL_INPUT_METHOD: InputMethod = 'Keyboard';

// Global Variables

let gSocket: ServerSocket;
let gNotebook: HtmlNotebook;
let gEditor: Editor|undefined;
let gInputMethod: InputMethod|undefined;

// Event Handlers

function onDebugMenuClicked(_event: MouseEvent) {
  const $window = $<HTMLElement>('#debugWindow');
  if ($window.style.display == 'none') {
    const html = gNotebook ? gNotebook.debugHtml() : "<i>No open notebook</i>"
    $window.innerHTML = html;
    $window.style.display = 'block';
  } else {
    $window.style.display = 'none';
    $window.innerHTML = '';
  }
}

function onDebugWindowClicked(event: MouseEvent) {
  const $target: HTMLElement = <HTMLElement>event.target;
  if ($target.tagName == 'SPAN') {
    if ($target.classList.contains('collapsed')) {
      (<HTMLElement>$target.nextElementSibling).style.display = 'block';
      $target.classList.remove('collapsed');
      $target.classList.add('expanded');
    } else if ($target.classList.contains('expanded')) {
      (<HTMLElement>$target.nextElementSibling).style.display = 'none';
      $target.classList.remove('expanded');
      $target.classList.add('collapsed');
    }
  }
}

async function onDomReady(_event: Event){
  try {

    window.addEventListener('resize', onResize);

    $<HTMLButtonElement>('#debugMenu').addEventListener<'click'>('click', onDebugMenuClicked);
    $<HTMLButtonElement>('#userMenu').addEventListener<'click'>('click', _event=>{ alert("User menu not yet implemented."); });

    $<HTMLButtonElement>('#insertButton').addEventListener<'click'>('click', onInsertButtonClicked);
    $<HTMLButtonElement>('#inputMathButton').addEventListener<'click'>('click', _event=>switchInput('Math'));
    $<HTMLButtonElement>('#inputKeyboardButton').addEventListener<'click'>('click', _event=>switchInput('Keyboard'));
    $<HTMLButtonElement>('#inputTextButton').addEventListener<'click'>('click', _event=>switchInput('Text'));

    const keyboardInputField = $<HTMLInputElement>('#inputKeyboard>input');
    keyboardInputField.addEventListener<'input'>('input', onKeyboardInputInput);
    keyboardInputField.addEventListener<'keyup'>('keyup', onKeyboardInputKeyup);

    // TODO: Make undo, redo etc work with Keyboard input.
    $<HTMLButtonElement>('#undoButton').addEventListener<'click'>('click', _event=>gEditor && gEditor.undo());
    $<HTMLButtonElement>('#redoButton').addEventListener<'click'>('click', _event=>gEditor && gEditor.redo());
    $<HTMLButtonElement>('#clearButton').addEventListener<'click'>('click', _event=>gEditor && gEditor.clear());
    $<HTMLButtonElement>('#convertButton').addEventListener<'click'>('click', _event=>gEditor && gEditor.convert());
    $<HTMLButtonElement>('#debugWindow').addEventListener<'click'>('click', onDebugWindowClicked);

    switchInput(INITIAL_INPUT_METHOD);
    if (INITIAL_INPUT_METHOD == 'Keyboard') {
      $<HTMLInputElement>('#inputKeyboard>input').focus();
    }

    // Make websocket connection to the notebook.
    const wsUrl = `ws://${window.location.host}/`;
    gSocket = await ServerSocket.connect(wsUrl);

    // Open the notebook specified in our URL.
    const notebookName = window.location.pathname;
    gNotebook = await gSocket.openNotebook(notebookName);

    // Insert the TDoc at the top of the "column"
    $('#column').appendChild(gNotebook.$elt);

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
      const latex: LatexData = cleanLatex(edExports['application/x-latex']);
      const mathMl: MathMlData = edExports['application/mathml+xml'];
      if (!jiix || !latex || !mathMl) { throw new Error("Missing export from MyScript math editor."); }
      console.dir(mathMl);
      const styleProps: StylePropertiesWithSubprops = {
        type: 'JIIX',
        data: jiix,
        meaning: 'INPUT',
        subprops: [
          { type: 'LATEX', data: latex, meaning: 'INPUT-ALT' },
          { type: 'MATHML', data: mathMl, meaning: 'INPUT-ALT' },
        ],
      };
      gNotebook.insertStyle(styleProps);
      editor.clear();
      break;
    }
    case 'Keyboard': {
      const $typeSelector = $<HTMLSelectElement>('#inputKeyboard>select');
      const styleType: StyleType = <StyleType>$typeSelector.value;
      const $inputField = $<HTMLInputElement>('#inputKeyboard>input');
      const text = $inputField.value;
      const styleProps: StylePropertiesWithSubprops = { type: styleType, data: text, meaning: 'INPUT' };
      gNotebook.insertStyle(styleProps);
      $inputField.value = $<HTMLDivElement>('#preview').innerText = '';
      break;
    }
    case 'Text': {
      const editor = gEditor; // TODO: grab from DOM.editor instead
      if (!editor) { throw new Error(); }
      const text = editor.exports && editor.exports['text/plain'];
      const strokeGroups = editor.model.strokeGroups;
      const stylePropss: StylePropertiesWithSubprops = {
        type: 'STROKE',
        data: strokeGroups,
        meaning: 'INPUT',
        subprops: [ { type: 'TEXT', data: text, meaning: 'INPUT-ALT' } ],
      };
      gNotebook.insertStyle(stylePropss);
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
    $<HTMLDivElement>('#preview').innerText = text;
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
      const latex = cleanLatex(event.detail.exports['application/x-latex']);
      // TODO: Catch and report katex errors
      getKatex().render(latex, $('#preview'), { throwOnError: false });
      $<HTMLButtonElement>('#insertButton').disabled = false;
    } else {
      $<HTMLButtonElement>('#preview').innerText = '';
      $<HTMLButtonElement>('#insertButton').disabled = true;
    }
  } catch(err) {
    showErrorMessage("Error updating math preview.", err);
  }
}

function onResize(_event: UIEvent) {
  switch(gInputMethod) {
    case 'Math':
     $<EditorElement>('#inputMath').editor.resize();
      break;
    case 'Text':
      $<EditorElement>('#inputText').editor.resize();
      break;
    default:
      // Nothing to do.
      break;
  }
}

function onTextExported(event: EditorExportedEvent) {
  try {
    if (event.detail.exports) {
      $<HTMLDivElement>('#preview').innerText = event.detail.exports['text/plain'];
      $<HTMLButtonElement>('#insertButton').disabled = false;
    } else {
      $<HTMLDivElement>('#preview').innerText = '';
      $<HTMLButtonElement>('#insertButton').disabled = true;
    }
  } catch(err) {
    showErrorMessage("Error updating text preview.", err);
  }
}

// Helper Functions

// This function comes from MyScript sample code.
// Apparently, the LaTeX exported from MyScript needs to be modified before
// passing it to KaTeX.
// https://github.com/MyScript/MyScriptJS/blob/master/examples/v4/websocket_math_iink.html.
// REVIEW: Which is more correct? MyScript's version or KaTeX's version?
//         Currently we are storing KaTeX's version. Alternatively, we could
//         store MyScript's version, and convert just before passing to KaTeX.
function cleanLatex(latex: LatexData): LatexData {
  if (latex.includes('\\\\')) {
    const steps = '\\begin{align*}' + latex + '\\end{align*}';
    return steps.replace("\\overrightarrow", "\\vec")
    .replace("\\begin{aligned}", "")
    .replace("\\end{aligned}", "")
    .replace("\\llbracket", "\\lbracket")
    .replace("\\rrbracket", "\\rbracket")
    .replace("\\widehat", "\\hat")
    .replace(new RegExp("(align.{1})", "g"), "aligned");
  }
  return latex
  .replace("\\overrightarrow", "\\vec")
  .replace("\\llbracket", "\\lbracket")
  .replace("\\rrbracket", "\\rbracket")
  .replace("\\widehat", "\\hat")
  .replace(new RegExp("(align.{1})", "g"), "aligned");
}

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
  const inputAreaElt = $<HTMLDivElement>('#inputArea');
  const applicationKey = inputAreaElt.dataset.applicationkey;
  const hmacKey = inputAreaElt.dataset.hmackey;
  if (!applicationKey || !hmacKey) { throw new Error(); }
  return { applicationKey, hmacKey };
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
      $<HTMLDivElement>(`#input${gInputMethod}`).style.display = 'none';
      $<HTMLButtonElement>(`#input${gInputMethod}Button`).disabled = false;
    }

    // Enable the new input method
    gInputMethod = method;
    $<HTMLDivElement>(`#input${gInputMethod}`).style.display = 'block';
    $<HTMLButtonElement>(`#input${gInputMethod}Button`).disabled = true;

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

    // In case the window has resized while the editor was hidden:
    if (gEditor) { gEditor.resize(); }

  } catch(err) {
    showErrorMessage("Error switching input method.", err);
  }
}

// Application Entry Point

function main(){
  window.addEventListener('DOMContentLoaded', onDomReady);
}

main();
