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

import { isEnabled, postTextRequest, TextRequest } from "../adapters/mathpix";
import { parsePresentationMathMlMarkup } from "../converters/parse-pmml";
import { assert, assertFalse, DataUrl } from "../shared/common";
import { ContentMathMlTree } from "../shared/content-mathml";
import { PresentationMathMlTree } from "../shared/presentation-mathml";

// Types

interface ImageRecognitionAlternative {
  presentationMathMlTree: PresentationMathMlTree;
  contentMathMlTree?: ContentMathMlTree;
}

interface ImageRecognitionResults {
  alternatives: ImageRecognitionAlternative[];
}

// Const

const EMPTY_RECOGNITION_RESULTS: ImageRecognitionResults = {
  alternatives: [],
};

// Exported Functions

export async function recognizeImage(
  dataUrl: DataUrl,
): Promise<ImageRecognitionResults> {
  if (!isEnabled()) { return EMPTY_RECOGNITION_RESULTS; }

  debug("recognizeImage");
  const request: TextRequest = {
    src: dataUrl,
    formats: [ 'text', 'data', 'latex_styled' ],
    data_options: {
      // include_latex: true,
      include_mathml: true,
    },
    numbers_default_to_math: true,
  };
  const response = await postTextRequest(request);

  if (response.error_info) {
    const errorId = response.error_info.id;
    switch(errorId) {
      case 'image_no_content': {
        return EMPTY_RECOGNITION_RESULTS;
      }
      default: assertFalse(`Unexpected MathPix error id '${errorId}'.`)
    }
  }

  const alternatives: ImageRecognitionAlternative[] = [];
  assert(response.data);
  for (const data of response.data!) {
    let alternative: ImageRecognitionAlternative;
    switch(data.type) {
      case 'mathml': {
        const presentationMathMlTree = await parsePresentationMathMlMarkup(data.value);
        alternative = { presentationMathMlTree };
        break;
      }
      default: assertFalse(`Unexpected MathPix data type '${data.type}`);
    }
    alternatives.push(alternative);
  }

  const rval: ImageRecognitionResults = { alternatives };
  return rval;
}
