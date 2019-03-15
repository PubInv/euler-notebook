/*
  apple-pencil-browser experiment

  Based on https://github.com/quietshu/apple-pencil-safari-api-test.
*/
(function(){

  let context;
  let lineWidth;
  let isMouseDown;
  let points;

  function domLoaded() {
    // const $force = document.querySelectorAll('#force')[0]
    // const $touches = document.querySelectorAll('#touches')[0]
    const canvas = document.querySelectorAll('canvas')[0];

    context = canvas.getContext('2d');
    lineWidth = 0;
    isMouseDown = false;
    points = [];

    canvas.width = window.innerWidth * 2;
    canvas.height = window.innerHeight * 2;

    canvas.addEventListener('touchstart', onTouchStart);
    canvas.addEventListener('mousedown', onTouchStart);

    canvas.addEventListener('touchmove', onTouchMove);
    canvas.addEventListener('mousemove', onTouchMove);

    canvas.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('touchleave', onTouchEnd);
    canvas.addEventListener('mouseup', onTouchEnd);
  }

  function main() {
    document.addEventListener("DOMContentLoaded", domLoaded);
  }

  function onTouchEnd(e) {
    isMouseDown = false;
    const { x, y, pressure } = xypFromTouchEvent(e);
    context.strokeStyle = 'black';
    context.lineCap = 'round';
    context.lineJoin = 'round';
    if (points.length >= 3) {
      const l = points.length - 1;
      context.quadraticCurveTo(points[l].x, points[l].y, x, y);
      context.stroke();
    }
    points = [];
    lineWidth = 0;
  }

  function onTouchMove(e) {
    if (!isMouseDown) return;
    const { x, y, pressure } = xypFromTouchEvent(e);
    lineWidth = (Math.log(pressure + 1) * 40 * 0.4 + lineWidth * 0.6);
    points.push({ x, y, lineWidth });
    context.strokeStyle = 'black';
    context.lineCap = 'round';
    context.lineJoin = 'round';
    // context.lineWidth   = lineWidth// pressure * 50;
    // context.lineTo(x, y);
    // context.moveTo(x, y);
    if (points.length >= 3) {
      const l = points.length - 1;
      const xc = (points[l].x + points[l - 1].x) / 2;
      const yc = (points[l].y + points[l - 1].y) / 2;
      context.lineWidth = points[l - 1].lineWidth;
      context.quadraticCurveTo(points[l - 1].x, points[l - 1].y, xc, yc);
      context.stroke();
      context.beginPath();
      context.moveTo(xc, yc);
    }
    // $force.innerHTML = 'force = ' + pressure
    // $touches.innerHTML = 'touchev = ' + (e.touches ? JSON.stringify(e.touches[0]) : '')
    e.preventDefault();
  }

  function onTouchStart(e) {
    isMouseDown = true;
    const { x, y, pressure } = xypFromTouchEvent(e);
    // lineWidth = (pressure * 50 * 0.8 + lineWidth * 0.2)
    context.lineWidth = lineWidth;// pressure * 50;
    context.strokeStyle = 'black';
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(x, y);
    points.push({ x, y, lineWidth });
  }

  function xypFromTouchEvent(e) {
    let pressure = 0.1;
    let x, y;
    if (e.touches && e.touches[0] && typeof e.touches[0]["force"] !== "undefined") {
      if (e.touches[0]["force"] > 0) {
        pressure = e.touches[0]["force"];
      }
      x = e.touches[0].pageX * 2;
      y = e.touches[0].pageY * 2;
    } else {
      pressure = 1.0;
      x = e.pageX * 2;
      y = e.pageY * 2;
    }
    return { x, y , pressure };
  }

  main();

})();
