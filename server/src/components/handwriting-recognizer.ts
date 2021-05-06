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
import {  JiixMathBlock, postJiixRequest, postMathMlRequest, postSvgRequest, postTextRequest } from "../adapters/myscript";
import { convertJiixExpressionToPresentationMathMlTree } from "../converters/jiix-to-pmml";
import { convertJiixExpressionToContentMathMlTree } from "../converters/jiix-to-cmml";
import { convertPresentationMathMlMarkupToContentMathMlMarkup } from "../converters/pmml-to-cmml";

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

  debug(`Recognizing figure.`);

  // LATER: Get the JIIX version for a "content"-level view of the diagram.
  //        Unfortunately you can't get the JIIX and SVG back in one call, so you have to call twice.
  //        GraphML is another possible high-level format.
  // const jiix = await postJiixRequest<JiixDiagramBlock>('Diagram', strokeData);
  // c-nsole.log(JSON.stringify(jiix, null, 2));

  const svgMarkupRaw = await postSvgRequest(width, height, strokeData);
  // c-nsole.log(`Figure SVG: ${svgMarkupRaw}`);

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
  return { alternatives: [ alternative ] };
}

export async function recognizeFormula(
  width: LengthInPixels,
  height: LengthInPixels,
  strokeData: StrokeData,
): Promise<FormulaRecognitionResults> {
  debug(`Recognizing formula.`);

  const jiix = await postJiixRequest<JiixMathBlock>(width, height, 'Math', strokeData);

  // For development purposes only. Comment out in production.
  if (false) {
    showPresentationMathMlToContentMathMlConversion(width, height, strokeData)
    .catch(err=>{
      console.error("ERROR: Failed to convert Presentation MathML to Content MathML.");
      console.dir(err);
    })
  }

  // TODO: If user writes multiple expressions then we should separate them into distinct cells.
  const alternatives: FormulaRecognitionAlternative[] = [];
  for (const jiixExpression of jiix.expressions) {
    filterJiixExpression(jiixExpression)
    console.log(`JIIX EXPRESSION:\n${JSON.stringify(jiixExpression, null, 2)}`);
    const presentationMathMlTree = convertJiixExpressionToPresentationMathMlTree(jiixExpression);
    console.log(`PRESENTATION MATHML TREE FROM JIIX:\n${JSON.stringify(presentationMathMlTree, null, 2)}`)
    const contentMathMlTree = convertJiixExpressionToContentMathMlTree(jiixExpression);
    console.log(`CONTENT MATHML TREE FROM JIIX:\n${JSON.stringify(contentMathMlTree, null, 2)}`);
      const alternative: FormulaRecognitionAlternative = { presentationMathMlTree, contentMathMlTree };
    alternatives.push(alternative);
  };

  return { alternatives };
}

export async function recognizeText(
  width: LengthInPixels,
  height: LengthInPixels,
  strokeData: StrokeData,
): Promise<TextRecognitionResults> {
  debug(`Recognizing text.`);
  const text = await postTextRequest(width, height, strokeData);
  return { alternatives: [ { text } ] };
}

// Helper Functions

function createThumbnailVersion(width: LengthInPixels, height: LengthInPixels, svgMarkup: SvgMarkup): SvgMarkup {
  const scaleFactor = THUMBNAIL_HEIGHT/height;
  const thumbnailWidth = Math.round(width*scaleFactor);
  return <SvgMarkup>`<svg viewbox="0 0 ${width} ${height}" width="${thumbnailWidth}" height="${THUMBNAIL_HEIGHT}">${svgMarkup}</svg>`;
}

function filterJiixExpression(jiixExpression: MathNode): void {
  // Remove bounding box and item information in-place that are not used in parsing.
  // Used when we console.dir the object to omit the irrelevant parts when
  // generating test cases.
  delete jiixExpression['bounding-box'];
  delete jiixExpression.items;
  const operands = jiixExpression.operands;
  if (operands) {
    for (const operand of operands) {
      filterJiixExpression(operand);
    }
  }
  const rows = jiixExpression.rows;
  if (rows) {
    for (const row of rows) {
      const cells = row.cells;
      for (const cell of cells) {
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
  console.log(`RECOGNIZED MATHML:\n${presentationMathMlMarkup}`);
  const contentMathMlMarkup = await convertPresentationMathMlMarkupToContentMathMlMarkup(presentationMathMlMarkup);
  console.log(`WOLFRAM MATHML CONVERSION:\n${contentMathMlMarkup}`);
}
