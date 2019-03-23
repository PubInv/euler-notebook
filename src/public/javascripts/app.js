(function(){

  // Constants
  const MYSCRIPT_RECO_PARAMS = {
    protocol: 'WEBSOCKET',
    apiVersion: 'V4',
    v4: {
      export: {
        jiix: { strokes: true }
      },
      math: {
        mimeTypes: ['application/x-latex', 'application/vnd.myscript.jiix']
      },
      text: {
        guides: { enable: false }
      },
    },
  };

  // Globals
  let myscriptKeys; // initialized in onDomReady.

  // Functions
  //   in alphabetical order

  function apiGetRequest(method) {
    return new Promise((resolve, reject)=>{
      const xhr = new XMLHttpRequest();
      xhr.open('GET', `/api/${method}`);
      xhr.onload = function() {
        if (xhr.status === 200) {
          try {
            const results = JSON.parse(xhr.responseText);
            resolve(results);
          } catch (err) {
            reject(new Error(`Ajax GET /api/${method} returned invalid JSON: ${err.message}`));
          }
        } else {
          reject(new Error(`Ajax GET /api/${method} request failed: status ${xhr.status}`));
        }
      };
      xhr.send();
    });
  }

  function apiPostRequest(method, data) {
    return new Promise((resolve, reject)=>{
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/${method}`);
      xhr.onload = function() {
        if (xhr.status === 200) {
          try {
            const results = JSON.parse(xhr.responseText);
            resolve(results);
          } catch (err) {
            reject(new Error(`Ajax POST /api/${method} returned invalid JSON: ${err.message}`));
          }
        } else {
          reject(new Error(`Ajax POST /api/${method} request failed: status ${xhr.status}`));
        }
      };
      xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      xhr.send(JSON.stringify(data));
    });
  }

  function createDiv(className) {
    const elt = document.createElement('div');
    elt.classList.add(className);
    return elt;
  }

  // Instantiates the HTML DOM structure from a notebook object.
  function deserializeNotebook(notebook) {
    // REVIEW: Assumes #pages element is empty. Assert or delete any existig children?
    const pagesElt = document.getElementById('pages');
    // REVIEW: Error if notebook has no pages?
    for (const pageData of notebook.pages||[]) {
      const pageElt = createDiv('page');
      // REVIEW: Error if page has no layers?
      for (const layerData of pageData.layers||[]) {
        const layerElt = createDiv('layer');
        for (const blockData of layerData.blocks||[]) {
          const blockElt = createDiv('editor');
          blockElt.addEventListener('exported', onMyScriptExported);
          const blockConfig = {
            recognitionParams: { ...MYSCRIPT_RECO_PARAMS, server: myscriptKeys, type: blockData.type }
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
              console.log("IMPORTING STROKE GROUPS");
              console.dir(strokeGroups);
              editor.eastereggs.importStrokeGroups(editor, strokeGroups);
            }
            break;
          default:
            // TODO: How to handle this error?
            console.error(`Unexpected block type in deserialize: ${type}`);
          }
          layerElt.appendChild(blockElt);
        }
        pageElt.appendChild(layerElt);
      }
      pagesElt.appendChild(pageElt);
    }
  }

  function main(){
    window.addEventListener('DOMContentLoaded', onDomReady);
  }

  async function onDomReady(event){
    try {

      // MyScript credentials are in the data-applicationkey and data-hmackey of the root <html> element.
      // Store them in a global for future use.
      const htmlElement = document.documentElement;
      const applicationKey = htmlElement.dataset.applicationkey;
      const hmacKey = htmlElement.dataset.hmackey;
      myscriptKeys = { applicationKey, hmacKey };

      // Open a notebook
      const openResults = await apiGetRequest('open');
      // TODO: check openResults.ok
      deserializeNotebook(openResults.notebook);
      showStatusMessage("Notebook opened successfully.");

      const saveButtonElt = document.getElementById('saveButton');
      saveButtonElt.addEventListener('click', onSaveButtonClicked);

    } catch (err) {
      showErrorHeader("Error initializing page", err);
    }
  }

  function onMyScriptExported(event) {
    const saveButtonElt = document.getElementById('saveButton');
    saveButtonElt.disabled = false;
  }

  async function onSaveButtonClicked(event) {
    const notebook = serializeNotebook();
    try {
      await apiPostRequest('save', { notebook });
    } catch(err) {
      showErrorHeader("Error saving notebook", err);
      return;
    }
    this.disabled = true;
    showStatusMessage("Notebook saved successfully.");
  }

  // Returns the notebook object from the current HTML DOM.
  function serializeNotebook() {
    const pagesElt = document.getElementById('pages');
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
                switch(type) {
                case 'MATH':
                  const jiix = editor.exports && editor.exports['application/vnd.myscript.jiix'];
                  return { type, jiix };
                case 'TEXT':
                  const strokeGroups = editor.model.strokeGroups;
                  console.log("EXPORTING STROKE GROUPS");
                  console.dir(strokeGroups);
                  return { type, strokeGroups };
                default:
                  // TODO: How to handle this error?
                  console.error(`Unexpected block type in serialize: ${type}`);
                  return { type };
                }
              })
            }
          })
        }
      })
    };
    return notebook;
  }

  function showErrorHeader(msg, err) {
    const errorHeader = document.getElementById('errorHeader');
    errorHeader.innerText = msg + (err ? ': ' + err.message : '');
    errorHeader.style.display = 'block';
  }

  function showStatusMessage(msg) {
    console.log(msg);
  }

  main();
})()