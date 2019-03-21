(function(){

  function main(){
    window.addEventListener('DOMContentLoaded', onDomReady);
  }

  function onDomReady(event){

    const htmlElement = document.documentElement;
    const applicationKey = htmlElement.dataset.applicationkey;
    const hmacKey = htmlElement.dataset.hmackey;
    const baseRecoParams = {
      protocol: 'WEBSOCKET',
      apiVersion: 'V4',
      server: { applicationKey, hmacKey },
      v4: {
        text: { 
          guides: { enable: false } 
        },
        math: {
          mimeTypes: ['application/x-latex', 'application/vnd.myscript.jiix']
        },
        }
    };

    const textBlock = document.getElementById('textblock');
    textBlock.addEventListener('exported', onTextExported);
    const textConfig = { recognitionParams: { ...baseRecoParams, type: 'TEXT' } };
    MyScript.register(textBlock, textConfig);

    const mathBlock = document.getElementById('mathblock');
    mathBlock.addEventListener('exported', onMathExported);
    const mathConfig = { recognitionParams: { ...baseRecoParams, type: 'MATH' } };
    MyScript.register(mathBlock, mathConfig);
  }

  function onMathExported(event) {
    console.dir(event);
  }

  function onTextExported(event) {
    console.dir(event);
  }

  main();
})()