# apple-pencil-browser experiment

Experiment for gathering stylus strokes by a browser client.

Inspired by [quietshu/apple-pencil-safari-app-test](https://github.com/quietshu/apple-pencil-safari-api-test).

## To Do

* Try getting tilt. [Safari/iOS 10.3 exposes tilt and distinguishes touch and stylus](https://patrickhlauke.github.io/getting-touchy-presentation/#261).

## Events

See: [Getting Touchy: Everything you (n)ever wanted to know about touch and pointer events](https://patrickhlauke.github.io/getting-touchy-presentation/) by Patrick H. Lauke. With [Touch/pointer tests and demos](https://patrickhlauke.github.io/touch/). [Results](https://patrickhlauke.github.io/touch/tests/results/).

Kinds of events:

* Mouse events. [MDN](https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent)
* [Touch events](https://www.w3.org/TR/touch-events/). [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events); [Can I Use?](https://caniuse.com/#feat=touch)
* [Pointer events](https://www.w3.org/TR/pointerevents/). Introduced by Microsoft in IE10. Unified mouse, touch, and pen. [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events); [Can I Use?](https://caniuse.com/#feat=pointer); [Pointer events polyfill](https://github.com/jquery/PEP)
* Force Touch - Apple's proprietary extension to mouse events only aimed at force-enabled trackpads. `webkitmouseforcedown` event, etc.
* 3D Touch

## Other

* [Hammer](https://hammerjs.github.io) is a library for touch gestures in web apps.
* [PressureJS](https://pressurejs.com) is a device-independent way to detect how hard the user is pressing on a U.I. element, however it does not track the x,y coordinates. It does handle Force Touch, 3D Touch, Pointer Events, and polyfills for non-touch-sensitive devices.

* [Apple Pencil blocking Finger Touch Events](https://forums.developer.apple.com/thread/89773)
* [No simultaneous touch from pencil and finger](https://forums.developer.apple.com/message/331681#331681)
* [Lag in simultaneous finger and Apple Pencil touches](https://forums.developer.apple.com/message/174220#174220)