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

// TODO: Check that user has permissions to read the notebook.

// Requirements

import { Writable } from 'stream';

import * as debug1 from "debug";
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

import { NextFunction, Request, Response, Router } from "express";

import { NotebookPath, NOTEBOOK_PATH_RE } from "../shared/folder";
import { ServerNotebook } from "../server-notebook";
import * as PDFDocument from "pdfkit";
// @ts-ignore
import * as SVGtoPDF from "svg-to-pdfkit";
import { StrokeData } from '../shared/stylus';
import { Stroke } from '../shared/myscript-types';


// This is a fun extention suggested by the SVGtoPDF makers...

// Possibly this could be typed; not sure---maybe we could type
// our addition?
// @ts-ignore
PDFDocument.prototype.addSVG = function(svg, x, y, options) {
  return SVGtoPDF(this, svg, x, y, options), this;
};

// Types

type PathDAttribute = '{PathDAttribute}';

// Constants

// Globals

export var router = Router();

// Routes

router.get(NOTEBOOK_PATH_RE, onPdfPage);

// Route Handler Functions

async function onPdfPage(req: Request, res: Response, next: NextFunction): Promise<void> {
  const notebookPath = <NotebookPath>req.path;
  try {
    if (!ServerNotebook.isValidNotebookPath(notebookPath)) { return next(); }
    debug(`Exporting PDF of ${notebookPath}`);
    const notebook: ServerNotebook = await ServerNotebook.open(notebookPath, { mustExist: true });
    res.setHeader('Content-type', 'application/pdf');
    await generatePdf(res, notebook);
    notebook.close();
  } catch(err) {
    res.status(404).send(`Can't export pdf of ${notebookPath}: ${err.message}`);
  }
}

// Helper Functions
// @ts-ignore
var lorem =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam in suscipit purus. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Vivamus nec hendrerit felis. Morbi aliquam facilisis risus eu lacinia. Sed eu leo in turpis fringilla hendrerit. Ut nec accumsan nisl. Suspendisse rhoncus nisl posuere tortor tempus et dapibus elit porta. Cras leo neque, elementum a rhoncus ut, vestibulum non nibh. Phasellus pretium justo turpis. Etiam vulputate, odio vitae tincidunt ultricies, eros odio dapibus nisi, ut tincidunt lacus arcu eu elit. Aenean velit erat, vehicula eget lacinia ut, dignissim non tellus. Aliquam nec lacus mi, sed vestibulum nunc. Suspendisse potenti. Curabitur vitae sem turpis. Vestibulum sed neque eget dolor dapibus porttitor at sit amet sem. Fusce a turpis lorem. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae;\nMauris at ante tellus. Vestibulum a metus lectus. Praesent tempor purus a lacus blandit eget gravida ante hendrerit. Cras et eros metus. Sed commodo malesuada eros, vitae interdum augue semper quis. Fusce id magna nunc. Curabitur sollicitudin placerat semper. Cras et mi neque, a dignissim risus. Nulla venenatis porta lacus, vel rhoncus lectus tempor vitae. Duis sagittis venenatis rutrum. Curabitur tempor massa tortor.';

// @ts-ignore
var sampleParabolicSVG =
`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="360pt" height="216pt" viewBox="0 0 360 216" version="1.1">
<defs>
<g>
<symbol overflow="visible" id="glyph0-0">
<path style="stroke:none;" d=""/>
</symbol>
<symbol overflow="visible" id="glyph0-1">
<path style="stroke:none;" d="M 1.234375 -1.78125 C 1.292969 -1.28125 1.527344 -0.933594 1.933594 -0.742188 C 2.140625 -0.644531 2.382812 -0.59375 2.65625 -0.59375 C 3.175781 -0.59375 3.5625 -0.761719 3.8125 -1.09375 C 4.0625 -1.425781 4.1875 -1.792969 4.1875 -2.195312 C 4.1875 -2.683594 4.039062 -3.0625 3.742188 -3.328125 C 3.445312 -3.597656 3.085938 -3.730469 2.671875 -3.730469 C 2.367188 -3.730469 2.109375 -3.671875 1.890625 -3.554688 C 1.675781 -3.4375 1.492188 -3.273438 1.335938 -3.066406 L 0.578125 -3.109375 L 1.109375 -6.875 L 4.742188 -6.875 L 4.742188 -6.023438 L 1.765625 -6.023438 L 1.46875 -4.082031 C 1.632812 -4.207031 1.789062 -4.296875 1.933594 -4.359375 C 2.195312 -4.46875 2.496094 -4.523438 2.835938 -4.523438 C 3.476562 -4.523438 4.023438 -4.316406 4.46875 -3.902344 C 4.914062 -3.488281 5.136719 -2.964844 5.136719 -2.328125 C 5.136719 -1.667969 4.933594 -1.085938 4.523438 -0.582031 C 4.117188 -0.078125 3.464844 0.175781 2.570312 0.175781 C 2 0.175781 1.496094 0.015625 1.058594 -0.304688 C 0.621094 -0.625 0.375 -1.117188 0.320312 -1.78125 Z M 1.234375 -1.78125 "/>
</symbol>
<symbol overflow="visible" id="glyph0-2">
<path style="stroke:none;" d="M 0.957031 -4.953125 L 0.957031 -5.625 C 1.59375 -5.6875 2.035156 -5.789062 2.285156 -5.933594 C 2.535156 -6.078125 2.722656 -6.421875 2.847656 -6.960938 L 3.539062 -6.960938 L 3.539062 0 L 2.601562 0 L 2.601562 -4.953125 Z M 0.957031 -4.953125 "/>
</symbol>
<symbol overflow="visible" id="glyph0-3">
<path style="stroke:none;" d="M 2.703125 -6.992188 C 3.609375 -6.992188 4.265625 -6.621094 4.667969 -5.875 C 4.980469 -5.296875 5.136719 -4.507812 5.136719 -3.507812 C 5.136719 -2.554688 4.996094 -1.769531 4.710938 -1.148438 C 4.300781 -0.257812 3.632812 0.191406 2.699219 0.191406 C 1.859375 0.191406 1.234375 -0.175781 0.824219 -0.902344 C 0.484375 -1.511719 0.3125 -2.328125 0.3125 -3.355469 C 0.3125 -4.148438 0.414062 -4.832031 0.621094 -5.398438 C 1.003906 -6.460938 1.699219 -6.992188 2.703125 -6.992188 Z M 2.695312 -0.609375 C 3.152344 -0.609375 3.515625 -0.8125 3.785156 -1.214844 C 4.054688 -1.617188 4.1875 -2.371094 4.1875 -3.472656 C 4.1875 -4.265625 4.09375 -4.917969 3.898438 -5.433594 C 3.703125 -5.945312 3.320312 -6.203125 2.757812 -6.203125 C 2.242188 -6.203125 1.863281 -5.957031 1.625 -5.472656 C 1.382812 -4.984375 1.265625 -4.265625 1.265625 -3.320312 C 1.265625 -2.609375 1.339844 -2.035156 1.492188 -1.601562 C 1.726562 -0.941406 2.128906 -0.609375 2.695312 -0.609375 Z M 2.695312 -0.609375 "/>
</symbol>
<symbol overflow="visible" id="glyph0-4">
<path style="stroke:none;" d="M 0.3125 0 C 0.34375 -0.601562 0.46875 -1.125 0.6875 -1.570312 C 0.902344 -2.015625 1.324219 -2.421875 1.953125 -2.789062 L 2.890625 -3.328125 C 3.3125 -3.574219 3.605469 -3.78125 3.773438 -3.953125 C 4.039062 -4.226562 4.175781 -4.535156 4.175781 -4.882812 C 4.175781 -5.289062 4.054688 -5.613281 3.808594 -5.851562 C 3.5625 -6.089844 3.238281 -6.210938 2.832031 -6.210938 C 2.230469 -6.210938 1.8125 -5.984375 1.582031 -5.527344 C 1.457031 -5.28125 1.390625 -4.945312 1.375 -4.511719 L 0.484375 -4.511719 C 0.492188 -5.121094 0.605469 -5.617188 0.820312 -6 C 1.203125 -6.679688 1.875 -7.015625 2.835938 -7.015625 C 3.636719 -7.015625 4.222656 -6.800781 4.59375 -6.367188 C 4.960938 -5.933594 5.148438 -5.453125 5.148438 -4.921875 C 5.148438 -4.363281 4.949219 -3.882812 4.554688 -3.484375 C 4.328125 -3.253906 3.917969 -2.976562 3.328125 -2.648438 L 2.660156 -2.273438 C 2.34375 -2.097656 2.089844 -1.933594 1.910156 -1.773438 C 1.585938 -1.488281 1.378906 -1.175781 1.292969 -0.828125 L 5.113281 -0.828125 L 5.113281 0 Z M 0.3125 0 "/>
</symbol>
<symbol overflow="visible" id="glyph0-5">
<path style="stroke:none;" d="M 2.597656 0.191406 C 1.769531 0.191406 1.171875 -0.0351562 0.796875 -0.492188 C 0.425781 -0.945312 0.238281 -1.496094 0.238281 -2.148438 L 1.15625 -2.148438 C 1.195312 -1.695312 1.28125 -1.367188 1.410156 -1.164062 C 1.640625 -0.796875 2.050781 -0.609375 2.648438 -0.609375 C 3.109375 -0.609375 3.480469 -0.734375 3.757812 -0.980469 C 4.039062 -1.226562 4.179688 -1.546875 4.179688 -1.9375 C 4.179688 -2.421875 4.03125 -2.757812 3.738281 -2.949219 C 3.445312 -3.140625 3.035156 -3.238281 2.507812 -3.238281 C 2.449219 -3.238281 2.390625 -3.238281 2.332031 -3.234375 C 2.273438 -3.234375 2.210938 -3.230469 2.148438 -3.226562 L 2.148438 -4.003906 C 2.238281 -3.992188 2.316406 -3.988281 2.378906 -3.984375 C 2.441406 -3.980469 2.507812 -3.980469 2.578125 -3.980469 C 2.90625 -3.980469 3.175781 -4.03125 3.390625 -4.136719 C 3.761719 -4.320312 3.945312 -4.644531 3.945312 -5.113281 C 3.945312 -5.460938 3.820312 -5.730469 3.574219 -5.917969 C 3.328125 -6.105469 3.039062 -6.203125 2.710938 -6.203125 C 2.125 -6.203125 1.71875 -6.007812 1.492188 -5.617188 C 1.371094 -5.402344 1.300781 -5.09375 1.285156 -4.695312 L 0.414062 -4.695312 C 0.414062 -5.21875 0.519531 -5.660156 0.726562 -6.023438 C 1.085938 -6.675781 1.714844 -7 2.617188 -7 C 3.328125 -7 3.882812 -6.84375 4.273438 -6.527344 C 4.664062 -6.210938 4.859375 -5.75 4.859375 -5.148438 C 4.859375 -4.71875 4.742188 -4.367188 4.511719 -4.101562 C 4.367188 -3.9375 4.183594 -3.804688 3.953125 -3.710938 C 4.320312 -3.609375 4.609375 -3.414062 4.816406 -3.128906 C 5.023438 -2.839844 5.125 -2.488281 5.125 -2.070312 C 5.125 -1.402344 4.90625 -0.859375 4.46875 -0.4375 C 4.027344 -0.0195312 3.40625 0.191406 2.597656 0.191406 Z M 2.597656 0.191406 "/>
</symbol>
</g>
<clipPath id="clip1">
  <path d="M 13 3 L 359 3 L 359 211 L 13 211 Z M 13 3 "/>
</clipPath>
</defs>
<g id="surface4">
<g clip-path="url(#clip1)" clip-rule="nonzero">
<path style="fill:none;stroke-width:1.6;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 216.300781 L 94.8125 216.300781 L 94.914062 216.296875 L 95.730469 216.296875 L 95.832031 216.292969 L 96.238281 216.292969 L 96.441406 216.289062 L 96.644531 216.289062 L 96.847656 216.285156 L 97.253906 216.28125 L 97.457031 216.28125 L 98.066406 216.269531 L 98.269531 216.269531 L 98.476562 216.265625 L 98.882812 216.257812 L 98.984375 216.257812 L 99.085938 216.253906 L 100.507812 216.226562 L 100.617188 216.222656 L 100.730469 216.222656 L 100.949219 216.214844 L 102.273438 216.179688 L 102.382812 216.175781 L 102.492188 216.175781 L 102.714844 216.167969 L 103.15625 216.152344 L 104.035156 216.125 L 104.148438 216.121094 L 104.476562 216.109375 L 104.917969 216.09375 L 105.800781 216.058594 L 107.566406 215.980469 L 107.667969 215.972656 L 107.769531 215.96875 L 107.976562 215.957031 L 108.386719 215.9375 L 109.210938 215.894531 L 110.859375 215.804688 L 110.960938 215.796875 L 111.066406 215.792969 L 111.269531 215.777344 L 111.683594 215.753906 L 112.507812 215.703125 L 114.152344 215.589844 L 114.253906 215.582031 L 114.355469 215.578125 L 114.558594 215.5625 L 114.960938 215.53125 L 115.769531 215.472656 L 117.382812 215.34375 L 117.585938 215.328125 L 117.785156 215.3125 L 118.191406 215.277344 L 118.996094 215.207031 L 120.613281 215.0625 L 120.722656 215.050781 L 120.832031 215.042969 L 121.050781 215.023438 L 122.363281 214.894531 L 124.117188 214.714844 L 127.621094 214.324219 L 128.027344 214.277344 L 128.4375 214.226562 L 129.253906 214.128906 L 130.890625 213.921875 L 134.160156 213.480469 L 141.246094 212.398438 L 148.203125 211.167969 L 154.691406 209.863281 L 161.730469 208.285156 L 168.300781 206.652344 L 174.742188 204.910156 L 181.726562 202.851562 L 188.25 200.777344 L 195.316406 198.363281 L 202.253906 195.824219 L 208.726562 193.300781 L 215.746094 190.402344 L 222.296875 187.539062 L 229.394531 184.269531 L 236.363281 180.886719 L 242.863281 177.578125 L 249.914062 173.824219 L 256.496094 170.164062 L 262.945312 166.425781 L 269.945312 162.207031 L 276.476562 158.117188 L 283.558594 153.515625 L 290.507812 148.824219 L 296.992188 144.300781 L 304.019531 139.226562 L 310.582031 134.335938 L 317.015625 129.394531 L 323.996094 123.867188 L 330.511719 118.558594 L 337.570312 112.636719 L 344.164062 106.949219 L 350.628906 101.222656 L 357.640625 94.851562 L 364.183594 88.746094 L 371.273438 81.960938 L 378.234375 75.132812 L 384.730469 68.605469 L 391.773438 61.367188 L 398.347656 54.449219 L 404.789062 47.523438 L 411.785156 39.84375 L 418.308594 32.519531 L 418.761719 32.003906 L 419.21875 31.488281 L 420.128906 30.453125 L 421.949219 28.371094 L 422.0625 28.242188 L 422.175781 28.109375 L 422.40625 27.847656 L 422.859375 27.324219 L 423.769531 26.277344 L 423.882812 26.148438 L 424 26.015625 L 424.226562 25.753906 L 424.679688 25.226562 L 424.796875 25.097656 L 425.136719 24.699219 L 425.25 24.570312 L 425.476562 24.304688 L 425.59375 24.171875 " transform="matrix(1,0,0,1,-74,-13)"/>
</g>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 214.679688 L 94 210.679688 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 111.589844 214.679688 L 111.589844 212.277344 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 129.183594 214.679688 L 129.183594 212.277344 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 146.773438 214.679688 L 146.773438 212.277344 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 164.367188 214.679688 L 164.367188 212.277344 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 181.957031 214.679688 L 181.957031 210.679688 " transform="matrix(1,0,0,1,-74,-13)"/>
<g style="fill:rgb(0%,0%,0%);fill-opacity:1;">
  <use xlink:href="#glyph0-1" x="104.957467" y="212.678078"/>
</g>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 199.550781 214.679688 L 199.550781 212.277344 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 217.140625 214.679688 L 217.140625 212.277344 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 234.730469 214.679688 L 234.730469 212.277344 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 252.324219 214.679688 L 252.324219 212.277344 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 269.914062 214.679688 L 269.914062 210.679688 " transform="matrix(1,0,0,1,-74,-13)"/>
<g style="fill:rgb(0%,0%,0%);fill-opacity:1;">
  <use xlink:href="#glyph0-2" x="190.414933" y="212.678078"/>
  <use xlink:href="#glyph0-3" x="195.976456" y="212.678078"/>
</g>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 287.507812 214.679688 L 287.507812 212.277344 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 305.097656 214.679688 L 305.097656 212.277344 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 322.6875 214.679688 L 322.6875 212.277344 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 340.28125 214.679688 L 340.28125 212.277344 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 357.871094 214.679688 L 357.871094 210.679688 " transform="matrix(1,0,0,1,-74,-13)"/>
<g style="fill:rgb(0%,0%,0%);fill-opacity:1;">
  <use xlink:href="#glyph0-2" x="278.3724" y="212.678078"/>
  <use xlink:href="#glyph0-1" x="283.933923" y="212.678078"/>
</g>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 375.464844 214.679688 L 375.464844 212.277344 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 393.054688 214.679688 L 393.054688 212.277344 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 410.648438 214.679688 L 410.648438 212.277344 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 428.238281 214.679688 L 428.238281 212.277344 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 87.09375 214.679688 L 432.5 214.679688 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 225.492188 L 96.398438 225.492188 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 220.085938 L 96.398438 220.085938 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 214.679688 L 98 214.679688 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 209.269531 L 96.398438 209.269531 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 203.863281 L 96.398438 203.863281 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 198.457031 L 96.398438 198.457031 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 193.046875 L 96.398438 193.046875 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 187.640625 L 98 187.640625 " transform="matrix(1,0,0,1,-74,-13)"/>
<g style="fill:rgb(0%,0%,0%);fill-opacity:1;">
  <use xlink:href="#glyph0-1" x="6" y="177.641281"/>
  <use xlink:href="#glyph0-3" x="11.561523" y="177.641281"/>
</g>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 182.234375 L 96.398438 182.234375 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 176.828125 L 96.398438 176.828125 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 171.417969 L 96.398438 171.417969 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 166.011719 L 96.398438 166.011719 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 160.605469 L 98 160.605469 " transform="matrix(1,0,0,1,-74,-13)"/>
<g style="fill:rgb(0%,0%,0%);fill-opacity:1;">
  <use xlink:href="#glyph0-2" x="0" y="150.604484"/>
  <use xlink:href="#glyph0-3" x="5.561523" y="150.604484"/>
  <use xlink:href="#glyph0-3" x="11.123047" y="150.604484"/>
</g>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 155.195312 L 96.398438 155.195312 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 149.789062 L 96.398438 149.789062 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 144.382812 L 96.398438 144.382812 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 138.976562 L 96.398438 138.976562 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 133.566406 L 98 133.566406 " transform="matrix(1,0,0,1,-74,-13)"/>
<g style="fill:rgb(0%,0%,0%);fill-opacity:1;">
  <use xlink:href="#glyph0-2" x="0" y="123.567686"/>
  <use xlink:href="#glyph0-1" x="5.561523" y="123.567686"/>
  <use xlink:href="#glyph0-3" x="11.123047" y="123.567686"/>
</g>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 128.160156 L 96.398438 128.160156 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 122.753906 L 96.398438 122.753906 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 117.34375 L 96.398438 117.34375 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 111.9375 L 96.398438 111.9375 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 106.53125 L 98 106.53125 " transform="matrix(1,0,0,1,-74,-13)"/>
<g style="fill:rgb(0%,0%,0%);fill-opacity:1;">
  <use xlink:href="#glyph0-4" x="0" y="96.530889"/>
  <use xlink:href="#glyph0-3" x="5.561523" y="96.530889"/>
  <use xlink:href="#glyph0-3" x="11.123047" y="96.530889"/>
</g>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 101.125 L 96.398438 101.125 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 95.714844 L 96.398438 95.714844 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 90.308594 L 96.398438 90.308594 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 84.902344 L 96.398438 84.902344 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 79.492188 L 98 79.492188 " transform="matrix(1,0,0,1,-74,-13)"/>
<g style="fill:rgb(0%,0%,0%);fill-opacity:1;">
  <use xlink:href="#glyph0-4" x="0" y="69.494092"/>
  <use xlink:href="#glyph0-1" x="5.561523" y="69.494092"/>
  <use xlink:href="#glyph0-3" x="11.123047" y="69.494092"/>
</g>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 74.085938 L 96.398438 74.085938 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 68.679688 L 96.398438 68.679688 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 63.273438 L 96.398438 63.273438 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 57.863281 L 96.398438 57.863281 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 52.457031 L 98 52.457031 " transform="matrix(1,0,0,1,-74,-13)"/>
<g style="fill:rgb(0%,0%,0%);fill-opacity:1;">
  <use xlink:href="#glyph0-5" x="0" y="42.457295"/>
  <use xlink:href="#glyph0-3" x="5.561523" y="42.457295"/>
  <use xlink:href="#glyph0-3" x="11.123047" y="42.457295"/>
</g>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 47.050781 L 96.398438 47.050781 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 41.640625 L 96.398438 41.640625 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 36.234375 L 96.398438 36.234375 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 30.828125 L 96.398438 30.828125 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 25.421875 L 98 25.421875 " transform="matrix(1,0,0,1,-74,-13)"/>
<g style="fill:rgb(0%,0%,0%);fill-opacity:1;">
  <use xlink:href="#glyph0-5" x="0" y="15.420498"/>
  <use xlink:href="#glyph0-1" x="5.561523" y="15.420498"/>
  <use xlink:href="#glyph0-3" x="11.123047" y="15.420498"/>
</g>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 20.011719 L 96.398438 20.011719 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 14.605469 L 96.398438 14.605469 " transform="matrix(1,0,0,1,-74,-13)"/>
<path style="fill:none;stroke-width:1;stroke-linecap:butt;stroke-linejoin:miter;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:3.25;" d="M 94 226.972656 L 94 13.5 " transform="matrix(1,0,0,1,-74,-13)"/>
</g>
</svg>`;

// @ts-ignore
var sampleQuadraticSVG =
`<svg class="foo" style="vertical-align: -0.797ex" xmlns="http://www.w3.org/2000/svg" width="14.762ex" height="3.262ex" role="img" focusable="false" viewBox="0 -1089.5 6524.9 1441.6" xmlns:xlink="http://www.w3.org/1999/xlink"><defs><path id="MJX-1-TEX-I-1D465" d="M52 289Q59 331 106 386T222 442Q257 442 286 424T329 379Q371 442 430 442Q467 442 494 420T522 361Q522 332 508 314T481 292T458 288Q439 288 427 299T415 328Q415 374 465 391Q454 404 425 404Q412 404 406 402Q368 386 350 336Q290 115 290 78Q290 50 306 38T341 26Q378 26 414 59T463 140Q466 150 469 151T485 153H489Q504 153 504 145Q504 144 502 134Q486 77 440 33T333 -11Q263 -11 227 52Q186 -10 133 -10H127Q78 -10 57 16T35 71Q35 103 54 123T99 143Q142 143 142 101Q142 81 130 66T107 46T94 41L91 40Q91 39 97 36T113 29T132 26Q168 26 194 71Q203 87 217 139T245 247T261 313Q266 340 266 352Q266 380 251 392T217 404Q177 404 142 372T93 290Q91 281 88 280T72 278H58Q52 284 52 289Z"></path><path id="MJX-1-TEX-N-3D" d="M56 347Q56 360 70 367H707Q722 359 722 347Q722 336 708 328L390 327H72Q56 332 56 347ZM56 153Q56 168 72 173H708Q722 163 722 153Q722 140 707 133H70Q56 140 56 153Z"></path><path id="MJX-1-TEX-N-2212" d="M84 237T84 250T98 270H679Q694 262 694 250T679 230H98Q84 237 84 250Z"></path><path id="MJX-1-TEX-I-1D44F" d="M73 647Q73 657 77 670T89 683Q90 683 161 688T234 694Q246 694 246 685T212 542Q204 508 195 472T180 418L176 399Q176 396 182 402Q231 442 283 442Q345 442 383 396T422 280Q422 169 343 79T173 -11Q123 -11 82 27T40 150V159Q40 180 48 217T97 414Q147 611 147 623T109 637Q104 637 101 637H96Q86 637 83 637T76 640T73 647ZM336 325V331Q336 405 275 405Q258 405 240 397T207 376T181 352T163 330L157 322L136 236Q114 150 114 114Q114 66 138 42Q154 26 178 26Q211 26 245 58Q270 81 285 114T318 219Q336 291 336 325Z"></path><path id="MJX-1-TEX-N-B1" d="M56 320T56 333T70 353H369V502Q369 651 371 655Q376 666 388 666Q402 666 405 654T409 596V500V353H707Q722 345 722 333Q722 320 707 313H409V40H707Q722 32 722 20T707 0H70Q56 7 56 20T70 40H369V313H70Q56 320 56 333Z"></path><path id="MJX-1-TEX-N-221A" d="M95 178Q89 178 81 186T72 200T103 230T169 280T207 309Q209 311 212 311H213Q219 311 227 294T281 177Q300 134 312 108L397 -77Q398 -77 501 136T707 565T814 786Q820 800 834 800Q841 800 846 794T853 782V776L620 293L385 -193Q381 -200 366 -200Q357 -200 354 -197Q352 -195 256 15L160 225L144 214Q129 202 113 190T95 178Z"></path><path id="MJX-1-TEX-N-32" d="M109 429Q82 429 66 447T50 491Q50 562 103 614T235 666Q326 666 387 610T449 465Q449 422 429 383T381 315T301 241Q265 210 201 149L142 93L218 92Q375 92 385 97Q392 99 409 186V189H449V186Q448 183 436 95T421 3V0H50V19V31Q50 38 56 46T86 81Q115 113 136 137Q145 147 170 174T204 211T233 244T261 278T284 308T305 340T320 369T333 401T340 431T343 464Q343 527 309 573T212 619Q179 619 154 602T119 569T109 550Q109 549 114 549Q132 549 151 535T170 489Q170 464 154 447T109 429Z"></path><path id="MJX-1-TEX-N-34" d="M462 0Q444 3 333 3Q217 3 199 0H190V46H221Q241 46 248 46T265 48T279 53T286 61Q287 63 287 115V165H28V211L179 442Q332 674 334 675Q336 677 355 677H373L379 671V211H471V165H379V114Q379 73 379 66T385 54Q393 47 442 46H471V0H462ZM293 211V545L74 212L183 211H293Z"></path><path id="MJX-1-TEX-I-1D44E" d="M33 157Q33 258 109 349T280 441Q331 441 370 392Q386 422 416 422Q429 422 439 414T449 394Q449 381 412 234T374 68Q374 43 381 35T402 26Q411 27 422 35Q443 55 463 131Q469 151 473 152Q475 153 483 153H487Q506 153 506 144Q506 138 501 117T481 63T449 13Q436 0 417 -8Q409 -10 393 -10Q359 -10 336 5T306 36L300 51Q299 52 296 50Q294 48 292 46Q233 -10 172 -10Q117 -10 75 30T33 157ZM351 328Q351 334 346 350T323 385T277 405Q242 405 210 374T160 293Q131 214 119 129Q119 126 119 118T118 106Q118 61 136 44T179 26Q217 26 254 59T298 110Q300 114 325 217T351 328Z"></path><path id="MJX-1-TEX-I-1D450" d="M34 159Q34 268 120 355T306 442Q362 442 394 418T427 355Q427 326 408 306T360 285Q341 285 330 295T319 325T330 359T352 380T366 386H367Q367 388 361 392T340 400T306 404Q276 404 249 390Q228 381 206 359Q162 315 142 235T121 119Q121 73 147 50Q169 26 205 26H209Q321 26 394 111Q403 121 406 121Q410 121 419 112T429 98T420 83T391 55T346 25T282 0T202 -11Q127 -11 81 37T34 159Z"></path></defs><g stroke="currentColor" fill="currentColor" stroke-width="0" transform="matrix(1 0 0 -1 0 0)"><g data-mml-node="math"><g data-mml-node="mi"><use xlink:href="#MJX-1-TEX-I-1D465"></use></g><g data-mml-node="mo" transform="translate(849.8, 0)"><use xlink:href="#MJX-1-TEX-N-3D"></use></g><g data-mml-node="mfrac" transform="translate(1905.6, 0)"><g data-mml-node="TeXAtom" transform="translate(220, 406.1) scale(0.707)" data-mjx-texclass="ORD"><g data-mml-node="mo"><use xlink:href="#MJX-1-TEX-N-2212"></use></g><g data-mml-node="mi" transform="translate(778, 0)"><use xlink:href="#MJX-1-TEX-I-1D44F"></use></g><g data-mml-node="mo" transform="translate(1207, 0)"><use xlink:href="#MJX-1-TEX-N-B1"></use></g><g data-mml-node="msqrt" transform="translate(1985, 0)"><g transform="translate(853, 0)"><g data-mml-node="msup"><g data-mml-node="mi"><use xlink:href="#MJX-1-TEX-I-1D44F"></use></g><g data-mml-node="mn" transform="translate(429, 289) scale(0.707)"><use xlink:href="#MJX-1-TEX-N-32"></use></g></g><g data-mml-node="mo" transform="translate(832.6, 0)"><use xlink:href="#MJX-1-TEX-N-2212"></use></g><g data-mml-node="mn" transform="translate(1610.6, 0)"><use xlink:href="#MJX-1-TEX-N-34"></use></g><g data-mml-node="mi" transform="translate(2110.6, 0)"><use xlink:href="#MJX-1-TEX-I-1D44E"></use></g><g data-mml-node="mi" transform="translate(2639.6, 0)"><use xlink:href="#MJX-1-TEX-I-1D450"></use></g></g><g data-mml-node="mo" transform="translate(0, 124)"><use xlink:href="#MJX-1-TEX-N-221A"></use></g><rect width="3072.6" height="42.4" x="853" y="881.6"></rect></g></g><g data-mml-node="TeXAtom" transform="translate(1945.9, -345) scale(0.707)" data-mjx-texclass="ORD"><g data-mml-node="mn"><use xlink:href="#MJX-1-TEX-N-32"></use></g><g data-mml-node="mi" transform="translate(500, 0)"><use xlink:href="#MJX-1-TEX-I-1D44E"></use></g></g><rect width="4379.4" height="60" x="120" y="220"></rect></g></g></g></svg>`;

async function generatePdf(res: Writable, notebook: ServerNotebook): Promise<void> {
  return new Promise(async (resolve, reject)=>{
    debug("AAA");
    let doc = new PDFDocument({
      size: "letter",
      bufferPages:true
    });
    res.on('finish', function() { resolve(); });
    res.on('error', function(err){ reject(err); });
    doc.pipe(res);

    const topMargin = parseInt(notebook.topMargin);
    const leftMargin = parseInt(notebook.leftMargin);
    var curY = topMargin;
    debug(notebook.allCells());
    for (const cell of notebook.allCells()) {
      if (cell.displaySvg) {
        // test svg kit:
        // not sure what options we might need!
        const options = null;
        SVGtoPDF(doc,cell.displaySvg,leftMargin,curY,options);
      }
      var curHgt = parseInt(cell.cssSize.height);
      renderStrokesIntoDoc(doc,leftMargin,curY,cell.strokeData);
      curY += curHgt;
    }
    //         const options = null;
    // SVGtoPDF(doc,sampleParabolicSVG,leftMargin,0,options);
    // SVGtoPDF(doc,sampleQuadraticSVG,leftMargin,0,options);

    doc.flushPages();
    doc.end();
  });
}


function renderStrokesIntoDoc(doc: typeof PDFDocument, x : number, y : number, strokeData: StrokeData) {
  for (const stroke of strokeData.strokes) {
    renderStrokeIntoDoc(doc,x,y,stroke);
  }
}

function renderStrokeIntoDoc(doc: typeof PDFDocument, x : number, y : number, stroke: Stroke) {
  // doc.path(shape).stroke() below assumes that the path (shape) is in points. However, our stroke data come in
  // in pixels. since pnts are 72/inch and pixels are 96/inch, pnts/px = 72/96, and multiplying converts pixels to points!
  const s = 72.0 / 96.0;
  let shape: PathDAttribute = <PathDAttribute>`M${s*stroke.x[0] + x } ${s*stroke.y[0] + y}`;
  for (let i=1; i<stroke.x.length; i++) {
    shape += ` L${s*stroke.x[i]+ x} ${s*stroke.y[i] + y}`
  }
  doc.path(shape).stroke();
}
