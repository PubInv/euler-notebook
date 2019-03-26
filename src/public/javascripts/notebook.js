
// Requirements
import { tdoc, prettyPrinter, summaryPrinter,
         thought, textStyle, mathStyle, jiixStyle, strokeGroupsStyle } from './tdoc.js';

// Constants

const MYSCRIPT_RECO_PARAMS = {
  protocol: 'WEBSOCKET',
  apiVersion: 'V4',
  v4: {
    export: {
      jiix: { strokes: true }
    },
    math: {
      mimeTypes: ['application/x-latex',
                  'application/vnd.myscript.jiix',
                  'text/html']
    },
    text: {
      guides: { enable: false }
    },
  },
};

// Globals

// Exported Functions

// Instantiates the HTML DOM structure from a notebook object.
// A TDoc is passed in for the purpose of allowing the notebook
// to be associated witha TDoc.
export function deserializeNotebook(pagesElt, notebook, td) {
  // REVIEW: Assumes #pages element is empty. Assert or delete any existig children?
  // REVIEW: Error if notebook has no pages?
  for (const pageData of notebook.pages||[]) {
    const pageElt = createDiv('page');
    // REVIEW: Error if page has no layers?
    for (const layerData of pageData.layers||[]) {
      const layerElt = createDiv('layer');
      for (const blockData of layerData.blocks||[]) {
        const blockElt = createDiv('editor');
        if (blockData.height) {
          blockElt.style.height = blockData.height;
        } else {
          blockElt.style.flex = 1;
        }
        blockElt.addEventListener('exported', onMyScriptExported);
        const blockConfig = {
          recognitionParams: { ...MYSCRIPT_RECO_PARAMS, server: getMyScriptKeys(), type: blockData.type }
        };
        // REVIEW: Any problem registering the element before it is added to the DOM?
        MyScript.register(blockElt, blockConfig);
        const editor = blockElt.editor;
        switch (blockData.type) {
        case 'MATH':
          const jiix = blockData.jiix;
          if (jiix) {
            editor.import_(jiix, 'application/vnd.myscript.jiix');
          }
          break;
        case 'TEXT':
          const strokeGroups = blockData.strokeGroups;
          if (strokeGroups) {
            editor.eastereggs.importStrokeGroups(editor, strokeGroups);
          }
          break;
        default:
          throw new Error(`Unexpected block type in notebook: ${type}`);
        }
        // Here Rob attempts to add a button to the blockElt for saving
        // as a thought
        layerElt.appendChild(blockElt);
        var saveButton = addEditorControls(td,blockElt.editor);
        layerElt.appendChild(saveButton);        
      }
      pageElt.appendChild(layerElt);
    }
    pagesElt.appendChild(pageElt);
  }
}

// Returns the notebook object from the current HTML DOM.
export function serializeNotebook(pagesElt) {
  // REVIEW: It would be safer to only get the immediate descendants of the pagesElt.
  const pageElts = pagesElt.getElementsByClassName('page');
  const notebook = {
    pages: Array.prototype.map.call(pageElts, function(pageElt){
      const layerElts = pageElt.getElementsByClassName('layer');
      return {
        layers: Array.prototype.map.call(layerElts, function(layerElt){
          const blockElts = layerElt.getElementsByClassName('editor');
          return {
            blocks: Array.prototype.map.call(blockElts, function(blockElt){
              const editor = blockElt.editor;
              const type = editor.configuration.recognitionParams.type;
              let rval;
              switch(type) {
              case 'MATH':
                const jiix = editor.exports && editor.exports['application/vnd.myscript.jiix'];
                rval = { type, jiix };
                break;
              case 'TEXT':
                const strokeGroups = editor.model.strokeGroups;
                rval = { type, strokeGroups };
                break;
              default:
                throw new Error(`Unexpected block type in notebook: ${type}`);
              }
              if (blockElt.style.height) {
                rval.height = blockElt.style.height;
              }
              return rval;
            })
          }
        })
      }
    })
  };
  return notebook;
}

// Event Handlers

function onMyScriptExported(event) {
  const saveButtonElt = document.getElementById('saveButton');
  saveButtonElt.disabled = false;
}

// Helper Functions

// Add some controls to the editor so that we can,
// for example, save its content as a thought.
function addSomethingToTDoc(td,editor) {
  let th = new thought();

  const type = editor.configuration.recognitionParams.type;
  switch(type) {
  case 'MATH':
    const latex = editor.exports && editor.exports['application/x-latex'];
    let stm = new mathStyle(th,latex);
    td.styles.push(stm);
    const jiix = editor.exports && editor.exports['application/vnd.myscript.jiix'];
    let stji = new jiixStyle(th,jiix);
    td.styles.push(stji);
    break;
  case 'TEXT':
    const text = editor.exports && editor.exports['text/plain'];    
    let stt = new textStyle(th,text);
    td.styles.push(stt);
    const strokeGroups = editor.model.strokeGroups;    
    let stsg = new strokeGroupsStyle(th,strokeGroups);
    td.styles.push(stsg);
    break;
  default:
    throw new Error(`Unexpected block type in notebook: ${type}`);
  }
  td.thoughts.push(th);
  const enhanceButtonElt = document.getElementById('enhanceButton');
  enhanceButtonElt.disabled = false;
  
  let sp = summaryPrinter(td);
  alert("Here is the TDoc: "+ sp);  
}
function addEditorControls(td,editor) {
  const button = document.createElement('button');
  button.classList.add('editor-save-thought-button');
  button.type    = "button";
  button.innerText   = "add to TDoc";
  button.onclick = (() => addSomethingToTDoc(td,editor));
  return button;
}
function createDiv(className) {
  const elt = document.createElement('div');
  elt.classList.add(className);
  return elt;
}

// MyScript credentials are in the data-applicationkey and data-hmackey of the root <html> element.
function getMyScriptKeys() {
  const htmlElement = document.documentElement;
  return {
    applicationKey: htmlElement.dataset.applicationkey,
    hmacKey: htmlElement.dataset.hmackey,
  }
}
