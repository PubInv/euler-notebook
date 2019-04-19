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

import { getKatex } from './katex-types.js';

import { $new, Html } from './dom.js';
import { StyleObject } from './math-tablet-api.js';

// Types

type StyleRenderer = (s: StyleObject)=>Html;

interface StyleRendererMap {
  [ styleType: /* StyleType */ string ]: StyleRenderer;
}

// Constants

const STYLE_RENDERERS: StyleRendererMap = {
  'LATEX': renderLatexStyle,
  'MATHJS': renderMathJsStyle,
  'TEXT': renderTextStyle,
};

// Exported Class

export class StyleElement {

  // Class Methods

  static insert($parent: HTMLElement, style: StyleObject): StyleElement {
    var rval = new this(style);
    $parent.appendChild(rval.$elt);
    return rval;
  }

  // Instance Methods

  delete(): void {
    const $parent = this.$elt.parentElement;
    if (!$parent) { throw new Error("Style element has no parent in delete."); }
    $parent.removeChild(this.$elt);
  }

  insertStyle(style: StyleObject): StyleElement {
    return StyleElement.insert(this.$elt, style);
  }

  // PRIVATE

  // Private Constructor

  private constructor(style: StyleObject) {
    const id = `S${style.id}`;
    const classes = ['style' ];
    if (style.source) { classes.push(style.source); }
    // const showButtonHtml: Html = `<button class="showStyle">&#x1F5E8;</button>`;
    let headerHtml: Html = `<div class="header">S-${style.id} ${style.source} ${style.type} ${style.meaning} => ${style.stylableId}</div>`;
    const renderFn = STYLE_RENDERERS[style.type];
    const contentHtml = renderFn && renderFn(style);
    const html = /* ${showButtonHtml} */ `${headerHtml}${contentHtml}`;
    this.$elt = $new<HTMLDivElement>('div', id, classes, html);
  }

  // Private Instance Properties

  private $elt: HTMLDivElement;

}

// Helper Functions

function renderLatexStyle(style: /* TYPESCRIPT: LatexMathStyleObject */ StyleObject): Html {
  // TODO: Catch errors and display.
  const latexHtml = getKatex().renderToString(style.data, { throwOnError: false });
  return `<div>${latexHtml}</div>`
}

function renderMathJsStyle(style: /* TYPESCRIPT: MathJsStyleObject */ StyleObject): Html {
  return `<div><tt>${style.data}</tt></div>`;
}

function renderTextStyle(style: /* TYPESCRIPT: TextStyleObject */ StyleObject): Html {
  if (style.meaning == 'INDENTED') {
    return `<pre>${style.data}</pre>`;
  } else {
    return `<div>${style.data}</div>`;
  }
}
