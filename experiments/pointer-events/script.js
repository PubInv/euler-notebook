
(function(){

  const POINTER_EVENTS = [ 'pointerover', 'pointerout', 'pointerenter', 'pointerleave' ];

  let $lastStoke;
  let $moveCoords;
  let strokes = {}; // indexed by pointer id.

  function abortStroke(strokes, event) {
    delete strokes[event.pointerId];
  }

  function endStroke(clientRect, strokes, event) {
    const stroke = strokes[event.pointerId];
    if (!stroke) { console.error(`No stroke to end: ${event.pointerId}`); return }
    extendStroke(clientRect, strokes, event);
    $lastStroke.innerText = `${stroke.type}\nx: ${stroke.x.join(',')}\ny: ${stroke.y.join(',')}\nt: ${stroke.t.join(',')}\np: ${stroke.p.join(',')}\ntx: ${stroke.tx.join(',')}\nty: ${stroke.ty.join(',')}`;
    abortStroke(strokes, event);
  }

  function extendStroke(clientRect, strokes, event) {
    const stroke = strokes[event.pointerId];
    if (!stroke) {
      console.error(`Can't add coordinates to unknown stroke: ${event.pointerId}`);
      return;
    }

    let x = event.clientX - clientRect.left;
    let y = event.clientY - clientRect.top;

    // Round to one decimal
    x = Math.round(x*10)/10;
    y = Math.round(y*10)/10;

    $moveCoords.innerText = `(${x}, ${y})`;
    stroke.x.push(x);
    stroke.y.push(y);
    stroke.t.push(Date.now());
    stroke.p.push(event.pressure);
    stroke.tx.push(event.tiltX);
    stroke.ty.push(event.tiltY);
  }

  function isStroking(strokes, event) {
    return !!strokes[event.pointerId];
  }

  function startStroke(clientRect, strokes, event) {
    strokes[event.pointerId] = { type: event.pointerType, x: [], y: [], t: [], p: [], tx: [], ty: [] };
    extendStroke(clientRect, strokes, event);
  }

  window.addEventListener('DOMContentLoaded', (event) => {
    // console.log('DOMContentLoaded');

    $lastStroke = document.getElementById('lastStroke');
    $moveCoords = document.getElementById('moveCoords');
    const $writingArea = document.getElementById('writingArea');

    // for (const eventName of POINTER_EVENTS) {
    //   $writingArea.addEventListener(eventName, function(event){
    //     console.log(event.type);
    //   });
    // }

    $writingArea.addEventListener('pointercancel', function(event){
      if (!isStroking(strokes, event)) { return; }
      // REVIEW: do we need to?: this.releasePointerCapture(event.pointerId);
      console.log('pointer cancel');
      abortStroke(strokes, event);
    });

    $writingArea.addEventListener('pointerdown', function(event){
      if (isStroking(strokes, event)) {
        console.error(`Down event without prior up event for pointer ${event.pointerId}.`);
        abortStroke(strokes, event);
      }
      console.dir(event);
      this.setPointerCapture(event.pointerId);
      const clientRect = this.getBoundingClientRect();
      startStroke(clientRect, strokes, event);
    });

    $writingArea.addEventListener('pointerup', function(event){
      if (!isStroking(strokes, event)) {
        console.log(`Ignoring up event for pointer ${event.pointerId}.`);
        return;
      }
      this.releasePointerCapture(event.pointerId);
      const clientRect = this.getBoundingClientRect();
      endStroke(clientRect, strokes, event);
    });

    $writingArea.addEventListener('pointermove', function(event){
      if (!isStroking(strokes, event)) { return; }
      const clientRect = this.getBoundingClientRect();
      extendStroke(clientRect, strokes, event);
    });
  });

})();
