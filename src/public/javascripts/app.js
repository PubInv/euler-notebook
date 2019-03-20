(function(){

  function main(){
    window.addEventListener('DOMContentLoaded', onDomReady);
  }

  function onDomReady(event){
    const editorElement = document.getElementById('editor');
    const applicationKey = editorElement.dataset.applicationkey;
    const hmacKey = editorElement.dataset.hmackey;
    const configuration = {
      recognitionParams: {
        type: 'TEXT',
        protocol: 'WEBSOCKET',
        apiVersion: 'V4',
        server: { applicationKey, hmacKey }
      }
    }
    console.dir(configuration);
    MyScript.register(editorElement, configuration);
  }

  main();
})()