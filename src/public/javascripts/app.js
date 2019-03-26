
// Requirements

// import { apiGetRequest, apiPostRequest } from './api.js';
// import { deserializeNotebook, serializeNotebook } from './notebook.js';
// import { tdoc, numMathStyles, numTextStyles,
//          mathSimplifyRule, applyStyle} from './tdoc.js';

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

// Global Variables

var GLOBAL_TDOC;

// Event Handlers

async function onDomReady(_event){
  try {
    document.getElementById('bannerClose').addEventListener('click', hideBanner);

    document.getElementById('textInputButton').addEventListener('click', switchToTextInput);
    document.getElementById('mathInputButton').addEventListener('click', switchToMathInput);

    const textEditorElt = document.getElementById('textEditor');
    const textEditorConfig = getMyScriptConfig('TEXT');
    MyScript.register(textEditorElt, textEditorConfig);

    const mathEditorElt = document.getElementById('mathEditor');
    const mathEditorConfig = getMyScriptConfig('MATH');
    MyScript.register(mathEditorElt, mathEditorConfig);

    // // Open a notebook
    // const openResults = await apiGetRequest('open');
    // // TODO: check openResults.ok
    // const pagesElt = document.getElementById('pages');

    // // Rob proposes that a notebook have a reference to a backing TDoc
    // // At the moment this TDoc is volatile, it is not persistent
    // // and is created on the fly. It can only be viewed through a separate action.
    // //    deserializeNotebook(pagesElt, openResults.notebook);
    // //    deserializeNotebook(pagesElt, openResults.notebook, new tdoc());
    // GLOBAL_TDOC  = new tdoc();
    // deserializeNotebook(pagesElt, openResults.notebook, GLOBAL_TDOC);
    // showStatusMessage("Notebook opened successfully.");

    // const saveButtonElt = document.getElementById('saveButton');
    // saveButtonElt.addEventListener('click', onSaveButtonClicked);

    // const enhanceButtonElt = document.getElementById('enhanceButton');
    // enhanceButtonElt.addEventListener('click', onEnhanceButtonClicked);
  } catch (err) {
    showErrorHeader("Error initializing page", err);
  }
}

// async function onSaveButtonClicked(event) {
//   try {
//     const pagesElt = document.getElementById('pages');
//     const notebook = serializeNotebook(pagesElt);
//     await apiPostRequest('save', { notebook });
//     this.disabled = true;
//     showStatusMessage("Notebook saved successfully.");
//   } catch(err) {
//     showErrorHeader("Error saving notebook", err);
//   }
// }

// function onEnhanceButtonClicked(event) {
//   try {
//     let ms0 = numMathStyles(GLOBAL_TDOC);
//     let r = mathSimplifyRule;
//     GLOBAL_TDOC = applyStyle(GLOBAL_TDOC,[r]);
//     let ms1 = numMathStyles(GLOBAL_TDOC);
//     this.disabled = true;
//     let numEnhancements = ms1 - ms0;
//     showStatusMessage(numEnhancements > 0 ? `Found ${numEnhancements} simplifications`
//                       : 'No mathematical simplications found');
//     console.log(GLOBAL_TDOC);
//   } catch(err) {
//     console.log("Error",err);
//     showErrorHeader("Error enhanceing TDOC", err);
//   }
// }

// Helper Functions

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
  const htmlElement = document.documentElement;
  return {
    applicationKey: htmlElement.dataset.applicationkey,
    hmacKey: htmlElement.dataset.hmackey,
  }
}

function hideBanner(_event) {
  document.getElementById('banner').style.display = 'none';
}

function showErrorHeader(msg, err) {
  const errorHeader = document.getElementById('errorHeader');
  errorHeader.innerText = msg + (err ? ': ' + err.message : '');
  errorHeader.style.display = 'block';
}

function showStatusMessage(msg) {
  console.log(msg);
}

function switchToMathInput(_event) {
  document.getElementById('textInput').style.display = 'none';
  document.getElementById('textInputButton').disabled = false;
  document.getElementById('mathInput').style.display = 'flex';
  document.getElementById('mathInputButton').disabled = true;
}

function switchToTextInput(_event) {
  document.getElementById('mathInput').style.display = 'none';
  document.getElementById('mathInputButton').disabled = false;
  document.getElementById('textInput').style.display = 'flex';
  document.getElementById('textInputButton').disabled = true;
}

// Application Entry Point

function main(){
  window.addEventListener('DOMContentLoaded', onDomReady);
}

main();
