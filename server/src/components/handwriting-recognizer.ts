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

import { assert, PlainText } from "../shared/common";
import { ContentMathMlTree } from "../shared/content-mathml";
import { LengthInPixels } from "../shared/css";
import { FigureObject } from "../shared/figure";
import { PresentationMathMlTree } from "../shared/presentation-mathml";
import { StrokeData } from "../shared/stylus";
import { SvgMarkup } from "../shared/svg";

import { MathNode } from "../adapters/myscript-math";
import { JiixMathBlock, postJiixRequest, postMathMlRequest, postSvgRequest, postTextRequest } from "../adapters/myscript";
import { convertJiixExpressionToPresentationMathMlTree } from "../converters/jiix-to-pmml";
import { convertJiixExpressionToContentMathMlTree } from "../converters/jiix-to-cmml";
import { convertPresentationMathMlMarkupToContentMathMlMarkup } from "../converters/pmml-to-cmml";
import { logError } from "../error-handler";

// Types

export interface FigureRecognitionAlternative {
  figureObject: FigureObject;
  thumbnailSvgMarkup: SvgMarkup;
}

export interface FigureRecognitionResults {
  alternatives: FigureRecognitionAlternative[];
}

export interface FormulaRecognitionAlternative {
  contentMathMlTree: ContentMathMlTree;
  presentationMathMlTree: PresentationMathMlTree;
}

export interface FormulaRecognitionResults {
  alternatives: FormulaRecognitionAlternative[];
}

export interface TextRecognitionAlternative {
  text: PlainText;
}

export interface TextRecognitionResults {
  alternatives: TextRecognitionAlternative[];
}

// Constants

const SVG_START_TAG_RE = /^<svg[^>]*>\s*/;
const SVG_END_TAG_RE = /\s*<\/svg>\s*$/;
const THUMBNAIL_HEIGHT = <LengthInPixels>32;

// Exported Functions

export async function recognizeFigure(
  width: LengthInPixels,
  height: LengthInPixels,
  strokeData: StrokeData,
): Promise<FigureRecognitionResults> {

  const alternatives: FigureRecognitionAlternative[] = [];
  if (strokeData.strokes.length == 0) {
    debug("Recognizing empty figure.");
    return { alternatives };
  }

  debug(`Recognizing figure.`);
  const svgMarkupRaw = await postSvgRequest(width, height, strokeData);
  // c-nsole.log(`Figure SVG: ${svgMarkupRaw}`);
  // LATER: Get the JIIX version instead for a "content"-level view of the diagram.
  //        Unfortunately you can't get the JIIX and SVG back in one call, so you have to call twice.
  //        GraphML is another possible high-level format.
  // const jiix = await postJiixRequest<JiixDiagramBlock>('Diagram', strokeData);
  // debug(`JIIX response: ${JSON.stringify(jiix)}`);

  try {
    // HACK ALERT: This is fragile matching regular expressions.
    //             But not as heavyweight as parsing XML...
    const matchStart = SVG_START_TAG_RE.exec(svgMarkupRaw)!;
    assert(matchStart);
    const startIndex = matchStart[0].length;
    const matchEnd = SVG_END_TAG_RE.exec(svgMarkupRaw)!;
    assert(matchEnd);
    const endIndex = -matchEnd[0].length;
    const svgInnerMarkup = <SvgMarkup>svgMarkupRaw.slice(startIndex, endIndex);
    // Don't know why, by MyScript appears to scale the coordinate system of Diagram SVGs down by 4.
    const svgMarkup = <SvgMarkup>`<g transform="scale(4 4)">${svgInnerMarkup}</g>`;

    const thumbnailSvgMarkup = createThumbnailVersion(width, height, svgMarkup);
    const alternative: FigureRecognitionAlternative = {
      figureObject: {
        // content: jiix.elements,
        presentation: svgMarkup,
      },
      thumbnailSvgMarkup,
    };
    alternatives.push(alternative);
  } catch(err) {
    logError(err, "Error processing recognized figure.", { svgMarkupRaw });
  }
  return { alternatives };
}

export async function recognizeFormula(
  width: LengthInPixels,
  height: LengthInPixels,
  strokeData: StrokeData,
): Promise<FormulaRecognitionResults> {

  const alternatives: FormulaRecognitionAlternative[] = [];
  if (strokeData.strokes.length == 0) {
    debug("Recognizing empty formula.");
    return { alternatives };
  }

  debug(`Recognizing formula.`);
  const jiix = await postJiixRequest<JiixMathBlock>(width, height, 'Math', strokeData);

  try {
    // TODO: If user writes multiple expressions then we should separate them into distinct cells.
    for (const jiixExpression of jiix.expressions) {
      filterJiixExpression(jiixExpression)
      debug(`JIIX expression: ${JSON.stringify(jiixExpression)}`);
      const presentationMathMlTree = convertJiixExpressionToPresentationMathMlTree(jiixExpression);
      debug(`pMathML tree: ${JSON.stringify(presentationMathMlTree)}`)
      const contentMathMlTree = convertJiixExpressionToContentMathMlTree(jiixExpression);
      debug(`cMathML tree: ${JSON.stringify(contentMathMlTree)}`);
      const alternative: FormulaRecognitionAlternative = { presentationMathMlTree, contentMathMlTree };
      alternatives.push(alternative);
    };
  } catch (err) {
    logError(err, "Error processing recognized formula.", { jiix });
  }

  // For development purposes only.
  // Used to compare our conversions to ones by MyScript (JIIX->pMathML)
  // and Wolfram (pMathML->cMathML).
  // Because this doubles the number of calls to MyScript,
  // it should not be enabled unless actively debugging our conversion code.
  if (false) {
    showPresentationMathMlToContentMathMlConversion(width, height, strokeData)
    .catch(err=>{ logError(err, "Failed to convert Presentation MathML to Content MathML."); })
  }

  return { alternatives };
}

export async function recognizeText(
  width: LengthInPixels,
  height: LengthInPixels,
  strokeData: StrokeData,
): Promise<TextRecognitionResults> {

  const alternatives: TextRecognitionAlternative[] = [];
  if (strokeData.strokes.length == 0) {
    debug("Recognizing empty text.");
    return { alternatives };
  }

  debug(`Recognizing text.`);
  const text = await postTextRequest(width, height, strokeData);
  // LATER: Get JIIX instead so we can offer word alternatives, etc.

  try {
    const alternative: TextRecognitionAlternative = { text };
    alternatives.push(alternative);
  } catch(err) {
    logError(err, "Error processing recognized text.", { text });
  }
  return { alternatives };
}

// Helper Functions

function createThumbnailVersion(width: LengthInPixels, height: LengthInPixels, svgMarkup: SvgMarkup): SvgMarkup {
  const scaleFactor = THUMBNAIL_HEIGHT/height;
  const thumbnailWidth = Math.round(width*scaleFactor);
  return <SvgMarkup>`<svg viewbox="0 0 ${width} ${height}" width="${thumbnailWidth}" height="${THUMBNAIL_HEIGHT}">${svgMarkup}</svg>`;
}

function filterJiixExpression(jiixExpression: MathNode): void {
  // Remove volumnious bounding box and item information that are not used in parsing.
  // Useful, for example, when displaying for diagnostic purposes.
  // Removal happens in-place.
  delete jiixExpression['bounding-box'];
  delete jiixExpression.items;
  if (jiixExpression.operands) {
    for (const operand of jiixExpression.operands) {
      filterJiixExpression(operand);
    }
  }
  if (jiixExpression.rows) {
    for (const row of jiixExpression.rows) {
      for (const cell of row.cells) {
        filterJiixExpression(cell);
      }
    }
  }
}

async function showPresentationMathMlToContentMathMlConversion(
  // For development purposes only. Comment out in production.
  width: LengthInPixels,
  height: LengthInPixels,
  strokeData: StrokeData,
): Promise<void> {
  const presentationMathMlMarkup = await postMathMlRequest(width, height, strokeData);
  debug(`pMathML from MyScript:\n${presentationMathMlMarkup}`);
  const contentMathMlMarkup = await convertPresentationMathMlMarkupToContentMathMlMarkup(presentationMathMlMarkup);
  debug(`cMathML from Wolfram:\n${contentMathMlMarkup}`);
}
