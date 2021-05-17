/*
Euler Notebook
Copyright (C) 2021 Public Invention
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

// Requirements

import * as debug1 from "debug";
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

import { AbsoluteUrl, DataUrl, Html, JSON_MIME_TYPE, PlainText } from "../shared/common";

import fetch /* ,{ Response }*/ from "node-fetch";
import { TexExpression } from "../shared/formula";
import { PresentationMathMlMarkup } from "../shared/presentation-mathml";

// Types

type ErrorId = 'image_no_content' // LATER: other errors?
type Format = 'text'|'data'|'html'|'latex_styled';
type MathpixMarkdown = '{MathpixMarkdown}';
type RequestId = '{RequestId}';

export interface ApiKeys {
  // This structure lives in ~/.euler-notebook/credentials.json under "mathpix" key.
  app_id: string;
  app_key: string;
}

type DataObject = LatexObject | MathMlObject; // Also asciimath, html, svg, tsv
interface LatexObject {
  type: 'latex';
  value: TexExpression;
}
interface MathMlObject {
  type: 'mathml';
  value: PresentationMathMlMarkup;
}

interface DataOptions {
  include_svg?: boolean;
  include_table_html?: boolean;
  include_latex?: boolean;
  include_tsv?: boolean;
  include_asciimath?: boolean;
  include_mathml?: boolean;
}

interface ErrorInfo {
  id: ErrorId;
  message: PlainText;
}

export interface TextRequest {
  // Incomplete. See https://docs.mathpix.com/#request-parameters
  src: AbsoluteUrl|DataUrl;
  // metadata
  formats?: Format[];
  data_options?: DataOptions;
  include_detected_alphabets?: boolean;
  // alphabets_allowed?:
  confidence_threshold?: number;
  confidence_rate_threshold?: number;
  include_line_data?: boolean;
  include_word_data?: boolean;
  include_smiles?: boolean;
  include_inchi?: boolean;
  include_geometry_data?: boolean;
  auto_rotate_confidence_threshold?: number;
  rm_spaces?: boolean;
  idomatic_eqn_arrays?: boolean;
  numbers_default_to_math?: boolean;
}

export interface TextResponse {
  // Incomplete. See https://docs.mathpix.com/#result-object
  request_id: RequestId;
  text?: MathpixMarkdown;
  latex_styled?: TexExpression;
  confidence?: number;
  confidence_rate?: number;
  // line_data?:
  // word_data?:
  data?: DataObject[];
  html?: Html;
  // detected_alphabets?
  is_printed: boolean;
  is_handwritten: boolean;
  auto_rotate_confidence: number;
  // geometry_data?
  auto_rotate_degrees: number;
  error?: string;
  error_info?: ErrorInfo;
}

// Constants

const MATHPIX_API_TEXT_URL = 'https://api.mathpix.com/v3/text';

// Global Variables

let gApiKeys: ApiKeys;

// Exported Functions

export function initialize(apiKeys: ApiKeys): void {
  gApiKeys = apiKeys;
}

export async function postTextRequest(request: TextRequest): Promise<TextResponse> {
  debug(`Posting request to ${MATHPIX_API_TEXT_URL}.`)
  const body = JSON.stringify(request);
  const headers = {
    'Content-Type': JSON_MIME_TYPE,
    app_id: gApiKeys.app_id,
    app_key: gApiKeys.app_key,
  }
  const response = await fetch(MATHPIX_API_TEXT_URL, { method: 'POST', headers, body });
  const json = await response.text();
  if (!response.ok) {
    const message = `HTTP Error for MathPix: ${response.status} ${response.statusText}`;
    // TODO:
    console.error(message);
    console.dir(json);
    throw new Error(message);
  }
  debug(`Response: ${json}`);
  let rval: TextResponse;
  try {
    rval = JSON.parse(json);
  } catch(err) {
    const message = `MathPix returned invalid JSON.`;
    // TODO:
    console.error(message);
    console.dir(err);
    throw new Error(message);
  }
  return rval;
}

