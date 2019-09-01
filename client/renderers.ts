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

// Requirements

import { escapeHtml, Html } from './dom.js';
import { getKatex } from './katex-types.js';
import { LatexData, } from './math-tablet-api.js';
import { StyleType } from './notebook.js';

// Types

export type Renderer = (data: any)=>RenderResult;

export interface RenderResult {
  html?: Html;
  errorHtml?: Html;
}

// Constants

//
export const rendererMap = new Map<StyleType, Renderer>([
  // [ 'HTML', ],
  // [ 'IMAGE', ],
  // [ 'JIIX',  ],
  [ 'LATEX', latexRenderer ],
  // [ 'CLASSIFICATION',    // DEPRECATED: A classifcication of the style.
  [ 'MATHJS', /* TODO: */ textRenderer  ],
  [ 'MATHML', /* TODO: */ textRenderer ],
  // [ 'STROKE', ],
  // [ 'SYMBOL', ],
  // [ 'SOLUTION', ],
  // [ 'EQUATION',  ],
  [ 'TEXT', textRenderer ],
  // [ 'TOOL',  ],
  [ 'WOLFRAM', /* TODO: */ textRenderer ],
]);

// Renderers

// function htmlRenderer(html: Html): RenderResult {
//   // LATER: Validate HTML?
//   return { html };
// }

function latexRenderer(latexData: LatexData): RenderResult {
  try {
    return { html: getKatex().renderToString(latexData, {}) };
  } catch(err) {
    return { errorHtml: escapeHtml(err.message) };
  }
}

function textRenderer(text: string): RenderResult {
  return { html: escapeHtml(text) };
}
