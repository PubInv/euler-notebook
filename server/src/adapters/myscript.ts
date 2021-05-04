/*
Euler Notebook
Copyright (C) 2019-21 Public Invention
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

// TODO: Prevent multiple calls to MyScript at the same time. "serialze" flag on rule?

// NOTE: This is not a complete set of types for the library.
//       Just the stuff that we have used.
// NOTE: Optionality is not always correct.
// REVIEW: Should the be a .d.ts declaration file instead?

// Requirements

import * as debug1 from "debug";
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// REVIEW: Can we convert this to import notation?
const Hex = require('crypto-js/enc-hex');
const HmacSHA512 = require('crypto-js/hmac-sha512');
import fetch, { Response } from "node-fetch";
import { logErrorMessage } from "../error-handler";

import { assert, BoundingBox, PlainText } from "../shared/common";
import { SvgMarkup } from "../shared/svg";
import { LengthInPixels } from "../shared/css";
import { PresentationMathMlMarkup } from "../shared/presentation-mathml";
import { StrokeGroup, DiagramItemBlock } from "../shared/myscript-types";
import { StrokeData } from "../shared/stylus";

import { MathNode } from "./myscript-math";


// Types

// See:
//  * https://developer.myscript.com/docs/interactive-ink/1.4/web/rest/architecture/
//  * https://developer.myscript.com/docs/interactive-ink/1.4/web/reference/configuration-rest/
//  * https://swaggerui.myscript.com

type ContentType = 'Text'|'Math'|'Diagram'|'Raw Content'|'Text Document';
type MimeType = 'application/mathml+xml' | 'application/vnd.myscript.jiix' | 'application/x-latex' | 'image/svg+xml' | 'text/plain';

export interface ApiKeys {
  // This structure lives in ~/.euler-notebook/credentials.json under "myscript" key.
  applicationKey: string;
  hmacKey: string;
}

interface BatchRequest {
  configuration?: Configuration;
  contentType: ContentType;
  conversionState?: 'DIGITAL_EDIT';
  height?: number;
  strokeGroups: StrokeGroup[];
  theme?: string;
  width?: number;
  xDPI?: number;
  yDPI?: number;
}

interface Configuration {
  math: MathConfiguration;
  lang: /* TYPESCRIPT: Locale */string;
  export: ExportConfiguration;
}

// interface ErrorResponse {
//   code: string;
//   message: string;
// }

interface ExportConfiguration {
  'image-resolution'?: number;
  image?: ImageConfiguration;
  jiix: JiixConfiguration;
}

interface ImageConfiguration {
  guides?: boolean;
  viewport: BoundingBox;
}

interface JiixBlockBase {
  id: string;
  'bounding-box'?: BoundingBox;
  version: '2';
}

export interface JiixDiagramBlock extends JiixBlockBase {
  // See https://developer.myscript.com/docs/interactive-ink/1.4/reference/jiix/
  type: 'Diagram';
  elements: DiagramItemBlock[];
}

export interface JiixMathBlock extends JiixBlockBase {
  // See https://developer.myscript.com/docs/interactive-ink/1.4/reference/jiix/
  type: 'Math';
  expressions: MathNode[];
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

interface SolverConfiguration {
  enable: boolean;
  'fractional-part-digits': number;
  'decimal-separator': ".";
  'rounding-mode': 'half up';
  'angle-unit': 'deg';
}

// Constants

const MYSCRIPT_BATCH_API_URL = 'https://webdemoapi.myscript.com/api/v4.0/iink/batch';

const JIIX_MIME_TYPE = 'application/vnd.myscript.jiix';
// const LATEX_MIME_TYPE = 'application/x-latex';
const MATHML_MIME_TYPE = 'application/mathml+xml'; // application/mathml-presentation+xml';
const PLAINTEXT_MIME_TYPE = 'text/plain';
const SVG_MIME_TYPE = 'image/svg+xml';

const MATHML_PREFIX = "<math";
const SVG_PREFIX = "<svg";


// Global Variables

let gApiKeys: ApiKeys;

// Exported Functions

export function initialize(apiKeys: ApiKeys): void {
  gApiKeys = apiKeys;
}

export async function postJiixRequest<T extends JiixBlockBase>(
  width: LengthInPixels,
  height: LengthInPixels,
  contentType: ContentType,
  strokeData: StrokeData,
): Promise<T> {
  debug(`Calling MyScript batch API for JIIX ${contentType}.`);
  // REVIEW: What to return if there aren't any strokes at all (e.g. user erased last stroke)?
  const strokeGroups: StrokeGroup[] = [{ strokes: strokeData.strokes }];
  const batchRequest = batchRequestFromStrokes(width, height, strokeGroups, contentType, JIIX_MIME_TYPE);
  const bodyText = await postRequest(gApiKeys, JIIX_MIME_TYPE, batchRequest);
  const jiix = <T>JSON.parse(bodyText);
  assert(jiix.version == '2');
  return jiix;
}

// export async function postLatexRequest(strokeData: StrokeData): Promise<TexExpression> {

//   // If there aren't any strokes yet, return an empty TeX expression.
//   if (strokeData.strokes.length == 0) {
//     return EMPTY_TEX_EXPRESSION;
//   }

//   debug(`Calling MyScript batch API for LaTeX.`);
//   const strokeGroups: StrokeGroup[] = [{ strokes: strokeData.strokes }];
//   const batchRequest = batchRequestFromStrokes(strokeGroups, 'Math', LATEX_MIME_TYPE);
//   const bodyText = await postRequest(gApiKeys, LATEX_MIME_TYPE, batchRequest);
//   const rval = cleanLatex(<TexExpression>bodyText);
//   debug(`MyScript batch API recognized LaTeX: ${rval}`);
//   return rval;
// }

export async function postMmlRequest(
  width: LengthInPixels,
  height: LengthInPixels,
  strokeData: StrokeData,
): Promise<PresentationMathMlMarkup> {
  debug(`Calling MyScript batch API for MathML.`);
  const strokeGroups: StrokeGroup[] = [{ strokes: strokeData.strokes }];
  const batchRequest = batchRequestFromStrokes(width, height, strokeGroups, 'Math', MATHML_MIME_TYPE);
  const mmlRaw = await postRequest(gApiKeys, MATHML_MIME_TYPE, batchRequest);
  const mml = <PresentationMathMlMarkup>mmlRaw.trim();
  assert(mml.startsWith(MATHML_PREFIX));
  return mml;
}

export async function postSvgRequest(
  width: LengthInPixels,
  height: LengthInPixels,
  strokeData: StrokeData,
): Promise<SvgMarkup> {
  debug(`Calling MyScript batch API for SVG.`);
  const strokeGroups: StrokeGroup[] = [{ strokes: strokeData.strokes }];
  const batchRequest = batchRequestFromStrokes(width, height, strokeGroups, 'Diagram', SVG_MIME_TYPE);
  const svgRaw = await postRequest(gApiKeys, SVG_MIME_TYPE, batchRequest);
  const svg = <SvgMarkup>svgRaw.trim();
  assert(svg.startsWith(SVG_PREFIX));
  return svg;
}

export async function postTextRequest(
  width: LengthInPixels,
  height: LengthInPixels,
  strokeData: StrokeData,
): Promise<PlainText> {

  // If there aren't any strokes yet, return an empty TeX expression.
  if (strokeData.strokes.length == 0) {
    return <PlainText>'';
  }

  debug(`Calling MyScript batch API for Text.`);
  const strokeGroups: StrokeGroup[] = [{ strokes: strokeData.strokes }];
  const batchRequest = batchRequestFromStrokes(width, height, strokeGroups, 'Text', PLAINTEXT_MIME_TYPE);

  const rval = await postRequest(gApiKeys, PLAINTEXT_MIME_TYPE, batchRequest);
  debug(`MyScript batch API recognized plain text: ${rval}`);
  return <PlainText>rval;
}

// Helper Functions

function batchRequestFromStrokes(
  width: LengthInPixels,
  height: LengthInPixels,
  strokeGroups: StrokeGroup[],
  contentType: ContentType,
  mimeType: MimeType
): BatchRequest {
  const rval: BatchRequest = {
    configuration: {
      export: {
        // 'image-resolution': 300,
        // image: {
        //   viewport: {
        //     x: 0, y: 0, width, height
        //   }
        // },
        jiix: {
          'bounding-box': true,
          strokes: false,
          text: {
            chars: false,
            words: true
          }
        }
      },
      lang: 'en_US',
      math: {
        mimeTypes: [ mimeType ],
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
    },
    contentType,
    conversionState: 'DIGITAL_EDIT',
    height,
    strokeGroups,
    width,
    xDPI: 96,
    yDPI: 96,
  };
  return rval;
}

// function cleanLatex(latexExport: number|TexExpression): TexExpression {
//   // Function from MyScript provided examples.
//   // Not sure what is wrong with their LaTeX output, but they feel the need to clean it up.
//   // Might be because their output is not compatible with KaTeX or something like that.
//   if (typeof latexExport === 'number') {
//     latexExport = <TexExpression>latexExport.toString();
//   }
//   if (latexExport.includes('\\\\')) {
//     const steps = '\\begin{align*}' + latexExport + '\\end{align*}';
//     return <TexExpression>steps.replace("\\overrightarrow", "\\vec")
//       .replace("\\begin{aligned}", "")
//       .replace("\\end{aligned}", "")
//       .replace("\\llbracket", "\\lbracket")
//       .replace("\\rrbracket", "\\rbracket")
//       .replace("\\widehat", "\\hat")
//       .replace(new RegExp("(align.{1})", "g"), "aligned");
//   }
//   return <TexExpression>latexExport
//     .replace("\\overrightarrow", "\\vec")
//     .replace("\\llbracket", "\\lbracket")
//     .replace("\\rrbracket", "\\rbracket")
//     .replace("\\widehat", "\\hat")
//     .replace(new RegExp("(align.{1})", "g"), "aligned");
// }

function computeHmac(keys: ApiKeys, body: string): string {
  const hmac = HmacSHA512(body, keys.applicationKey + keys.hmacKey);
  const hex = hmac.toString(Hex);
  return hex;
}

async function postRequest<T extends string>(keys: ApiKeys, mimeType: MimeType, batchRequest: BatchRequest): Promise<T> {
  // c-nsole.log(`MyScript Request:\n${JSON.stringify({ ...batchRequest, strokeGroups: null }, null, 2)}`);
  const body = JSON.stringify(batchRequest);
  const hmac = computeHmac(keys, body);
  const headers = {
    // NOTE: application/json is the return type for errors.
    Accept: `${mimeType},application/json`,
    'Content-Type': "application/json",
    applicationKey: keys.applicationKey,
    hmac,
  }
  let response: Response;
  // try {
    response = await fetch(MYSCRIPT_BATCH_API_URL, { method: 'POST', headers, body });
  // } catch(err) {
  //   // REVIEW: Should we catch errors here to look for common connectivity issues?
  //   throw new Error();
  // }
  const text = await response.text();
  if (!response.ok) {
    logErrorMessage(`MyScript REST Error: ${text}`);
    throw new Error(`HTTP Error for MyScript: ${response.status} ${response.statusText}`);
  }
  return <T>text;
}
