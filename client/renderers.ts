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
import { LatexData, } from './shared/math-tablet-api.js';
import { StyleType } from './shared/notebook.js';
import { assert } from './common.js';

// Types

export type Renderer = (data: any)=>RenderResult;

export interface RenderResult {
  // REVIEW: This should be a sum type, not a product type.
  html?: Html;
  errorHtml?: Html;
}

// Constants

const RENDERERS = new Map<StyleType, Renderer>([
  [ 'HTML',               htmlRenderer ],
  [ 'TEX-EXPRESSION',     latexRenderer ],
  [ 'MATHML-XML',         /* TODO: */ textRenderer ],
  [ 'PLAIN-TEXT',         textRenderer ],
  [ 'WOLFRAM-EXPRESSION', /* TODO: */ textRenderer ],
]);

// Exported Functions

export function getRenderer(type: StyleType): Renderer {
  const rval = RENDERERS.get(type);
  assert(rval, `Cannot find renderer for type ${type}`);
  return rval!;
}

// Renderers

function htmlRenderer(html: Html): RenderResult {
  // REVIEW: Validate?
  return { html };
}

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
