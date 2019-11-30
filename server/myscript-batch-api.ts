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

// NOTE: This is not a complete set of types for the library.
//       Just the stuff that we have used.
// NOTE: Optionality is not always correct.
// REVIEW: Should the be a .d.ts declaration file instead?

// Requirements

// REVIEW: Can we convert this to import notation?
const Hex = require('crypto-js/enc-hex');
const HmacSHA512 = require('crypto-js/hmac-sha512');
import * as debug1 from 'debug';
import fetch, { Response } from 'node-fetch';

import { LatexData } from '..//client/math-tablet-api';

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// Types

interface BatchRequest {
  configuration?: Configuration;
  contentType: 'Text'|'Math'|'Diagram'|'Raw Content'|'Text Document';
  // conversionState?:;
  // height?: number;
  strokeGroups: StrokeGroup[];
  // theme?: string;
  // width?: number;
  xDPI?: number;
  yDPI?: number;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Configuration {
  math: MathConfiguration;
  lang: /* TYPESCRIPT: Locale */string;
  export: ExportConfiguration;
}

interface ErrorResponse {
  code: string;
  message: string;
}

interface ExportConfiguration {
  'image-resolution': number;
  jiix: JiixConfiguration;
}

interface Expression {
  'bounding-box': BoundingBox;
  id: string;
  items: Item[];
  operands: Expression[];
  type: string;
}

interface Item {
  F: number[];
  id: string;
  T: number[];
  timestamp: /* TYPESCRIPT: TimestampString */string;
  type: 'stroke';
  X: number[];
  Y: number[];
}

export interface Jiix {
  // See https://developer.myscript.com/docs/interactive-ink/1.3/reference/jiix/
  type: 'Math';
  expressions: Expression[];
  'bounding-box': BoundingBox;
  id: string;
  version: '2';
}

interface JiixConfiguration {
  'bounding-box': boolean;
  strokes: boolean;
  text: { chars: boolean; words: boolean; }
}

interface MarginConfiguration {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

interface MathConfiguration {
  margin?: MarginConfiguration;
  mimeTypes: /* TYPESCRIPT: MimeType */ string[];
  solver?: SolverConfiguration;
}

export interface ServerKeys {
  applicationKey: string;
  hmacKey: string;
}

export interface Stroke {
  // id?: string;
  // p?: number[];
  // pointerId?: number;
  // pointerType?: 'PEN'|'TOUCH'|'ERASER';
  // t?: number[];
  x: number[];
  y: number[];
}

interface StrokeGroup {
  // penStyle?: string;
  // penStyleClasses?: string;
  strokes: Stroke[];
}

interface SolverConfiguration {
  enable: boolean;
  'fractional-part-digits': number;
  'decimal-separator': ".";
  'rounding-mode': 'half up';
  'angle-unit': 'deg';
}

// Constants

const JIIX_MIME_TYPE = 'application/vnd.myscript.jiix';
const LATEX_MIME_TYPE = 'application/x-latex';
const MYSCRIPT_BATCH_API_URL = 'https://webdemoapi.myscript.com/api/v4.0/iink/batch';

// Exported Functions

export async function postJiixRequest(keys: ServerKeys, strokes: Stroke[]): Promise<Jiix> {
  debug(`Calling MyScript batch API for JIIX.`);
  const batchRequest = batchRequestFromStrokes(strokes);
  const bodyText = await postRequest(keys, JIIX_MIME_TYPE, batchRequest);
  const jiix: Jiix|ErrorResponse = JSON.parse(bodyText);
  if (isErrorResponse(jiix)) { throwRequestError(jiix); }
  debug(`MyScript batch API recognized JIIX.`);
  // TYPESCRIPT: Why is this cast necessary?
  return <Jiix>jiix;
}

export async function postLatexRequest(keys: ServerKeys, strokes: Stroke[]): Promise</* TYPESCRIPT: LatexString */string> {
  debug(`Calling MyScript batch API for LaTeX.`);
  const batchRequest = batchRequestFromStrokes(strokes);
  const bodyText = await postRequest(keys, LATEX_MIME_TYPE, batchRequest);
  if (bodyText[0]=='{') {
    try {
      const errorResponse = JSON.parse(bodyText);
      if (isErrorResponse(errorResponse)) { throwRequestError(errorResponse); }
    } catch(err) {
      // REVIEW: Is is possible for valid LaTeX to start with a curly brace?
      // Don't do anything. It could be LaTeX starting with a curly brace.
    }
  }
  const rval = cleanLatex(bodyText);
  debug(`MyScript batch API recognized LaTeX: ${rval}`);
  return rval;
}

// Helper Functions

function batchRequestFromStrokes(strokes: Stroke[]): BatchRequest {
  const rval: BatchRequest = {
    configuration: {
      math: {
        // REVIEW: What does this mimeTypes declaration do?
        mimeTypes: [ 'application/x-latex' ],
        // solver: {
        //   enable: true,
        //   'fractional-part-digits': 3,
        //   'decimal-separator': '.',
        //   'rounding-mode': 'half up',
        //   'angle-unit': 'deg',
        // },
        // margin: {
        //   bottom: 10,
        //   left: 15,
        //   right: 15,
        //   top: 10
        // }
      },
      lang: 'en_US',
      export: {
        'image-resolution': 300,
        jiix: {
          'bounding-box': false,
          strokes: false,
          text: {
            chars: false,
            words: true
          }
        }
      }
    },
    contentType: 'Math',
    strokeGroups: [ { strokes } ],
    xDPI: 96,
    yDPI: 96,
  };
  return rval;
}

function cleanLatex(latexExport: number|LatexData): LatexData {
  // Function from MyScript provided examples.
  // Not sure what is wrong with their LaTeX output, but they feel the need to clean it up.
  // Might be because their output is not compatible with KaTeX or something like that.
  if(typeof latexExport === 'number') {
    latexExport = latexExport.toString();
  }
  if (latexExport.includes('\\\\')) {
    const steps = '\\begin{align*}' + latexExport + '\\end{align*}';
    return steps.replace("\\overrightarrow", "\\vec")
      .replace("\\begin{aligned}", "")
      .replace("\\end{aligned}", "")
      .replace("\\llbracket", "\\lbracket")
      .replace("\\rrbracket", "\\rbracket")
      .replace("\\widehat", "\\hat")
      .replace(new RegExp("(align.{1})", "g"), "aligned");
  }
  return latexExport
    .replace("\\overrightarrow", "\\vec")
    .replace("\\llbracket", "\\lbracket")
    .replace("\\rrbracket", "\\rbracket")
    .replace("\\widehat", "\\hat")
    .replace(new RegExp("(align.{1})", "g"), "aligned");
}

function computeHmac(keys: ServerKeys, body: string): string {
  const hmac = HmacSHA512(body, keys.applicationKey + keys.hmacKey);
  const hex = hmac.toString(Hex);
  return hex;
}

function isErrorResponse(response: Jiix|ErrorResponse): response is ErrorResponse {
  return response.hasOwnProperty('code');
}

async function postRequest(keys: ServerKeys, accept: string, batchRequest: BatchRequest): Promise<string> {
  const body = JSON.stringify(batchRequest);
  const hmac = computeHmac(keys, body);
  const headers = {
    // NOTE: Must have application/json as that is the return type for errors.
    Accept: `${accept},application/json`,
    'Content-Type': "application/json",
    applicationKey: keys.applicationKey,
    hmac,
  }
  const response: Response = await fetch(MYSCRIPT_BATCH_API_URL, { method: 'POST', headers, body });
  return await response.text();
}

function throwRequestError(errorResponse: ErrorResponse): never {
  throw new Error(`MyScript batch API call error: ${errorResponse.code} ${errorResponse.message}`);
}
