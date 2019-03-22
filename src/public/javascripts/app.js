(function(){

  // Constants
  const MYSCRIPT_RECO_PARAMS = {
    protocol: 'WEBSOCKET',
    apiVersion: 'V4',
    v4: {
      text: {
        guides: { enable: false }
      },
      math: {
        mimeTypes: ['application/x-latex', 'application/vnd.myscript.jiix']
      },
    }
  };

  // Globals
  let myscriptKeys; // initialized in onDomReady.

  // Functions
  //   in alphabetical order

  function apiRequest(method) {
    return new Promise((resolve, reject)=>{
      const xhr = new XMLHttpRequest();
      xhr.open('GET', `/api/${method}`);
      xhr.onload = function() {
        if (xhr.status === 200) {
          try {
            const results = JSON.parse(xhr.responseText);
            resolve(results);
          } catch (err) {
            reject(new Error(`Invalid JSON returned from ${method} request: ${err.message}`));
          }
        } else {
          reject(new Error(`${method} request failed with status of ${xhr.status}`));
        }
      };
      xhr.send();
    });
  }

  function createDiv(className) {
    const elt = document.createElement('div');
    elt.classList.add(className);
    return elt;
  }

  function instantiateNotebook(notebook) {
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
          const blockConfig = { 
            recognitionParams: { ...MYSCRIPT_RECO_PARAMS, server: myscriptKeys, type: blockData.type } 
          };
          // REVIEW: Any problem registering the element before it is added to the DOM?
          MyScript.register(blockElt, blockConfig);
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
      const htmlElement = document.documentElement;
      const applicationKey = htmlElement.dataset.applicationkey;
      const hmacKey = htmlElement.dataset.hmackey;
      myscriptKeys = { applicationKey, hmacKey };

      const notebook = await apiRequest('open');
      instantiateNotebook(notebook);
      showStatusMessage('Notebook opened successfully.');
    } catch (err) {
      showErrorHeader("Error initializing page", err);
    }
  }

  // function onMathExported(event) {
  //   console.dir(event);
  // }

  // function onTextExported(event) {
  //   console.dir(event);
  // }

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